#!/usr/bin/env bash
set -euo pipefail

api_base="${NORA_API_BASE_URL:-http://localhost:3100/api/v1}"

health="$(curl -fsS "${api_base}/health")"
customers="$(curl -fsS "${api_base}/catalog/customers")"
products="$(curl -fsS "${api_base}/catalog/products")"
boms="$(curl -fsS "${api_base}/boms")"

customer_id="$(jq -er 'first(.[] | select(.status == "active")) | .id' <<<"${customers}")"
product_id="$(jq -er '.[] | select(.code == "CP0001") | .id' <<<"${products}")"
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
jq -e --arg a "${status_a}" --arg b "${status_b}" '([$a, $b] | sort) == ["201", "409"]' <<<"{}" >/dev/null
jq -e --arg versionA "${version_a}" --arg versionB "${version_b}" '
  [.versions[] | select(.version == $versionA or .version == $versionB) | .validityState] |
  (map(select(. == "scheduled")) | length) == 1
' <<<"${timeline}" >/dev/null
jq -e '
  (.versions | any(.validityState == "current" and .effectiveTo != null and (.events | any(.type == "superseded")))) and
  (.versions | any(.validityState == "scheduled" and (.events | any(.type == "published"))))
' <<<"${timeline}" >/dev/null

echo "Nora 订单/BOM 时态与并发 smoke test passed."
