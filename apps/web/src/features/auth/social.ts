import { authRequest, type AuthResponse } from './api'

declare global {
  interface Window {
    google?: { accounts: { id: { initialize(config: object): void; prompt(): void } } }
    AppleID?: {
      auth: {
        init(config: object): void
        signIn(): Promise<{ authorization: { id_token: string } }>
      }
    }
  }
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existing?.dataset.loaded === 'true') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Không thể tải nhà cung cấp đăng nhập'))
    if (!existing) document.head.append(script)
  })
}

export async function googleSignIn(): Promise<AuthResponse> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('Google Sign-In chưa được cấu hình')
  await loadScript('https://accounts.google.com/gsi/client')
  const identityToken = await new Promise<string>((resolve, reject) => {
    if (!window.google) return reject(new Error('Google Sign-In không khả dụng'))
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (result: { credential?: string }) =>
        result.credential
          ? resolve(result.credential)
          : reject(new Error('Google không trả về token')),
      cancel_on_tap_outside: true,
    })
    window.google.accounts.id.prompt()
  })
  return authRequest<AuthResponse>('/auth/social', { provider: 'google', identityToken })
}

export async function appleSignIn(): Promise<AuthResponse> {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID
  if (!clientId) throw new Error('Apple Sign-In chưa được cấu hình')
  await loadScript(
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
  )
  if (!window.AppleID) throw new Error('Apple Sign-In không khả dụng')
  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI: `${location.origin}/login`,
    usePopup: true,
  })
  const result = await window.AppleID.auth.signIn()
  return authRequest<AuthResponse>('/auth/social', {
    provider: 'apple',
    identityToken: result.authorization.id_token,
  })
}
