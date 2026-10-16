export function resolveApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = new URL(normalizedBaseUrl)
  const basePath = base.pathname.replace(/\/+$/, '')

  if (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) {
    return new URL(normalizedPath, base.origin).toString()
  }

  return `${normalizedBaseUrl}${normalizedPath}`
}
