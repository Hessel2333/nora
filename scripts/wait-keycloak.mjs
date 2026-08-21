const readyUrl = process.env.NORA_LOCAL_KEYCLOAK_URL
  ?? "http://localhost:18080/realms/nora/.well-known/openid-configuration";
const deadline = Date.now() + 90_000;

while (Date.now() < deadline) {
  try {
    const response = await fetch(readyUrl, { signal: AbortSignal.timeout(2_000) });
    if (response.ok) {
      console.log(`Keycloak realm is ready: ${readyUrl}`);
      process.exit(0);
    }
  } catch {
    // The container is still starting. Retry until the bounded deadline.
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

console.error(`Keycloak did not become ready within 90 seconds: ${readyUrl}`);
process.exit(1);
