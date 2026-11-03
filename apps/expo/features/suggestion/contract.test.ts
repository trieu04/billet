import { describe, expect, it } from 'vitest'
import { parseInferenceResult, parseOcrResult, parseSnapshot, toRequestLocale } from './contract'

const snapshotPayload = {
  etag: '"abc"',
  imageTypes: [{ key: 'parking_ticket', label: 'Vé gửi xe', description: 'Vé nhỏ' }],
  choices: [{ id: '4', label: 'Gửi xe – Tòa A', imageType: 'parking_ticket' }],
  rules: [
    {
      id: '9',
      origin: 'learned',
      conditions: { choiceId: '4' },
      actions: { amountMinor: '5000', currency: 'VND', categoryId: '2' },
      confidence: 0.8,
      updatedAt: '2026-10-25T00:00:00.000Z',
    },
    { id: 'broken' },
  ],
  defaultRules: [],
  thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 },
  decisionImage: {
    maxEdgePx: 1024,
    quality: 0.6,
    retryQuality: 0.45,
    targetBytes: 150000,
    maxBytes: 400000,
  },
  features: { suggestions: true, ruleLearning: true, location: false, decision: true },
}

describe('parseSnapshot', () => {
  it('accepts the server snapshot and drops malformed rules', () => {
    const snapshot = parseSnapshot(snapshotPayload)
    expect(snapshot?.etag).toBe('"abc"')
    expect(snapshot?.rules).toHaveLength(1)
    expect(snapshot?.rules[0]?.conditions).toEqual({
      choiceId: '4',
      imageType: undefined,
      placeKey: undefined,
      merchantKey: undefined,
    })
    expect(snapshot?.features).toEqual({
      suggestions: true,
      ruleLearning: true,
      location: false,
      decision: true,
    })
  })

  it('rejects snapshots without thresholds, image parameters, or features', () => {
    expect(parseSnapshot(null)).toBeNull()
    expect(parseSnapshot({ ...snapshotPayload, thresholds: undefined })).toBeNull()
    expect(
      parseSnapshot({
        ...snapshotPayload,
        decisionImage: { ...snapshotPayload.decisionImage, maxBytes: '1' },
      }),
    ).toBeNull()
    expect(parseSnapshot({ ...snapshotPayload, features: {} })).toBeNull()
  })
})

describe('parseInferenceResult', () => {
  it('reads a succeeded inference', () => {
    expect(
      parseInferenceResult({
        id: '77',
        status: 'succeeded',
        choiceSetVersion: 'v1',
        imageType: { id: 'receipt', confidence: 0.9 },
        category: { id: '3', confidence: 0.7 },
        personalChoice: null,
        provider: 'fake',
        model: 'fake-1',
        latencyMs: 1200,
      }),
    ).toEqual({
      id: '77',
      status: 'succeeded',
      choiceSetVersion: 'v1',
      imageType: { id: 'receipt', confidence: 0.9 },
      category: { id: '3', confidence: 0.7 },
      personalChoice: null,
      provider: 'fake',
      model: 'fake-1',
      latencyMs: 1200,
    })
  })

  it('keeps the reason of an unavailable inference and rejects unknown statuses', () => {
    expect(
      parseInferenceResult({ id: '1', status: 'unavailable', reason: 'timeout' }),
    ).toMatchObject({
      status: 'unavailable',
      reason: 'timeout',
      imageType: null,
    })
    expect(parseInferenceResult({ id: '1', status: 'pending' })).toBeNull()
    expect(parseInferenceResult('oops')).toBeNull()
  })
})

describe('toRequestLocale', () => {
  it('keeps language and region, drops extensions', () => {
    expect(toRequestLocale('vi-VN')).toBe('vi-VN')
    expect(toRequestLocale('en-US-u-hc-h23')).toBe('en-US')
    expect(toRequestLocale('en_GB')).toBe('en-GB')
    expect(toRequestLocale('')).toBe('vi-VN')
    expect(toRequestLocale(undefined, 'en-US')).toBe('en-US')
  })
})

describe('parseOcrResult', () => {
  it('keeps text lines with valid boxes and skips blanks', () => {
    expect(
      parseOcrResult({
        lines: [
          { text: 'TỔNG CỘNG', box: { x: 0.1, y: 0.8, width: 0.3, height: 0.02 } },
          { text: '58.000', box: { x: 0.7 } },
          { text: '   ' },
          'junk',
        ],
      }),
    ).toEqual({
      lines: [
        { text: 'TỔNG CỘNG', box: { x: 0.1, y: 0.8, width: 0.3, height: 0.02 } },
        { text: '58.000' },
      ],
    })
    expect(parseOcrResult(null)).toBeNull()
  })
})
