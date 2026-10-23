import { afterEach, describe, expect, it, vi } from 'vitest'

process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:6701/api/v1'

async function fetchMedia(mediaAssetId: string, token: string) {
  const { fetchAuthenticatedMedia } = await import('./media')
  return fetchAuthenticatedMedia(mediaAssetId, token)
}

describe('fetchAuthenticatedMedia', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the bearer token when loading private image bytes', async () => {
    const blob = new Blob(['image'], { type: 'image/jpeg' })
    const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMedia('18', 'access-token')).resolves.toBeInstanceOf(Blob)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/media\/18\/content$/),
      expect.objectContaining({ headers: { Authorization: 'Bearer access-token' } }),
    )
  })

  it('rejects an unauthorized media response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await expect(fetchMedia('18', 'expired-token')).rejects.toThrow('Media request failed (401)')
  })
})
