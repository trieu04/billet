import type { Repository } from 'typeorm'
import type { DecisionConfig } from '../../../configs/app.config'
import type { UsersService } from '../../user/service'
import type { ExpenseInferenceEntity } from '../entities/expense-inference.entity'
import { DecisionProviderError, type DecisionProvider } from '../interface'
import { FakeDecisionProvider } from '../providers/fake.provider'
import { assembleChoiceSet } from '../utils/choice-set'
import type { ChoiceSetService } from './choice-set.service'
import type { DecisionMetricsService } from './decision-metrics.service'
import { InferenceService, type InferenceRequest } from './inference.service'

const config = { timeoutMs: 5_000, maxImageBytes: 1_048_576 } as DecisionConfig
const choiceSet = assembleChoiceSet({
  imageTypes: [{ key: 'parking_ticket', label: 'Vé gửi xe', description: null }],
  categories: [{ id: '2', label: 'Di chuyển' }],
  personal: [],
  maxChoices: 64,
})

/** In-memory stand-in for the inference repository with the unique (user, clientRequestId) key. */
function memoryRepository() {
  const rows: ExpenseInferenceEntity[] = []
  const find = (where: { userId: string; clientRequestId: string }) =>
    rows.find((row) => row.userId === where.userId && row.clientRequestId === where.clientRequestId)
  return {
    rows,
    findOneBy: jest.fn(
      async (where: { userId: string; clientRequestId: string }) => find(where) ?? null,
    ),
    findOneByOrFail: jest.fn(async (where: { userId: string; clientRequestId: string }) => {
      const row = find(where)
      if (!row) throw new Error('not found')
      return row
    }),
    createQueryBuilder: () => {
      let values: Partial<ExpenseInferenceEntity> = {}
      const builder = {
        insert: () => builder,
        values: (input: Partial<ExpenseInferenceEntity>) => {
          values = input
          return builder
        },
        orIgnore: () => builder,
        execute: async () => {
          const key = { userId: values.userId ?? '', clientRequestId: values.clientRequestId ?? '' }
          if (find(key)) return { raw: [] }
          const row = { ...values, id: String(rows.length + 1) } as ExpenseInferenceEntity
          rows.push(row)
          return { raw: [{ id: row.id }] }
        },
      }
      return builder
    },
  }
}

function setup(
  provider: DecisionProvider,
  settings: Partial<{ suggestionsEnabled: boolean; suggestionLocationEnabled: boolean }> = {},
) {
  const repository = memoryRepository()
  const choiceSets = { build: jest.fn().mockResolvedValue(choiceSet) }
  const users = {
    getSettings: jest.fn().mockResolvedValue({
      suggestionsEnabled: true,
      suggestionLocationEnabled: false,
      ...settings,
    }),
  }
  const metrics = { record: jest.fn() }
  const service = new InferenceService(
    repository as unknown as Repository<ExpenseInferenceEntity>,
    provider,
    config,
    choiceSets as unknown as ChoiceSetService,
    users as unknown as UsersService,
    metrics as unknown as DecisionMetricsService,
  )
  return { service, repository, choiceSets, metrics }
}

function request(overrides: Partial<InferenceRequest> = {}): InferenceRequest {
  return {
    image: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    clientRequestId: 'photo-0001',
    locale: 'vi-VN',
    placeKey: 'w3gvk1c',
    deadlineMs: null,
    signal: new AbortController().signal,
    receivedAt: Date.now(),
    ...overrides,
  }
}

const output = {
  imageType: { ref: 't1', confidence: 0.93 },
  category: { ref: 'c1', confidence: 0.7 },
  personal: null,
  usage: { inputTokens: 120, outputTokens: 12 },
}

describe('InferenceService', () => {
  it('maps refs back to ids and stores the result', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, output })
    const { service, repository } = setup(provider)

    const result = await service.infer('7', request())

    expect(result).toEqual({
      id: '1',
      status: 'succeeded',
      choiceSetVersion: choiceSet.version,
      imageType: { id: 'parking_ticket', confidence: 0.93 },
      category: { id: '2', confidence: 0.7 },
      personalChoice: null,
      provider: 'fake',
      model: 'fake',
      latencyMs: expect.any(Number),
    })
    expect(repository.rows[0]).toMatchObject({ imageBytes: 4, usage: output.usage })
  })

  it('is idempotent per clientRequestId and does not call the provider again', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, output })
    const { service, metrics } = setup(provider)

    const first = await service.infer('7', request())
    const second = await service.infer('7', request())
    const otherUser = await service.infer('8', request())

    expect(second).toEqual(first)
    expect(otherUser.id).not.toBe(first.id)
    expect(provider.calls).toHaveLength(2)
    expect(metrics.record).toHaveBeenCalledTimes(2)
  })

  it('returns disabled without calling the provider when suggestions are off', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, output })
    const { service, choiceSets } = setup(provider, { suggestionsEnabled: false })

    await expect(service.infer('7', request())).resolves.toMatchObject({
      status: 'disabled',
      reason: 'suggestions_disabled',
    })
    expect(provider.calls).toHaveLength(0)
    expect(choiceSets.build).not.toHaveBeenCalled()
  })

  it('skips the provider when less than one second of the deadline remains', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, output })
    const { service } = setup(provider)

    await expect(service.infer('7', request({ deadlineMs: 900 }))).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'deadline',
    })
    expect(provider.calls).toHaveLength(0)
  })

  it('times out at min(deadline, timeout) even when the provider ignores the signal', async () => {
    const provider: DecisionProvider = {
      id: 'stubborn',
      model: 'm',
      limits: { maxImageBytes: 1_048_576, maxChoices: 64 },
      decide: () => new Promise(() => undefined),
    }
    const { service } = setup(provider)
    const startedAt = Date.now()

    await expect(service.infer('7', request({ deadlineMs: 1_200 }))).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'timeout',
    })
    expect(Date.now() - startedAt).toBeLessThan(2_000)
  })

  it('reports invalid_output for refs outside the choice set', async () => {
    const provider = new FakeDecisionProvider({
      maxImageBytes: 1_048_576,
      output: { ...output, category: { ref: 'c99', confidence: 0.9 } },
    })
    const { service } = setup(provider)

    await expect(service.infer('7', request())).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'invalid_output',
      category: null,
    })
  })

  it('maps provider errors to unavailable reasons', async () => {
    const provider = new FakeDecisionProvider({
      maxImageBytes: 1_048_576,
      error: new DecisionProviderError('provider_rate_limited'),
    })
    const { service } = setup(provider)

    await expect(service.infer('7', request())).resolves.toMatchObject({
      status: 'unavailable',
      reason: 'provider_rate_limited',
    })
  })

  it('aborts the provider when the client disconnects', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, latencyMs: 10_000 })
    const { service } = setup(provider)
    const disconnect = new AbortController()
    setTimeout(() => disconnect.abort(), 50)

    await expect(service.infer('7', request({ signal: disconnect.signal }))).resolves.toMatchObject(
      { status: 'unavailable', reason: 'cancelled' },
    )
  })

  it('drops the place key unless location use is enabled', async () => {
    const provider = new FakeDecisionProvider({ maxImageBytes: 1_048_576, output })
    const disabled = setup(provider)
    await disabled.service.infer('7', request())
    expect(disabled.choiceSets.build).toHaveBeenCalledWith('7', null, 64)

    const enabled = setup(provider, { suggestionLocationEnabled: true })
    await enabled.service.infer('7', request())
    expect(enabled.choiceSets.build).toHaveBeenCalledWith('7', 'w3gvk1c', 64)
  })
})
