import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.EXPO_PUBLIC_BILLET_API_BASE_URL = 'http://localhost:6701/api/v1'

const fileSystem = vi.hoisted(() => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: vi.fn(),
  downloadAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  moveAsync: vi.fn(),
}))

vi.mock('expo-file-system/legacy', () => fileSystem)
vi.mock('./runtime-host', () => ({ getExpoHostUri: () => undefined }))

describe('loadAuthenticatedMediaFile', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fileSystem.getInfoAsync.mockResolvedValue({ exists: false })
  })

  it('downloads private media with the bearer token into the cache', async () => {
    fileSystem.downloadAsync.mockResolvedValue({ status: 200 })
    const { loadAuthenticatedMediaFile } = await import('./media-file')

    await expect(loadAuthenticatedMediaFile('18', 'access-token')).resolves.toBe(
      'file:///cache/billet-media-18',
    )
    expect(fileSystem.downloadAsync).toHaveBeenCalledWith(
      expect.stringMatching(/\/media\/18\/content$/),
      'file:///cache/billet-media-18.download',
      { headers: { Authorization: 'Bearer access-token' } },
    )
    expect(fileSystem.moveAsync).toHaveBeenCalledWith({
      from: 'file:///cache/billet-media-18.download',
      to: 'file:///cache/billet-media-18',
    })
  })

  it('refreshes an expired token and retries once', async () => {
    fileSystem.downloadAsync
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ status: 200 })
    const { configureApiRefresh } = await import('./client')
    configureApiRefresh(() => Promise.resolve('fresh-token'))
    const { loadAuthenticatedMediaFile } = await import('./media-file')

    await loadAuthenticatedMediaFile('18', 'expired-token')

    expect(fileSystem.downloadAsync).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      { headers: { Authorization: 'Bearer fresh-token' } },
    )
  })

  it('discards the partial file when the download is rejected', async () => {
    fileSystem.downloadAsync.mockResolvedValue({ status: 403 })
    const { loadAuthenticatedMediaFile } = await import('./media-file')

    await expect(loadAuthenticatedMediaFile('18', 'access-token')).rejects.toThrow(
      'Media request failed (403)',
    )
    expect(fileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/billet-media-18.download', {
      idempotent: true,
    })
    expect(fileSystem.moveAsync).not.toHaveBeenCalled()
  })

  it('reuses a cached file without downloading', async () => {
    fileSystem.getInfoAsync.mockResolvedValue({ exists: true })
    const { loadAuthenticatedMediaFile } = await import('./media-file')

    await expect(loadAuthenticatedMediaFile('18', 'access-token')).resolves.toBe(
      'file:///cache/billet-media-18',
    )
    expect(fileSystem.downloadAsync).not.toHaveBeenCalled()
  })
})
