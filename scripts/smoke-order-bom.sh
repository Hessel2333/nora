#!/usr/bin/env bash
set -euo pipefail

api_base="${NORA_API_BASE_URL:-http://localhost:3100/api/v1}"
approved_order_id="50000000-0000-4000-8000-000000000001"

health="$(curl -fsS "${api_base}/health")"
orders="$(curl -fsS "${api_base}/orders?pageSize=5")"
boms="$(curl -fsS "${api_base}/boms")"
requirements="$(curl -fsS "${api_base}/orders/${approved_order_id}/material-requirements")"
demand="$(curl -fsS "${api_base}/orders/${approved_order_id}/production-demand")"
readiness="$(curl -fsS "${api_base}/orders/${approved_order_id}/production-readiness")"

jq -e '.status == "ok" and .database == "connected"' <<<"${health}" >/dev/null
jq -e '.total >= 3 and (.data | length) >= 3' <<<"${orders}" >/dev/null
jq -e '.total >= 4 and (.data | length) >= 4' <<<"${boms}" >/dev/null
jq -e '(.items | length) > 0 and (.missingBoms | length) == 0 and .totalEstimatedCost > 0' <<<"${requirements}" >/dev/null
jq -e '.code | startswith("PD")' <<<"${demand}" >/dev/null
jq -e '.status == "pending_planning" and .lineCount > 0 and .missingBomCount == 0' <<<"${demand}" >/dev/null
jq -e '.ready == true and .readyLineCount > 0 and .missingBomCount == 0' <<<"${readiness}" >/dev/null

echo "Nora 订单/BOM smoke test passed."
