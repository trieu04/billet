import {
  CanActivate,
  type ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import request from 'supertest'
import { App } from 'supertest/types'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module'
import { OBJECT_STORAGE, type ObjectStorage } from '../src/common/storage/interface'
import { authConfig } from '../src/configs/app.config'
import { configureApplication } from '../src/configure-application'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import {
  DECISION_PROVIDER,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
} from '../src/modules/recognition/interface'

// Runs against a real PostgreSQL with migrations applied (see apps/server/README.md).
const describeWithDatabase = process.env.E2E_DATABASE === 'true' ? describe : describe.skip

jest.setTimeout(30_000)

/** Authenticates as the user id in the `x-test-user` header; no header means no token. */
class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const id = req.headers['x-test-user']
    if (!id) throw new UnauthorizedException()
    req.user = { id: String(id), email: 'e2e@example.com' }
    return true
  }
}

class ScriptedProvider implements DecisionProvider {
  readonly id = 'fake'
  readonly model = 'scripted'
  readonly limits = { maxImageBytes: 1_048_576, maxChoices: 64 }
  inputs: DecisionInput[] = []
  behavior: (input: DecisionInput) => Promise<DecisionOutput> = async (input) => pick(input)

  decide(input: DecisionInput): Promise<DecisionOutput> {
    this.inputs.push(input)
    return this.behavior(input)
  }
}

function pick(input: DecisionInput): DecisionOutput {
  const imageType = input.choices.imageTypes.find((choice) => choice.label === 'Vé gửi xe')
  const category = input.choices.categories.find((choice) => choice.label === 'Di chuyển')
  return {
    imageType: { ref: imageType?.ref ?? 't1', confidence: 0.93 },
    category: category ? { ref: category.ref, confidence: 0.7 } : null,
    personal: input.choices.personal[0]
      ? { ref: input.choices.personal[0].ref, confidence: 0.85 }
      : null,
    usage: { inputTokens: 300, outputTokens: 20, costMicroUsd: 45 },
  }
}

const BIGINT_MAX = '9223372036854775807'
const BIGINT_OVERFLOW = '9223372036854775808'
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2_000, 1)])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

const SENTINELS = {
  merchant: 'SENTINELMERCHANT',
  note: 'SENTINELNOTE',
  choice: 'SENTINELCHOICE',
  category: 'SENTINELCATEGORY',
  email: 'sentinelemail',
  requestId: 'sentinelrequest',
  amount: '7654321',
}

describeWithDatabase('Admin recognition (e2e, database)', () => {
  let app: INestApplication<App>
  let dataSource: DataSource
  const provider = new ScriptedProvider()
  const auth = { ...authConfig(), adminUserIds: [] as string[] }
  let admin: string
  let member: string
  let deletedAdmin: string
  let originalImageTypes: { key: string; label: string; status: string }[] = []
  let originalRules: { id: string; actions: unknown; status: string }[] = []

  const api = () => request(app.getHttpServer())
  const as = (user: string, path: string) => api().get(`/api/v1${path}`).set('x-test-user', user)

  async function createUser(prefix = 'e2e'): Promise<string> {
    const name = `${prefix}${randomUUID().slice(0, 8)}`
    const rows = await dataSource.query<{ id: string }[]>(
      `INSERT INTO users (username, email, display_name, password_hash)
       VALUES ($1, $2, $1, 'x') RETURNING id::text AS id`,
      [name, `${name}@example.com`],
    )
    return rows[0].id
  }

  async function imageType(key: string): Promise<{ version: number; label: string }> {
    const { body } = await as(admin, '/admin/recognition/catalog').expect(200)
    return body.imageTypes.find((item: { key: string }) => item.key === key)
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DECISION_PROVIDER)
      .useValue(provider)
      .overrideProvider(authConfig.KEY)
      .useValue(auth)
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile()
    app = module.createNestApplication()
    configureApplication(app)
    await app.init()
    dataSource = app.get(DataSource)
    admin = await createUser('e2eadmin')
    member = await createUser()
    deletedAdmin = await createUser('e2egone')
    auth.adminUserIds.push(admin, deletedAdmin)
    await dataSource.query('UPDATE users SET deleted_at = now() WHERE id = $1', [deletedAdmin])
    originalImageTypes = await dataSource.query(
      `SELECT key, label, status FROM decision_choices WHERE kind = 'image_type'`,
    )
    originalRules = await dataSource.query(
      `SELECT id::text, actions, status FROM expense_rules WHERE origin = 'default'`,
    )
  })

  afterAll(async () => {
    if (dataSource) {
      for (const row of originalImageTypes)
        await dataSource.query(
          `UPDATE decision_choices SET label = $2, status = $3 WHERE key = $1 AND kind = 'image_type'`,
          [row.key, row.label, row.status],
        )
      for (const row of originalRules)
        await dataSource.query(`UPDATE expense_rules SET actions = $2, status = $3 WHERE id = $1`, [
          row.id,
          JSON.stringify(row.actions),
          row.status,
        ])
      await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
        [admin, member, deletedAdmin],
      ])
    }
    await app?.close()
  })

  beforeEach(() => {
    provider.inputs = []
    provider.behavior = async (input) => pick(input)
  })

  describe('access', () => {
    const routes = [
      '/admin/me',
      '/admin/recognition/summary',
      '/admin/recognition/inferences',
      '/admin/recognition/catalog',
      '/admin/recognition/inferences/1/linked-expenses/0/photo',
    ]

    it.each(routes)('%s rejects anonymous, member, and deleted admin', async (path) => {
      await api().get(`/api/v1${path}`).expect(401)
      await as(member, path).expect(403)
      await as(deletedAdmin, path).expect(403)
    })

    it('rejects writes and the playground without credentials', async () => {
      await api()
        .patch('/api/v1/admin/recognition/image-types/receipt')
        .send({ label: 'x', version: 1 })
        .expect(401)
      await api()
        .patch('/api/v1/admin/recognition/default-rules/1')
        .send({ status: 'disabled', version: 1 })
        .expect(401)
      await api()
        .post('/api/v1/admin/recognition/playground')
        .field('locale', 'vi-VN')
        .attach('image', JPEG, 'a.jpg')
        .expect(401)
      expect(provider.inputs).toHaveLength(0)
    })

    it('rejects writes and the playground for a member', async () => {
      await api()
        .patch('/api/v1/admin/recognition/image-types/receipt')
        .set('x-test-user', member)
        .send({ label: 'x', version: 1 })
        .expect(403)
      await api()
        .post('/api/v1/admin/recognition/playground')
        .set('x-test-user', member)
        .field('locale', 'vi-VN')
        .attach('image', JPEG, 'a.jpg')
        .expect(403)
      expect(provider.inputs).toHaveLength(0)
    })

    it('confirms access for an admin', async () => {
      const { body } = await as(admin, '/admin/me').expect(200)
      expect(body).toEqual({ isAdmin: true })
    })
  })

  describe('statistics and logs', () => {
    let subject: string
    let inferenceId: string
    let skippedId: string

    beforeAll(async () => {
      subject = await createUser(SENTINELS.email)
      const [custom] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO categories (code, user_id, name, color, icon, sort_order)
         VALUES ($1, $2, $3, '#000000', 'tag', 99) RETURNING id::text AS id`,
        [`e2e_${randomUUID().slice(0, 8)}`, subject, SENTINELS.category],
      )
      const [choice] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO decision_choices (user_id, kind, label, origin)
         VALUES ($1, 'personal', $2, 'user') RETURNING id::text AS id`,
        [subject, SENTINELS.choice],
      )
      provider.behavior = async (input) => ({
        imageType: { ref: input.choices.imageTypes[0].ref, confidence: 0.9 },
        category: {
          ref: input.choices.categories.find((c) => c.label === SENTINELS.category)?.ref ?? 'c1',
          confidence: 0.8,
        },
        personal: { ref: input.choices.personal[0].ref, confidence: 0.85 },
        usage: { inputTokens: 100, outputTokens: 10, costMicroUsd: 25 },
      })
      const created = await api()
        .post('/api/v1/expense-inferences')
        .set('x-test-user', subject)
        .field('clientRequestId', `${SENTINELS.requestId}-${randomUUID()}`)
        .field('timezone', 'Asia/Ho_Chi_Minh')
        .field('locale', 'vi-VN')
        .attach('image', JPEG, 'a.jpg')
        .expect(200)
      expect(created.body.status).toBe('succeeded')
      expect(created.body.category.id).toBe(custom.id)
      expect(created.body.personalChoice.id).toBe(choice.id)
      inferenceId = created.body.id
      await dataSource.query(
        `UPDATE user_settings SET suggestions_enabled = false WHERE user_id = $1`,
        [subject],
      )
      const skipped = await api()
        .post('/api/v1/expense-inferences')
        .set('x-test-user', subject)
        .field('clientRequestId', `${SENTINELS.requestId}-${randomUUID()}`)
        .field('timezone', 'UTC')
        .field('locale', 'vi-VN')
        .attach('image', JPEG, 'a.jpg')
        .expect(200)
      expect(skipped.body.status).toBe('disabled')
      skippedId = skipped.body.id
      await api()
        .post('/api/v1/expenses')
        .set('x-test-user', subject)
        .send({
          amountMinor: SENTINELS.amount,
          currency: 'VND',
          occurredAt: new Date().toISOString(),
          occurredTimezone: 'Asia/Ho_Chi_Minh',
          idempotencyKey: randomUUID(),
          merchant: SENTINELS.merchant,
          caption: SENTINELS.note,
          categoryId: custom.id,
          inferenceId,
          personalChoiceId: choice.id,
          fieldProvenance: {
            categoryId: {
              source: 'decision_model',
              choiceId: choice.id,
              confidence: 0.8,
              outcome: 'accepted',
            },
            merchant: { source: 'ocr', outcome: 'edited' },
          },
        })
        .expect(201)
    })

    afterAll(async () => {
      await dataSource.query('DELETE FROM expenses WHERE user_id = $1', [subject])
      await dataSource.query('DELETE FROM users WHERE id = $1', [subject])
      await dataSource.query('DELETE FROM categories WHERE user_id = $1', [subject])
    })

    function expectNoSentinels(body: unknown): void {
      const text = JSON.stringify(body)
      for (const value of Object.values(SENTINELS)) expect(text).not.toContain(value)
    }

    /** The detail shows the choice labels the provider was offered, but no expense or account content. */
    function expectNoExpenseContent(body: unknown): void {
      const text = JSON.stringify(body)
      const { choice: _choice, category: _category, ...content } = SENTINELS
      for (const value of Object.values(content)) expect(text).not.toContain(value)
    }

    it('counts volume, usage, and outcomes without user content', async () => {
      const { body } = await as(admin, '/admin/recognition/summary').expect(200)
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.providerCalls).toBeGreaterThanOrEqual(1)
      expect(body.usage.costMicroUsd).toBeGreaterThanOrEqual(25)
      expect(body.byStatus.map((row: { key: string }) => row.key)).toEqual(
        expect.arrayContaining(['succeeded', 'disabled']),
      )
      expect(body.fieldOutcomes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'categoryId', outcome: 'accepted' }),
          expect.objectContaining({ field: 'merchant', outcome: 'edited' }),
        ]),
      )
      expectNoSentinels(body)
    })

    it('counts a zero-latency call as a provider call and a skipped request as none', async () => {
      // Wide window: the database clock can differ from this process's clock.
      const from = new Date(Date.now() - 3_600_000).toISOString()
      const to = new Date(Date.now() + 3_600_000).toISOString()
      await dataSource.query(
        `INSERT INTO expense_inferences (user_id, client_request_id, provider, model, status, image_bytes, latency_ms, provider_called)
         VALUES ($1, $2, 'zero-p', 'zero-m', 'succeeded', 1, 0, true),
                ($1, $3, 'zero-p', 'zero-m', 'disabled', 1, 0, false)`,
        [subject, randomUUID(), randomUUID()],
      )
      const { body } = await as(
        admin,
        `/admin/recognition/summary?provider=zero-p&model=zero-m&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ).expect(200)
      expect(body.total).toBe(2)
      expect(body.providerCalls).toBe(1)
      expect(body.latencyP50Ms).toBe(0)
    })

    it('returns zeros and null percentiles for an empty period', async () => {
      const { body } = await as(
        admin,
        '/admin/recognition/summary?from=2020-01-01T00:00:00Z&to=2020-01-02T00:00:00Z',
      ).expect(200)
      expect(body.total).toBe(0)
      expect(body.latencyP95Ms).toBeNull()
      expect(body.usage.costMicroUsd).toBe(0)
      expect(body.daily).toEqual([])
    })

    it.each([
      ['range too long', 'from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z'],
      ['reversed range', 'from=2026-06-01T00:00:00Z&to=2026-01-01T00:00:00Z'],
      ['unknown timezone', 'timezone=Mars/Olympus'],
    ])('rejects %s', async (_name, query) => {
      await as(admin, `/admin/recognition/summary?${query}`).expect(400)
    })

    it('buckets days in the requested timezone', async () => {
      const { body } = await as(
        admin,
        '/admin/recognition/summary?timezone=Asia/Ho_Chi_Minh',
      ).expect(200)
      expect(body.timezone).toBe('Asia/Ho_Chi_Minh')
      expect(body.daily.length).toBeGreaterThan(0)
    })

    it('lists de-identified records with filters and keyset pagination', async () => {
      const first = await as(
        admin,
        `/admin/recognition/inferences?userId=${subject}&limit=1&provider=fake`,
      ).expect(200)
      expect(first.body.data).toHaveLength(1)
      expect(first.body.hasMore).toBe(true)
      expect(first.body.data[0].id).toBe(skippedId)
      const second = await as(
        admin,
        `/admin/recognition/inferences?userId=${subject}&limit=1&provider=fake&cursor=${first.body.nextCursor}`,
      ).expect(200)
      const row = second.body.data[0]
      expect(row.id).toBe(inferenceId)
      expect(row.userId).toBe(subject)
      expect(row.category).toEqual({ kind: 'user', confidence: 0.8 })
      expect(row.personalChoice).toEqual({ selected: true, confidence: 0.85 })
      expect(row).not.toHaveProperty('clientRequestId')
      expectNoSentinels(first.body)
      expectNoSentinels(second.body)

      const disabled = await as(
        admin,
        `/admin/recognition/inferences?userId=${subject}&status=disabled&provider=fake`,
      ).expect(200)
      expect(disabled.body.data.map((item: { id: string }) => item.id)).toEqual([skippedId])
      await as(admin, '/admin/recognition/inferences?cursor=abc').expect(400)
      await as(admin, `/admin/recognition/inferences?cursor=${BIGINT_OVERFLOW}`).expect(400)
      await as(admin, `/admin/recognition/inferences?userId=${BIGINT_OVERFLOW}`).expect(400)
      await as(admin, `/admin/recognition/inferences/${BIGINT_OVERFLOW}`).expect(400)
      await as(admin, `/admin/recognition/inferences?cursor=${BIGINT_MAX}`).expect(200)
      await as(admin, '/admin/recognition/inferences?limit=101').expect(400)
    })

    it('returns the offered choices and the output by label in the detail', async () => {
      const { body } = await as(admin, `/admin/recognition/inferences/${inferenceId}`).expect(200)
      expect(body.input.locale).toBe('vi-VN')
      expect(body.input.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: SENTINELS.category, selected: true }),
          expect.objectContaining({ label: 'Di chuyển', selected: false }),
        ]),
      )
      expect(body.input.personal).toEqual([
        expect.objectContaining({ ref: 'p1', label: SENTINELS.choice, selected: true }),
      ])
      expect(
        body.input.imageTypes.filter((choice: { selected: boolean }) => choice.selected),
      ).toHaveLength(1)
      expect(body.output).toEqual({
        imageType: { ref: 't1', label: expect.any(String), confidence: 0.9 },
        category: {
          ref: expect.stringMatching(/^c\d+$/),
          label: SENTINELS.category,
          confidence: 0.8,
        },
        personal: { ref: 'p1', label: SENTINELS.choice, confidence: 0.85 },
      })
      // Database ids behind the refs stay out of the response.
      expect(JSON.stringify(body)).not.toContain('targetId')
      // The skipped request offered nothing and has no output.
      const skipped = await as(admin, `/admin/recognition/inferences/${skippedId}`).expect(200)
      expect(skipped.body.input).toBeNull()
      expect(skipped.body.output).toBeNull()
    })

    it('returns field outcomes in the detail without references or content', async () => {
      const { body } = await as(admin, `/admin/recognition/inferences/${inferenceId}`).expect(200)
      expect(body.usage).toEqual({ inputTokens: 100, outputTokens: 10, costMicroUsd: 25 })
      expect(body.imageBytes).toBe(JPEG.length)
      expect(body.linkedExpenses).toEqual([
        {
          hasPhoto: false,
          fields: expect.arrayContaining([
            { field: 'categoryId', source: 'decision_model', outcome: 'accepted', confidence: 0.8 },
            { field: 'merchant', source: 'ocr', outcome: 'edited', confidence: null },
          ]),
        },
      ])
      const text = JSON.stringify(body)
      expect(text).not.toContain('ruleId')
      expect(text).not.toContain('choiceId')
      expectNoExpenseContent(body)
      await as(admin, '/admin/recognition/inferences/999999999999').expect(404)
    })

    describe('linked expense photos', () => {
      const PHOTO = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(512)])
      const photoPath = (index: number | string, id = photoInferenceId) =>
        `/admin/recognition/inferences/${id}/linked-expenses/${index}/photo`
      let photoInferenceId: string
      let deletedExpenseId: string

      async function saveExpense(mediaAssetId: string | null): Promise<string> {
        const { body } = await api()
          .post('/api/v1/expenses')
          .set('x-test-user', subject)
          .send({
            amountMinor: SENTINELS.amount,
            currency: 'VND',
            occurredAt: new Date().toISOString(),
            occurredTimezone: 'UTC',
            idempotencyKey: randomUUID(),
            inferenceId: photoInferenceId,
            ...(mediaAssetId ? { mediaAssetId } : {}),
          })
          .expect(201)
        return body.id
      }

      beforeAll(async () => {
        await dataSource.query(
          `UPDATE user_settings SET suggestions_enabled = true WHERE user_id = $1`,
          [subject],
        )
        const created = await api()
          .post('/api/v1/expense-inferences')
          .set('x-test-user', subject)
          .field('clientRequestId', `${SENTINELS.requestId}-${randomUUID()}`)
          .field('timezone', 'UTC')
          .field('locale', 'vi-VN')
          .attach('image', JPEG, 'a.jpg')
          .expect(200)
        photoInferenceId = created.body.id
        const media = await api()
          .post('/api/v1/media')
          .set('x-test-user', subject)
          .send({ mimeType: 'image/jpeg', sizeBytes: PHOTO.length })
          .expect(201)
        await api()
          .put(`/api/v1/media/${media.body.id}/content`)
          .set('x-test-user', subject)
          .set('Content-Type', 'image/jpeg')
          .send(PHOTO)
          .expect(200)
        deletedExpenseId = await saveExpense(media.body.id)
        await saveExpense(media.body.id)
        await saveExpense(null)
        await dataSource.query('UPDATE expenses SET deleted_at = now() WHERE id = $1', [
          deletedExpenseId,
        ])
      })

      it('streams the saved photo of the linked expense without caching', async () => {
        const { body } = await as(
          admin,
          `/admin/recognition/inferences/${photoInferenceId}`,
        ).expect(200)
        expect(body.linkedExpenses.map((e: { hasPhoto: boolean }) => e.hasPhoto)).toEqual([
          true,
          false,
        ])
        expectNoExpenseContent(body)

        const response = await as(admin, photoPath(0)).expect(200)
        expect(response.headers['content-type']).toBe('image/jpeg')
        expect(response.headers['cache-control']).toBe('no-store')
        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(Buffer.compare(response.body, PHOTO)).toBe(0)
      })

      it('finds nothing for an expense without a photo or a position out of range', async () => {
        await as(admin, photoPath(1)).expect(404)
        await as(admin, photoPath(2)).expect(404)
        await as(admin, photoPath(-1)).expect(404)
        await as(admin, photoPath(0, '999999999999')).expect(404)
        await as(admin, photoPath('x')).expect(400)
        await as(admin, photoPath(0, 'x')).expect(400)
      })

      it('rejects a member even for their own inference', async () => {
        await as(subject, photoPath(0)).expect(403)
      })

      it('finds nothing when the stored file is missing', async () => {
        const missing = new Readable({
          read() {
            this.destroy(new Error('ENOENT'))
          },
        })
        const open = jest
          .spyOn(app.get<ObjectStorage>(OBJECT_STORAGE), 'open')
          .mockReturnValueOnce(missing)
        await as(admin, photoPath(0)).expect(404)
        open.mockRestore()
      })
    })
  })

  describe('catalog', () => {
    const patch = (path: string, body: object) =>
      api().patch(`/api/v1/admin/recognition/${path}`).set('x-test-user', admin).send(body)

    it('edits an image type and publishes it to the client snapshot and the model', async () => {
      const before = await as(member, '/suggestion-config').expect(200)
      const current = await imageType('receipt')
      const { body } = await patch('image-types/receipt', {
        label: 'Hóa đơn đã sửa',
        version: current.version,
      }).expect(200)
      expect(body.version).toBe(current.version + 1)

      const after = await as(member, '/suggestion-config').expect(200)
      expect(after.body.etag).not.toBe(before.body.etag)
      expect(
        after.body.imageTypes.find((item: { key: string }) => item.key === 'receipt').label,
      ).toBe('Hóa đơn đã sửa')
    })

    it('stops offering a disabled image type', async () => {
      const current = await imageType('product')
      await patch('image-types/product', { status: 'disabled', version: current.version }).expect(
        200,
      )
      const snapshot = await as(member, '/suggestion-config').expect(200)
      expect(snapshot.body.imageTypes.map((item: { key: string }) => item.key)).not.toContain(
        'product',
      )
      await api()
        .post('/api/v1/expense-inferences')
        .set('x-test-user', member)
        .field('clientRequestId', randomUUID())
        .field('timezone', 'UTC')
        .field('locale', 'vi-VN')
        .attach('image', JPEG, 'a.jpg')
        .expect(200)
      const labels = provider.inputs[0].choices.imageTypes.map((choice) => choice.label)
      expect(labels).not.toContain('Sản phẩm')
      const restored = await imageType('product')
      await patch('image-types/product', { status: 'enabled', version: restored.version }).expect(
        200,
      )
    })

    it('rejects invalid image type edits', async () => {
      const other = await imageType('other')
      await patch('image-types/other', { status: 'disabled', version: other.version }).expect(400)
      await patch('image-types/nope', { label: 'x', version: 1 }).expect(404)
      await patch('image-types/receipt', { version: 1 }).expect(400)
      await patch('image-types/receipt', { label: 'x' }).expect(400)
      await patch('image-types/receipt', { label: '   ', version: 1 }).expect(400)
      await patch('image-types/receipt', { label: 'x', version: 99_999 }).expect(409)
    })

    it('lets exactly one of two concurrent image type edits win', async () => {
      const current = await imageType('invoice')
      const results = await Promise.all(
        ['A', 'B'].map((suffix) =>
          patch('image-types/invoice', {
            label: `Hóa đơn ${suffix}`,
            version: current.version,
          }).then((res) => res),
        ),
      )
      expect(results.map((res) => res.status).sort()).toEqual([200, 409])
      const winner = results.find((res) => res.status === 200)
      const stored = await imageType('invoice')
      expect(stored.label).toBe(winner?.body.label)
      expect(stored.version).toBe(current.version + 1)
    })

    it('edits a default rule with an active system category only', async () => {
      const { body: catalog } = await as(admin, '/admin/recognition/catalog').expect(200)
      const rule = catalog.defaultRules[0]
      const target = catalog.categories.find((c: { id: string }) => c.id !== rule.categoryId)
      const [personal] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO categories (code, user_id, name, color, icon, sort_order)
         VALUES ($1, $2, 'Riêng', '#000000', 'tag', 99) RETURNING id::text AS id`,
        [`e2e_${randomUUID().slice(0, 8)}`, member],
      )
      await patch(`default-rules/${rule.id}`, {
        categoryId: personal.id,
        version: rule.version,
      }).expect(400)
      const { body } = await patch(`default-rules/${rule.id}`, {
        categoryId: target.id,
        version: rule.version,
      }).expect(200)
      expect(body.categoryName).toBe(target.name)

      const snapshot = await as(member, '/suggestion-config').expect(200)
      const published = snapshot.body.defaultRules.find(
        (item: { id: string }) => item.id === rule.id,
      )
      expect(published.actions).toEqual({ categoryId: target.id })
      await dataSource.query('DELETE FROM categories WHERE id = $1', [personal.id])
    })

    it('lets exactly one of two concurrent default rule edits win', async () => {
      const { body: catalog } = await as(admin, '/admin/recognition/catalog').expect(200)
      const rule = catalog.defaultRules[1]
      const results = await Promise.all(
        ['disabled', 'enabled'].map((status) =>
          patch(`default-rules/${rule.id}`, { status, version: rule.version }).then((res) => res),
        ),
      )
      expect(results.map((res) => res.status).sort()).toEqual([200, 409])
    })

    it('does not touch user rules through the default rule route', async () => {
      const [own] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO expense_rules (user_id, origin, conditions, conditions_hash, actions)
         VALUES ($1, 'user', '{"imageType":"food"}', $2, '{"merchant":"x"}') RETURNING id::text AS id`,
        [member, randomUUID().replace(/-/g, '')],
      )
      await patch(`default-rules/${own.id}`, { status: 'disabled', version: 1 }).expect(404)
      await patch(`default-rules/${BIGINT_OVERFLOW}`, { status: 'disabled', version: 1 }).expect(
        400,
      )
      await patch(`default-rules/${own.id}`, { categoryId: BIGINT_OVERFLOW, version: 1 }).expect(
        400,
      )
    })
  })

  describe('playground', () => {
    const run = (image: Buffer, name = 'a.jpg') =>
      api()
        .post('/api/v1/admin/recognition/playground')
        .set('x-test-user', admin)
        .field('locale', 'vi-VN')
        .attach('image', image, name)

    it('decides with system choices only and stores nothing', async () => {
      const [{ count: before }] = await dataSource.query<{ count: string }[]>(
        'SELECT count(*) FROM expense_inferences',
      )
      const { body } = await run(JPEG).expect(200)
      expect(body.status).toBe('succeeded')
      expect(body.imageType).toEqual({ label: 'Vé gửi xe', confidence: 0.93 })
      expect(body.category).toEqual({ label: 'Di chuyển', confidence: 0.7 })
      expect(body.categoryMeetsThreshold).toBe(true)
      expect(body.defaultRule).not.toBeNull()
      expect(body.imageBytes).toBe(JPEG.length)
      expect(provider.inputs[0].choices.personal).toEqual([])
      const [{ count: after }] = await dataSource.query<{ count: string }[]>(
        'SELECT count(*) FROM expense_inferences',
      )
      expect(after).toBe(before)
    })

    it('reports provider failures as unavailable', async () => {
      provider.behavior = () => Promise.reject(new Error('boom'))
      const { body } = await run(JPEG).expect(200)
      expect(body.status).toBe('unavailable')
      expect(body.reason).toBe('provider_error')
    })

    it('validates the upload', async () => {
      await run(PNG, 'a.png').expect(415)
      await run(Buffer.alloc(1_100_000, 1)).expect(413)
      await api()
        .post('/api/v1/admin/recognition/playground')
        .set('x-test-user', admin)
        .field('locale', 'vi-VN')
        .expect(400)
      await api()
        .post('/api/v1/admin/recognition/playground')
        .set('x-test-user', admin)
        .field('locale', '!')
        .attach('image', JPEG, 'a.jpg')
        .expect(400)
    })

    it('limits requests per admin per minute', async () => {
      const results: number[] = []
      for (let index = 0; index < 22; index += 1) results.push((await run(JPEG)).status)
      expect(results).toContain(429)
      expect(results.at(-1)).toBe(429)
    })
  })
})
