const oidcBase = process.env.NORA_LOCAL_KEYCLOAK_URL ?? "http://localhost:18080";
const apiBase = process.env.NORA_IDENTITY_VERIFY_API_URL ?? "http://localhost:3100/api/v1";
const password = process.env.NORA_LOCAL_KEYCLOAK_PASSWORD ?? "nora-local-only";
const tokenUrl = `${oidcBase}/realms/nora/protocol/openid-connect/token`;
const testId = "00000000-0000-4000-8000-000000000099";

const identities = [
  { username: "sales", role: "nora_sales_operator", permissions: ["orders:write"], probe: ["/orders", "POST"] },
  { username: "reviewer", role: "nora_order_approver", permissions: ["orders:approve"], probe: [`/orders/${testId}/approve`, "POST"] },
  { username: "recipe", role: "nora_recipe_manager", permissions: ["recipes:write"], probe: ["/boms", "POST"] },
  { username: "planner", role: "nora_planner", permissions: ["planning:write"], probe: ["/production-batches", "POST"] },
  { username: "warehouse", role: "nora_inventory_operator", permissions: ["inventory:write"], probe: ["/inventory/opening-balances", "POST"] },
  { username: "operator", role: "nora_production_operator", permissions: ["execution:operate"], probe: [`/work-orders/${testId}/start`, "POST"] },
  { username: "supervisor", role: "nora_production_supervisor", permissions: ["execution:operate", "execution:supervise"], probe: [`/work-orders/${testId}/recover`, "POST"] },
  { username: "quality", role: "nora_quality_inspector", permissions: ["quality:inspect"], probe: [`/work-orders/${testId}/outputs/${testId}/inspect`, "POST"] },
  {
    username: "admin",
    role: "nora_admin",
    permissions: [
      "orders:write",
      "orders:approve",
      "recipes:write",
      "planning:write",
      "inventory:write",
      "execution:operate",
      "execution:supervise",
      "quality:inspect"
    ],
    probe: ["/boms", "POST"]
  }
];

async function tokenFor(username) {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "nora-web",
      username,
      password
    })
  });
  if (!response.ok) throw new Error(`${username}: token endpoint returned ${response.status}`);
  const payload = await response.json();
  if (typeof payload.access_token !== "string") throw new Error(`${username}: access token missing`);
  return payload.access_token;
}

async function api(path, token, options = {}) {
  return fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  });
}

const publicHealth = await api("/health");
if (!publicHealth.ok) throw new Error(`public health returned ${publicHealth.status}`);
const anonymousBusiness = await api("/orders");
if (anonymousBusiness.status !== 401) {
  throw new Error(`anonymous business API should return 401, got ${anonymousBusiness.status}`);
}

const tokens = new Map();
for (const expected of identities) {
  const token = await tokenFor(expected.username);
  tokens.set(expected.username, token);
  const meResponse = await api("/auth/me", token);
  if (!meResponse.ok) throw new Error(`${expected.username}: /auth/me returned ${meResponse.status}`);
  const me = await meResponse.json();
  if (!me.roles.includes(expected.role)) {
    throw new Error(`${expected.username}: expected role ${expected.role}`);
  }
  const actualPermissions = [...me.permissions].sort();
  const expectedPermissions = [...expected.permissions].sort();
  if (JSON.stringify(actualPermissions) !== JSON.stringify(expectedPermissions)) {
    throw new Error(`${expected.username}: permission mapping mismatch`);
  }
  const [path, method] = expected.probe;
  const allowedProbe = await api(path, token, { method, body: "{}" });
  if (allowedProbe.status === 401 || allowedProbe.status === 403) {
    throw new Error(`${expected.username}: permitted command was blocked with ${allowedProbe.status}`);
  }
}

const deniedProbes = [
  ["operator", `/work-orders/${testId}/outputs/${testId}/inspect`],
  ["quality", `/work-orders/${testId}/outputs`],
  ["planner", `/orders/${testId}/approve`],
  ["reviewer", "/orders"],
  ["warehouse", `/work-orders/${testId}/start`],
  ["sales", "/inventory/opening-balances"],
  ["recipe", "/production-batches"]
];

for (const [username, path] of deniedProbes) {
  const response = await api(path, tokens.get(username), { method: "POST", body: "{}" });
  if (response.status !== 403) {
    throw new Error(`${username}: forbidden probe should return 403, got ${response.status}`);
  }
}

console.log(`Identity verification passed: ${identities.length} roles, ${deniedProbes.length} denied command probes.`);
