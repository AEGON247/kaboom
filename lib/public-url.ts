/**
 * Build the externally reachable origin for this request (Vercel-style forwarded headers).
 */
export function getPublicOrigin(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    "localhost:3000";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export function buildRunPublicUrl(req: Request, id: string): string {
  const origin = getPublicOrigin(req);
  return `${origin}/api/run/${id}`;
}
