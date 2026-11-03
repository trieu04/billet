import { CanActivate, type ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import request from 'supertest'
import { App } from 'supertest/types'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module'
import { configureApplication } from '../src/configure-application'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import {
  DECISION_PROVIDER,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
} from '../src/modules/recognition/interface'

// Runs against a real PostgreSQL with migrations applied (see apps/server/README.md):
// E2E_DATABASE=true DATABASE_PORT=6719 ... pnpm --filter @billet/server test:e2e
const describeWithDatabase = process.env.E2E_DATABASE === 'true' ? describe : describe.skip

jest.setTimeout(30_000)

/** Authenticates as the user id in the `x-test-user` header. */
class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    req.user = { id: String(req.headers['x-test-user']), email: 'e2e@example.com' }
    return true
  }
}

type Behavior = (input: DecisionInput, signal: AbortSignal) => Promise<DecisionOutput>

/** Decision provider whose behavior each test scripts; records the signals it received. */
class ScriptedProvider implements DecisionProvider {
  readonly id = 'fake'
  readonly model = 'scripted'
  readonly limits = { maxImageBytes: 1_048_576, maxChoices: 64 }
  readonly signals: AbortSignal[] = []
  behavior: Behavior = async (input) => pick(input, 'Vé gửi xe')

  decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionOutput> {
    this.signals.push(signal)
    return this.behavior(input, signal)
  }
}

/** Choose the image type by label, the "Di chuyển" category, and the first personal choice. */
function pick(input: DecisionInput, imageTypeLabel: string): DecisionOutput {
  const imageType = input.choices.imageTypes.find((choice) => choice.label === imageTypeLabel)
  const category = input.choices.categories.find((choice) => choice.label === 'Di chuyển')
  const personal = input.choices.personal[0]
  return {
    imageType: { ref: imageType?.ref ?? 't1', confidence: 0.93 },
    category: category ? { ref: category.ref, confidence: 0.7 } : null,
    personal: personal ? { ref: personal.ref, confidence: 0.85 } : null,
    usage: { inputTokens: 300, outputTokens: 20 },
  }
}

function sleepUnlessAborted(ms: number, signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('slow provider finished')), ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error('aborted'))
    })
  })
}

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2_000, 1)])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const PLACE = 'w3gvk1c'

describeWithDatabase('Photo expense suggestions (e2e, database)', () => {
  let app: INestApplication<App>
  let dataSource: DataSource
  let baseUrl: string
  const provider = new ScriptedProvider()
  let userA: string
  let userB: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DECISION_PROVIDER)
      .useValue(provider)
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile()
    app = module.createNestApplication()
    configureApplication(app)
    await app.listen(0, '127.0.0.1')
    const server: unknown = app.getHttpServer()
    baseUrl = `http://127.0.0.1:${((server as Server).address() as AddressInfo).port}`
    dataSource = app.get(DataSource)
    userA = await createUser()
    userB = await createUser()
  })

  afterAll(async () => {
    if (dataSource) await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [[userA, userB]])
    await app?.close()
  })

  beforeEach(() => {
    provider.behavior = async (input) => pick(input, 'Vé gửi xe')
  })

  async function createUser(): Promise<string> {
    const name = `e2e${randomUUID().slice(0, 8)}`
    const rows = await dataSource.query<{ id: string }[]>(
      `INSERT INTO users (username, email, display_name, password_hash)
       VALUES ($1, $2, $1, 'x') RETURNING id::text AS id`,
      [name, `${name}@example.com`],
    )
    return rows[0].id
  }

  function as(user: string) {
    const server = app.getHttpServer()
    return {
      get: (path: string) => request(server).get(`/api/v1${path}`).set('x-test-user', user),
      post: (path: string) => request(server).post(`/api/v1${path}`).set('x-test-user', user),
      patch: (path: string) => request(server).patch(`/api/v1${path}`).set('x-test-user', user),
      delete: (path: string) => request(server).delete(`/api/v1${path}`).set('x-test-user', user),
    }
  }

  function infer(user: string, fields: Record<string, string> = {}, image: Buffer = JPEG) {
    const req = as(user)
      .post('/expense-inferences')
      .field('clientRequestId', fields.clientRequestId ?? `req-${randomUUID()}`)
      .field('timezone', 'Asia/Ho_Chi_Minh')
      .field('locale', 'vi-VN')
    if (fields.placeKey) req.field('placeKey', fields.placeKey)
    if (fields.deadline) req.set('X-Billet-Deadline-Ms', fields.deadline)
    return req.attach('image', image, { filename: 'photo.jpg', contentType: 'image/jpeg' })
  }

  it('returns the provider selection mapped to ids and is idempotent per clientRequestId', async () => {
    const clientRequestId = `req-${randomUUID()}`
    const first = await infer(userA, { clientRequestId }).expect(200)
    expect(first.body).toMatchObject({
      status: 'succeeded',
      imageType: { id: 'parking_ticket', confidence: 0.93 },
      category: { id: expect.stringMatching(/^[1-9]\d*$/), confidence: 0.7 },
      personalChoice: null,
      provider: 'fake',
      model: 'scripted',
      choiceSetVersion: expect.stringMatching(/^[0-9a-f]{16}$/),
    })
    const calls = provider.signals.length
    const again = await infer(userA, { clientRequestId }).expect(200)
    expect(again.body).toEqual(first.body)
    expect(provider.signals).toHaveLength(calls)
  })

  it('returns unavailable: timeout within the deadline for a slow provider', async () => {
    provider.behavior = (_input, signal) => sleepUnlessAborted(10_000, signal)
    const startedAt = Date.now()
    const response = await infer(userA, { deadline: '1500' }).expect(200)
    expect(response.body).toMatchObject({ status: 'unavailable', reason: 'timeout' })
    expect(Date.now() - startedAt).toBeLessThan(3_000)
  })

  it('skips the provider when the remaining deadline is below one second', async () => {
    const calls = provider.signals.length
    const response = await infer(userA, { deadline: '800' }).expect(200)
    expect(response.body).toMatchObject({ status: 'unavailable', reason: 'deadline' })
    expect(provider.signals).toHaveLength(calls)
  })

  it('aborts the provider call when the client disconnects', async () => {
    let started: (() => void) | undefined
    const providerStarted = new Promise<void>((resolve) => (started = resolve))
    provider.behavior = (_input, signal) => {
      started?.()
      return sleepUnlessAborted(10_000, signal)
    }
    const form = new FormData()
    form.set('clientRequestId', `req-${randomUUID()}`)
    form.set('timezone', 'Asia/Ho_Chi_Minh')
    form.set('locale', 'vi-VN')
    form.set('image', new Blob([JPEG], { type: 'image/jpeg' }), 'photo.jpg')
    const client = new AbortController()
    const pending = fetch(`${baseUrl}/api/v1/expense-inferences`, {
      method: 'POST',
      body: form,
      headers: { 'x-test-user': userA },
      signal: client.signal,
    }).catch((error: unknown) => error)

    await providerStarted
    const signal = provider.signals.at(-1)
    const startedAt = Date.now()
    client.abort()
    await pending
    while (!signal?.aborted && Date.now() - startedAt < 3_000)
      await new Promise((resolve) => setTimeout(resolve, 20))
    expect(signal?.aborted).toBe(true)
  })

  it('reports out-of-set provider output as unavailable: invalid_output', async () => {
    provider.behavior = async (input) => ({
      ...pick(input, 'Vé gửi xe'),
      category: { ref: 'c999', confidence: 0.9 },
    })
    const response = await infer(userA).expect(200)
    expect(response.body).toMatchObject({
      status: 'unavailable',
      reason: 'invalid_output',
      category: null,
    })
  })

  it('rejects oversize (413), non-JPEG (415), and incomplete (400) requests', async () => {
    const oversize = Buffer.concat([JPEG, Buffer.alloc(1_048_576)])
    await infer(userA, {}, oversize).expect(413)
    await infer(userA, {}, PNG).expect(415)
    await as(userA)
      .post('/expense-inferences')
      .field('timezone', 'Asia/Ho_Chi_Minh')
      .field('locale', 'vi-VN')
      .attach('image', JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(400)
    await infer(userA, { placeKey: 'not-a-geohash' }).expect(400)
    await infer(userA, { deadline: 'soon' }).expect(400)
  })

  it('returns disabled without calling the provider when suggestions are off', async () => {
    await as(userA).patch('/profile/settings').send({ suggestionsEnabled: false }).expect(200)
    const calls = provider.signals.length
    const response = await infer(userA).expect(200)
    expect(response.body).toMatchObject({ status: 'disabled', reason: 'suggestions_disabled' })
    expect(provider.signals).toHaveLength(calls)
    const settings = await as(userA)
      .patch('/profile/settings')
      .send({ suggestionsEnabled: true, suggestionLocationEnabled: true })
      .expect(200)
    expect(settings.body).toMatchObject({
      suggestionsEnabled: true,
      ruleLearningEnabled: true,
      suggestionLocationEnabled: true,
    })
  })

  it('serves the suggestion snapshot with an ETag and 304 on If-None-Match', async () => {
    const first = await as(userA).get('/suggestion-config').expect(200)
    const etag = first.headers.etag
    expect(etag).toBe(first.body.etag)
    expect(first.body.imageTypes).toHaveLength(8)
    expect(first.body.imageTypes[2]).toMatchObject({ key: 'parking_ticket', label: 'Vé gửi xe' })
    expect(first.body.defaultRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origin: 'default', conditions: { imageType: 'parking_ticket' } }),
      ]),
    )
    expect(first.body.thresholds).toEqual({
      ocrAmount: 0.8,
      personalRule: 0.7,
      decisionCategory: 0.6,
    })
    expect(first.body.features).toMatchObject({ suggestions: true, decision: true })

    await as(userA).get('/suggestion-config').set('If-None-Match', etag).expect(304)
    await as(userB).get('/suggestion-config').set('If-None-Match', etag).expect(200)

    await as(userA).post('/decision-choices').send({ label: 'Cà phê sáng' }).expect(201)
    const changed = await as(userA).get('/suggestion-config').set('If-None-Match', etag).expect(200)
    expect(changed.headers.etag).not.toBe(etag)
  })

  it('isolates inferences, choices, and rules between accounts (404)', async () => {
    const choice = await as(userA)
      .post('/decision-choices')
      .send({ label: 'Gửi xe nhà', imageType: 'parking_ticket', merchantKey: 'Bãi Xe Nhà' })
      .expect(201)
    expect(choice.body).toMatchObject({ origin: 'user', merchantKey: 'bai xe nha', version: 1 })
    const rule = await as(userA)
      .post('/expense-rules')
      .send({
        conditions: { choiceId: choice.body.id },
        actions: { amountMinor: '3000', currency: 'VND' },
      })
      .expect(201)
    const inference = await infer(userA).expect(200)

    await as(userB)
      .patch(`/decision-choices/${choice.body.id}`)
      .send({ label: 'x', version: 1 })
      .expect(404)
    await as(userB).delete(`/decision-choices/${choice.body.id}`).expect(404)
    await as(userB)
      .patch(`/expense-rules/${rule.body.id}`)
      .send({ status: 'disabled', version: 1 })
      .expect(404)
    await as(userB).delete(`/expense-rules/${rule.body.id}`).expect(404)
    await as(userB)
      .post('/expense-rules')
      .send({
        conditions: { choiceId: choice.body.id },
        actions: { amountMinor: '3000', currency: 'VND' },
      })
      .expect(404)
    const base = {
      amountMinor: '3000',
      currency: 'VND',
      occurredAt: new Date().toISOString(),
      occurredTimezone: 'Asia/Ho_Chi_Minh',
    }
    await as(userB)
      .post('/expenses')
      .send({ ...base, idempotencyKey: `e2e-${randomUUID()}`, inferenceId: inference.body.id })
      .expect(404)
    await as(userB)
      .post('/expenses')
      .send({ ...base, idempotencyKey: `e2e-${randomUUID()}`, personalChoiceId: choice.body.id })
      .expect(404)

    // System items are read-only.
    const list = await as(userA).get('/decision-choices').expect(200)
    const system = list.body.find((item: { kind: string }) => item.kind === 'image_type')
    await as(userA)
      .patch(`/decision-choices/${system.id}`)
      .send({ label: 'x', version: 1 })
      .expect(404)
    const rules = await as(userA).get('/expense-rules').expect(200)
    const defaultRule = rules.body.find((item: { origin: string }) => item.origin === 'default')
    await as(userA).delete(`/expense-rules/${defaultRule.id}`).expect(404)

    // Optimistic version and the learned → user transition.
    await as(userA)
      .patch(`/decision-choices/${choice.body.id}`)
      .send({ label: 'x', version: 9 })
      .expect(409)
    await as(userA).delete(`/expense-rules/${rule.body.id}`).expect(204)
    await as(userA).delete(`/decision-choices/${choice.body.id}`).expect(204)
  })

  it('learns a personal choice and an amount rule from three parking expenses', async () => {
    await as(userA).patch('/profile/settings').send({ suggestionLocationEnabled: true }).expect(200)
    const created: { id: string; version: number }[] = []
    for (let day = 0; day < 3; day += 1) {
      const inference = await infer(userA, { placeKey: PLACE }).expect(200)
      const response = await as(userA)
        .post('/expenses')
        .send({
          amountMinor: '5000',
          currency: 'VND',
          occurredAt: new Date(Date.now() - day * 86_400_000).toISOString(),
          occurredTimezone: 'Asia/Ho_Chi_Minh',
          merchant: 'Tòa A',
          idempotencyKey: `e2e-${randomUUID()}`,
          inferenceId: inference.body.id,
          imageType: 'parking_ticket',
          placeKey: PLACE,
          merchantKey: 'TÒA A',
          fieldProvenance: {
            amountMinor: { source: 'user', outcome: 'entered' },
            categoryId: { source: 'decision_model', confidence: 0.7, outcome: 'accepted' },
            occurredAt: { source: 'capture_time', outcome: 'accepted' },
          },
        })
        .expect(201)
      expect(response.body).toMatchObject({
        inferenceId: inference.body.id,
        imageType: 'parking_ticket',
        placeKey: PLACE,
        merchantKey: 'toa a',
        fieldProvenance: { amountMinor: { source: 'user', outcome: 'entered' } },
      })
      created.push(response.body)
    }
    const [stored] = await dataSource.query<{ source: string; field_sources: unknown }[]>(
      'SELECT source::text, field_sources FROM expenses WHERE id = $1',
      [created[0].id],
    )
    expect(stored).toEqual({
      source: 'recognition',
      field_sources: {
        amountMinor: 'user',
        occurredAt: 'capture_time',
        categoryId: 'decision_model',
      },
    })

    const snapshot = await as(userA).get('/suggestion-config').expect(200)
    const learnedChoice = snapshot.body.choices.find(
      (choice: { imageType?: string; placeKey?: string }) =>
        choice.imageType === 'parking_ticket' && choice.placeKey === PLACE,
    )
    expect(learnedChoice).toMatchObject({ label: 'Vé gửi xe – Tòa A' })
    const placeRule = snapshot.body.rules.find(
      (rule: { conditions: Record<string, string> }) =>
        rule.conditions.placeKey === PLACE && rule.conditions.imageType === 'parking_ticket',
    )
    expect(placeRule).toMatchObject({
      origin: 'learned',
      actions: { amountMinor: '5000', currency: 'VND', merchant: 'Tòa A' },
      confidence: 1,
    })
    expect(snapshot.body.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origin: 'learned', conditions: { merchantKey: 'toa a' } }),
      ]),
    )

    // The learned choice is now offered to the model (same place first).
    const next = await infer(userA, { placeKey: PLACE }).expect(200)
    expect(next.body.personalChoice).toMatchObject({ id: learnedChoice.id })

    // Deleting the learned choice suppresses relearning it for this key.
    await as(userA).delete(`/decision-choices/${learnedChoice.id}`).expect(204)
    await as(userA)
      .patch(`/expenses/${created[0].id}`)
      .send({ version: created[0].version, caption: 'Gửi xe' })
      .expect(200)
    const after = await as(userA).get('/suggestion-config').expect(200)
    expect(
      after.body.choices.some((choice: { placeKey?: string }) => choice.placeKey === PLACE),
    ).toBe(false)

    // Editing a learned rule hands it to the user; the learner leaves it alone afterwards.
    const rules = await as(userA).get('/expense-rules').expect(200)
    const learnedRule = rules.body.find((rule: { id: string }) => rule.id === placeRule.id)
    const edited = await as(userA)
      .patch(`/expense-rules/${placeRule.id}`)
      .send({ actions: { amountMinor: '6000', currency: 'VND' }, version: learnedRule.version })
      .expect(200)
    expect(edited.body).toMatchObject({ origin: 'user', actions: { amountMinor: '6000' } })
    await as(userA).delete(`/expenses/${created[1].id}`).expect(204)
    const kept = await as(userA).get('/expense-rules').expect(200)
    expect(kept.body.find((rule: { id: string }) => rule.id === placeRule.id)).toMatchObject({
      origin: 'user',
      actions: { amountMinor: '6000', currency: 'VND' },
    })
  })
})
