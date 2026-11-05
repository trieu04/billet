import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.hoisted(() => vi.fn())

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('expo-file-system', () => ({
  File: class FakeFile {
    constructor(readonly uri: string) {}
    bytes() {
      return Promise.resolve(new Uint8Array())
    }
  },
}))
vi.mock('@/features/api/client', () => ({ apiRequest }))

/** Keeps appended values as-is; Node's FormData would stringify a non-Blob part. */
class RecordingFormData {
  readonly values = new Map<string, unknown>()
  append(name: string, value: unknown) {
    this.values.set(name, value)
  }
  get(name: string) {
    return this.values.get(name)
  }
}
vi.stubGlobal('FormData', RecordingFormData)

import { File } from 'expo-file-system'

import { DEADLINE_HEADER, requestInference } from './decision-client'
import type { DecisionRequest } from './session'

const request: DecisionRequest = {
  image: { uri: 'file:///cache/photo.jpg', bytes: 1234, mimeType: 'image/jpeg' },
  clientRequestId: 'photo-1',
  placeKey: 'place-1',
  deadlineMs: 6500.9,
  signal: new AbortController().signal,
}

describe('requestInference', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    apiRequest.mockResolvedValue(null)
  })

  it('posts multipart with the deadline header', async () => {
    await requestInference('token', request)

    const [path, options] = apiRequest.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe('/expense-inferences')
    expect(options).toMatchObject({ method: 'POST', token: 'token', signal: request.signal })
    expect(options.headers).toEqual({ [DEADLINE_HEADER]: '6500' })
    const form = options.body as FormData
    expect(form.get('clientRequestId')).toBe('photo-1')
    expect(form.get('placeKey')).toBe('place-1')
  })

  it('sends the photo as a File, which Expo fetch can read; `{ uri }` parts are rejected', async () => {
    await requestInference('token', request)

    const form = (apiRequest.mock.calls[0] as [string, { body: FormData }])[1].body
    const image = form.get('image')
    expect(image).toBeInstanceOf(File)
    expect((image as unknown as { uri: string }).uri).toBe(request.image.uri)
  })
})
