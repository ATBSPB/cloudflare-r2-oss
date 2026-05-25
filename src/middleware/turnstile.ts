import type { Env } from "../types";

const verifiedCache = new Map<string, number>();
const CACHE_TTL = 60_000;

export async function verifyTurnstile(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get("cf-turnstile-response");
  if (!token) return false;

  const now = Date.now();
  const cached = verifiedCache.get(token);
  if (cached && cached > now) return true;

  const secret = env.TURNSTILE_SECRET;
  if (!secret) return true;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const outcome = await res.json<{ success: boolean }>();

  if (outcome.success) {
    verifiedCache.set(token, now + CACHE_TTL);
    for (const [k, v] of verifiedCache) {
      if (v <= now) verifiedCache.delete(k);
    }
  }

  return outcome.success;
}
