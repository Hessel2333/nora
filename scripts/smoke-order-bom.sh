#!/usr/bin/env bash
set -euo pipefail

api_base="${NORA_API_BASE_URL:-http://localhost:3100/api/v1}"

health="$(curl -fsS "${api_base}/health")"
customers="$(curl -fsS "${api_base}/catalog/customers")"
products="$(curl -fsS "${api_base}/catalog/products")"
boms="$(curl -fsS "${api_base}/boms")"
inventory_locations="$(curl -fsS "${api_base}/inventory/locations")"

customer_id="$(jq -er 'first(.[] | select(.status == "active")) | .id' <<<"${customers}")"
product_id="$(jq -er '.[] | select(.code == "CP0001") | .id' <<<"${products}")"
inventory_product_id="$(jq -er '.[] | select(.code == "RM01234") | .id' <<<"${products}")"
inventory_location_id="$(jq -er '.data[] | select(.code == "RAW-COLD-01") | .id' <<<"${inventory_locations}")"
delivery_at="$(node -e 'console.log(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())')"
payload="$(jq -n \
  --arg customerId "${customer_id}" \
  --arg deliveryAt "${delivery_at}" \
  --arg productId "${product_id}" \
  '{customerId: $customerId, deliveryAt: $deliveryAt, source: "手工录入", status: "pending", notes: "CI smoke test", lines: [{productId: $productId, quantity: 10}]}')"

created="$(curl -fsS -X POST "${api_base}/orders" -H 'content-type: application/json' -d "${payload}")"
order_id="$(jq -er '.id' <<<"${created}")"
approved="$(curl -fsS -X POST "${api_base}/orders/${order_id}/approve" -H 'content-type: application/json' -d '{"actor":"Smoke test"}')"
approved_again="$(curl -fsS -X POST "${api_base}/orders/${order_id}/approve" -H 'content-type: application/json' -d '{"actor":"Smoke test retry"}')"
requirements="$(curl -fsS "${api_base}/orders/${order_id}/material-requirements")"
demand="$(curl -fsS "${api_base}/orders/${order_id}/production-demand")"
readiness="$(curl -fsS "${api_base}/orders/${order_id}/production-readiness")"

demand_line_id="$(jq -er '.lines[0].id' <<<"${demand}")"
demand_quantity="$(jq -er '.lines[0].requiredQuantity' <<<"${demand}")"
batch_payload="$(jq -n \
  --arg scheduledFor "${delivery_at}" \
  --arg productionDemandLineId "${demand_line_id}" \
  --arg quantity "${demand_quantity}" \
  '{scheduledFor: $scheduledFor, actor: "Smoke test", allocations: [{productionDemandLineId: $productionDemandLineId, quantity: $quantity}]}')"
batch_created="$(curl -fsS -X POST "${api_base}/production-batches" -H 'content-type: application/json' -H "Idempotency-Key: smoke-batch-${order_id}" -d "${batch_payload}")"
batch_id="$(jq -er '.id' <<<"${batch_created}")"
batch_confirmed="$(curl -fsS -X POST "${api_base}/production-batches/${batch_id}/confirm" -H 'content-type: application/json' -H "Idempotency-Key: smoke-confirm-${order_id}" -d '{"revision":1,"actor":"Smoke test"}')"
batch_released="$(curl -fsS -X POST "${api_base}/production-batches/${batch_id}/release" -H 'content-type: application/json' -H "Idempotency-Key: smoke-release-${order_id}" -d '{"revision":2,"actor":"Smoke test"}')"
work_orders="$(curl -fsS "${api_base}/work-orders")"
work_order_id="$(jq -er --arg batchId "${batch_id}" '.data[] | select(.productionBatchId == $batchId) | .id' <<<"${work_orders}")"
work_order_base="${api_base}/work-orders/${work_order_id}"
work_order_context='{"revision":1,"workstationCode":"Smoke 工位","deviceId":"SMOKE-DEVICE","actor":"Smoke test"}'
work_order_started="$(curl -fsS -X POST "${work_order_base}/start" -H 'content-type: application/json' -H "Idempotency-Key: smoke-wo-start-${order_id}" -d "${work_order_context}")"
work_order_started_retry="$(curl -fsS -X POST "${work_order_base}/start" -H 'content-type: application/json' -H "Idempotency-Key: smoke-wo-start-${order_id}" -d "${work_order_context}")"
work_order_paused="$(curl -fsS -X POST "${work_order_base}/pause" -H 'content-type: application/json' -H "Idempotency-Key: smoke-wo-pause-${order_id}" -d '{"revision":2,"workstationCode":"Smoke 工位","deviceId":"SMOKE-DEVICE","actor":"Smoke test","reason":"Smoke 暂停验证"}')"
work_order_resumed="$(curl -fsS -X POST "${work_order_base}/resume" -H 'content-type: application/json' -H "Idempotency-Key: smoke-wo-resume-${order_id}" -d '{"revision":3,"workstationCode":"Smoke 工位","deviceId":"SMOKE-DEVICE","actor":"Smoke test"}')"
work_order_exception="$(curl -fsS -X POST "${work_order_base}/report-exception" -H 'content-type: application/json' -H "Idempotency-Key: smoke-wo-exception-${order_id}" -d '{"revision":4,"workstationCode":"Smoke 工位","deviceId":"SMOKE-DEVICE","actor":"Smoke test","reason":"Smoke 异常验证"}')"
work_order_recovered="$(curl -fsS -X POST "${work_order_base}/recover" -H 'content-type: application/json' -H "Idempotency-Key: smoke-wo-recover-${order_id}" -d '{"revision":5,"workstationCode":"Smoke 工位","deviceId":"SMOKE-DEVICE","actor":"Smoke test","reason":"Smoke 恢复验证","targetStatus":"pending"}')"
production_batches_after_execution="$(curl -fsS "${api_base}/production-batches")"

opening_payload="$(jq -n \
  --arg locationId "${inventory_location_id}" \
  --arg productId "${inventory_product_id}" \
  '{locationId: $locationId, productId: $productId, lotCode: "SMOKE-OPENING-BASE", quantity: "5.000", unit: "kg", qualityStatus: "released", receivedAt: "2026-08-20T01:00:00.000Z", expiresAt: "2027-08-20T01:00:00.000Z", note: "CI smoke opening balance", actor: "Smoke test"}')"
opening_balance="$(curl -fsS -X POST "${api_base}/inventory/opening-balances" -H 'content-type: application/json' -H 'Idempotency-Key: smoke-inventory-opening-base' -d "${opening_payload}")"
opening_balance_retry="$(curl -fsS -X POST "${api_base}/inventory/opening-balances" -H 'content-type: application/json' -H 'Idempotency-Key: smoke-inventory-opening-base' -d "${opening_payload}")"
inventory_stock="$(curl -fsS "${api_base}/inventory/stock")"

bom_id="$(jq -er '.data[0].id' <<<"${boms}")"
source_version_id="$(jq -er '.data[0].versionId' <<<"${boms}")"
smoke_suffix="$(date +%s)"
version_a="SMK-${smoke_suffix}-A"
version_b="SMK-${smoke_suffix}-B"
copy_a_payload="$(jq -n --arg version "${version_a}" --arg sourceVersionId "${source_version_id}" '{version: $version, sourceVersionId: $sourceVersionId}')"
copy_b_payload="$(jq -n --arg version "${version_b}" --arg sourceVersionId "${source_version_id}" '{version: $version, sourceVersionId: $sourceVersionId}')"
draft_a="$(curl -fsS -X POST "${api_base}/boms/${bom_id}/versions" -H 'content-type: application/json' -d "${copy_a_payload}")"
draft_b="$(curl -fsS -X POST "${api_base}/boms/${bom_id}/versions" -H 'content-type: application/json' -d "${copy_b_payload}")"
draft_a_id="$(jq -er '.versionId' <<<"${draft_a}")"
draft_b_id="$(jq -er '.versionId' <<<"${draft_b}")"

draft_a_revision="$(jq -er '.revision' <<<"${draft_a}")"
draft_b_revision="$(jq -er '.revision' <<<"${draft_b}")"
future_effective_at="$(node -e 'console.log(new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString())')"
publish_a_payload="$(jq -n --argjson revision "${draft_a_revision}" --arg effectiveAt "${future_effective_at}" '{revision: $revision, effectiveAt: $effectiveAt}')"
publish_b_payload="$(jq -n --argjson revision "${draft_b_revision}" --arg effectiveAt "${future_effective_at}" '{revision: $revision, effectiveAt: $effectiveAt}')"
smoke_tmp="$(mktemp -d)"
trap 'rm -rf "${smoke_tmp}"' EXIT

curl -sS -o "${smoke_tmp}/publish-a.json" -w '%{http_code}' -X POST \
  "${api_base}/boms/versions/${draft_a_id}/publish" \
  -H 'content-type: application/json' -d "${publish_a_payload}" >"${smoke_tmp}/publish-a.status" &
pid_a=$!
curl -sS -o "${smoke_tmp}/publish-b.json" -w '%{http_code}' -X POST \
  "${api_base}/boms/versions/${draft_b_id}/publish" \
  -H 'content-type: application/json' -d "${publish_b_payload}" >"${smoke_tmp}/publish-b.status" &
pid_b=$!
wait "${pid_a}"
wait "${pid_b}"

status_a="$(cat "${smoke_tmp}/publish-a.status")"
status_b="$(cat "${smoke_tmp}/publish-b.status")"
timeline="$(curl -fsS "${api_base}/boms/${bom_id}")"

jq -e '.status == "ok" and .database == "connected"' <<<"${health}" >/dev/null
jq -e '.id == $id and .status == "approved"' --arg id "${order_id}" <<<"${approved}" >/dev/null
jq -e '.id == $id and .status == "approved"' --arg id "${order_id}" <<<"${approved_again}" >/dev/null
jq -e '.total >= 4 and (.data | length) >= 4' <<<"${boms}" >/dev/null
jq -e '.basis == "approval_recipe_snapshot" and (.items | length) > 0 and (.missingBoms | length) == 0 and .totalEstimatedCost > 0' <<<"${requirements}" >/dev/null
jq -e '.code | startswith("PD")' <<<"${demand}" >/dev/null
jq -e '
  .status == "pending_planning" and
  .lineCount > 0 and
  .missingBomCount == 0 and
  (.lines | all(
    .snapshotComplete == true and
    .snapshotSchemaVersion == 2 and
    .processStepCount > 0
  ))
' <<<"${demand}" >/dev/null
jq -e '.ready == true and .readyLineCount > 0 and .missingBomCount == 0' <<<"${readiness}" >/dev/null
jq -e '.status == "confirmed" and .revision == 2' <<<"${batch_confirmed}" >/dev/null
jq -e '.status == "released" and .revision == 3' <<<"${batch_released}" >/dev/null
jq -e '.status == "running" and .revision == 2 and (.events | length) == 2' <<<"${work_order_started}" >/dev/null
jq -e '.status == "running" and .revision == 2 and (.events | length) == 2' <<<"${work_order_started_retry}" >/dev/null
jq -e '.status == "paused" and .revision == 3 and .events[0].reason == "Smoke 暂停验证"' <<<"${work_order_paused}" >/dev/null
jq -e '.status == "running" and .revision == 4' <<<"${work_order_resumed}" >/dev/null
jq -e '.status == "exception" and .revision == 5 and .events[0].reason == "Smoke 异常验证"' <<<"${work_order_exception}" >/dev/null
jq -e '.status == "pending" and .revision == 6 and (.events | length) == 6' <<<"${work_order_recovered}" >/dev/null
jq -e --arg batchId "${batch_id}" '.data | any(.id == $batchId and .status == "released" and .revision == 8)' <<<"${production_batches_after_execution}" >/dev/null
jq -e '.transaction.type == "opening_balance" and .balance.onHandQuantity == "5.000" and .balance.availableQuantity == "5.000"' <<<"${opening_balance}" >/dev/null
jq -e --arg id "$(jq -r '.transaction.id' <<<"${opening_balance}")" '.transaction.id == $id and .balance.onHandQuantity == "5.000"' <<<"${opening_balance_retry}" >/dev/null
jq -e '.data | any(.lot.code == "SMOKE-OPENING-BASE" and .onHandQuantity == "5.000")' <<<"${inventory_stock}" >/dev/null
jq -e --arg a "${status_a}" --arg b "${status_b}" '([$a, $b] | sort) == ["201", "409"]' <<<"{}" >/dev/null
jq -e --arg versionA "${version_a}" --arg versionB "${version_b}" '
  [.versions[] | select(.version == $versionA or .version == $versionB) | .validityState] |
  (map(select(. == "scheduled")) | length) == 1
' <<<"${timeline}" >/dev/null
jq -e '
  (.versions | any(.validityState == "current" and .effectiveTo != null and (.events | any(.type == "superseded")))) and
  (.versions | any(.validityState == "scheduled" and (.events | any(.type == "published"))))
' <<<"${timeline}" >/dev/null

echo "Nora 订单/BOM、生产工单状态、批次库存与幂等 smoke test passed."
