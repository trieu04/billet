import { afterEach, describe, expect, it, vi } from 'vitest'

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:6701/api/v1'

async function restoreStoredSession(token: string | null = 'saved-token') {
  const { restoreSession } = await import('./restore-session')
  const storage = {
    loadToken: vi.fn().mockResolvedValue(token),
    saveToken: vi.fn().mockResolvedValue(undefined),
  }
  const session = await restoreSession(storage)
  return { session, storage }
}

describe('restoreSession', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('restores a valid token and user with an authenticated request', async () => {
    const user = { id: '1', username: 'billet', email: 'user@example.com', displayName: 'User' }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(user))
    vi.stubGlobal('fetch', fetchMock)

    const { session, storage } = await restoreStoredSession()

    expect(session).toEqual({ token: 'saved-token', user })
    expect(storage.saveToken).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/me$/),
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      new Headers({ Authorization: 'Bearer saved-token' }),
    )
  })

  it('keeps the stored token when the network is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')))

    const { session, storage } = await restoreStoredSession()

    expect(session).toEqual({ token: 'saved-token', user: null })
    expect(storage.saveToken).not.toHaveBeenCalled()
  })

  it.each([500, 502, 503, 504, 408, 429, 403])(
    'keeps the stored token when the server responds with %i',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))

      const { session, storage } = await restoreStoredSession()

      expect(session).toEqual({ token: 'saved-token', user: null })
      expect(storage.saveToken).not.toHaveBeenCalled()
    },
  )

  it('clears the stored token when the server rejects authentication', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    const { session, storage } = await restoreStoredSession()

    expect(session).toEqual({ token: null, user: null })
    expect(storage.saveToken).toHaveBeenCalledExactlyOnceWith(null)
  })

  it('skips validation when there is no stored token', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { session, storage } = await restoreStoredSession(null)

    expect(session).toEqual({ token: null, user: null })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(storage.saveToken).not.toHaveBeenCalled()
  })
})
