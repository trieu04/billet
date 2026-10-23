const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function resolveApiBaseUrl(configuredBaseUrl: string, expoHostUri: string | undefined) {
  const baseUrl = new URL(configuredBaseUrl)
  if (!LOOPBACK_HOSTS.has(baseUrl.hostname) || !expoHostUri) {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  const expoHost = parseHost(expoHostUri)
  if (!expoHost) return configuredBaseUrl.replace(/\/$/, '')

  baseUrl.hostname = expoHost
  return baseUrl.toString().replace(/\/$/, '')
}

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

function parseHost(hostUri: string) {
  try {
    return new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname
  } catch {
    return null
  }
}
