import { describe, expect, it } from 'vitest'
import {
  SHARE_INBOX_TTL_MS,
  classifyPayload,
  decideArrival,
  isExpired,
  parseManifest,
} from './share-model'

describe('classifyPayload', () => {
  it('accepts exactly one image', () => {
    expect(classifyPayload([{ path: 'file:///receipt.png', mimeType: 'image/png' }])).toEqual({
      ok: true,
      file: { path: 'file:///receipt.png', mimeType: 'image/png' },
    })
  })

  it.each([null, [], [{ path: 'file:///receipt.pdf', mimeType: 'application/pdf' }]])(
    'rejects unsupported payload %#',
    (files) => expect(classifyPayload(files)).toMatchObject({ ok: false }),
  )

  it('rejects multiple images', () => {
    expect(
      classifyPayload([
        { path: 'file:///one.jpg', mimeType: 'image/jpeg' },
        { path: 'file:///two.jpg', mimeType: 'image/jpeg' },
      ]),
    ).toMatchObject({ ok: false })
  })
})

describe('share manifest', () => {
  it('parses a valid manifest', () => {
    expect(
      parseManifest({ id: 'abc-123', fileName: 'abc-123.jpg', receivedAt: '2026-11-04T10:00:00Z' }),
    ).toEqual({ id: 'abc-123', fileName: 'abc-123.jpg', receivedAt: '2026-11-04T10:00:00Z' })
  })

  it.each([
    null,
    {},
    { id: '../escape', fileName: '../escape.jpg', receivedAt: '2026-11-04T10:00:00Z' },
    { id: 'one', fileName: 'two.jpg', receivedAt: '2026-11-04T10:00:00Z' },
    { id: 'one', fileName: 'one.jpg', receivedAt: 'invalid' },
  ])('rejects invalid manifest %#', (value) => expect(parseManifest(value)).toBeNull())

  it('expires at 24 hours', () => {
    const receivedAt = '2026-11-04T00:00:00.000Z'
    const received = Date.parse(receivedAt)
    expect(isExpired(receivedAt, received + SHARE_INBOX_TTL_MS - 1)).toBe(false)
    expect(isExpired(receivedAt, received + SHARE_INBOX_TTL_MS)).toBe(true)
    expect(isExpired('invalid', received)).toBe(true)
  })
})

describe('decideArrival', () => {
  it.each([
    [{ draft: 'idle', reviewActive: false }, 'open'],
    [{ draft: 'clean', reviewActive: false }, 'open'],
    [{ draft: 'clean', reviewActive: true }, 'replace'],
    [{ draft: 'dirty', reviewActive: true }, 'ask'],
    [{ draft: 'saving', reviewActive: true }, 'defer'],
  ] as const)('maps %o to %s', (state, expected) => expect(decideArrival(state)).toBe(expected))
})
