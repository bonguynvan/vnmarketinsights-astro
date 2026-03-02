export function getRequestUrl(request: Request, fallbackUrl?: URL) {
  const baseUrl = fallbackUrl || new URL(request.url);
  const forwardedPath =
    request.headers.get('x-astro-path') || baseUrl.searchParams.get('x_astro_path');

  if (!forwardedPath) return baseUrl;

  try {
    return new URL(forwardedPath, `${baseUrl.protocol}//${baseUrl.host}`);
  } catch {
    return baseUrl;
  }
}
