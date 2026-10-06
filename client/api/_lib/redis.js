// Minimal Upstash Redis REST client (no dependency). Vercel's Upstash integration
// injects KV_REST_API_URL / KV_REST_API_TOKEN; plain Upstash uses the UPSTASH_ names.

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisConfigured = () => Boolean(url() && token());

export async function redis(...command) {
  const res = await fetch(url(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`redis ${command[0]} failed: ${data.error || res.status}`);
  return data.result;
}
