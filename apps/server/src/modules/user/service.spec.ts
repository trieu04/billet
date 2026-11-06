import type { DataSource, Repository } from 'typeorm'
import { Appearance, type UserSettingsEntity } from './entities/user-settings.entity'
import type { UserEntity } from './entities/user.entity'
import { JwtService } from '@nestjs/jwt'
import { BadRequestException } from '@nestjs/common'
import { UsersService } from './service'

const storage = { put: jest.fn(), open: jest.fn(), delete: jest.fn() }
const jwt = new JwtService({ secret: 'test-secret-that-is-long-enough' }) as JwtService

describe('UsersService authentication', () => {
  it.each([
    [' Ntdm11 ', 'ntdm11'],
    [' TRIEU@EXAMPLE.COM ', 'trieu@example.com'],
    [' +84901234567 ', '+84901234567'],
  ])('looks up %s across every login identifier field', async (identifier, normalized) => {
    const users = { findOne: jest.fn().mockResolvedValue(null) }
    const service = new UsersService(
      users as unknown as Repository<UserEntity>,
      {} as Repository<UserSettingsEntity>,
      {} as DataSource,
      storage,
      jwt,
    )

    await service.findByLoginIdentifierWithPassword(identifier)

    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ username: normalized }, { email: normalized }, { phoneNumber: normalized }],
        select: expect.objectContaining({ passwordHash: true }),
      }),
    )
  })
})

describe('UsersService settings', () => {
  it('reloads and returns the complete settings after a partial update', async () => {
    const persisted = {
      id: '7',
      userId: '1',
      defaultCurrency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      appearance: Appearance.System,
      reminderEnabled: true,
      reminderTime: '20:00:00',
      suggestionsEnabled: true,
      ruleLearningEnabled: true,
      suggestionLocationEnabled: false,
    } as UserSettingsEntity
    const settings = {
      findOneBy: jest.fn().mockResolvedValue(persisted),
      save: jest.fn().mockImplementation(async (value: UserSettingsEntity) => {
        value.appearance = Appearance.Light
        return { ...value, reminderTime: null }
      }),
      create: jest.fn(),
    }
    const service = new UsersService(
      {} as Repository<UserEntity>,
      settings as unknown as Repository<UserSettingsEntity>,
      {} as DataSource,
      storage,
      jwt,
    )

    await expect(service.updateSettings('1', { appearance: Appearance.Light })).resolves.toEqual({
      id: '7',
      defaultCurrency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      appearance: Appearance.Light,
      reminderEnabled: true,
      reminderTime: '20:00',
      suggestionsEnabled: true,
      ruleLearningEnabled: true,
      suggestionLocationEnabled: false,
    })
    expect(settings.findOneBy).toHaveBeenCalledTimes(2)
  })

  it('clears a stored reminder time when reminders are disabled', async () => {
    const persisted = {
      id: '7',
      userId: '1',
      defaultCurrency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      appearance: Appearance.System,
      reminderEnabled: true,
      reminderTime: '20:00:00',
      suggestionsEnabled: true,
      ruleLearningEnabled: true,
      suggestionLocationEnabled: false,
    } as UserSettingsEntity
    const settings = {
      findOneBy: jest.fn().mockResolvedValue(persisted),
      save: jest.fn().mockResolvedValue(persisted),
      create: jest.fn(),
    }
    const service = new UsersService(
      {} as Repository<UserEntity>,
      settings as unknown as Repository<UserSettingsEntity>,
      {} as DataSource,
      storage,
      jwt,
    )

    await service.updateSettings('1', { reminderEnabled: false })

    expect(settings.save).toHaveBeenCalledWith(
      expect.objectContaining({ reminderEnabled: false, reminderTime: null }),
    )
  })

  it('updates and returns the photo suggestion settings', async () => {
    const persisted = {
      id: '7',
      userId: '1',
      defaultCurrency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      appearance: Appearance.System,
      reminderEnabled: false,
      reminderTime: null,
      suggestionsEnabled: true,
      ruleLearningEnabled: true,
      suggestionLocationEnabled: false,
    } as UserSettingsEntity
    const settings = {
      findOneBy: jest.fn().mockResolvedValue(persisted),
      save: jest.fn().mockImplementation(async (value: UserSettingsEntity) => value),
      create: jest.fn(),
    }
    const service = new UsersService(
      {} as Repository<UserEntity>,
      settings as unknown as Repository<UserSettingsEntity>,
      {} as DataSource,
      storage,
      jwt,
    )

    const result = await service.updateSettings('1', {
      suggestionsEnabled: false,
      ruleLearningEnabled: false,
      suggestionLocationEnabled: true,
    })

    expect(result).toMatchObject({
      suggestionsEnabled: false,
      ruleLearningEnabled: false,
      suggestionLocationEnabled: true,
    })
  })
})

describe('UsersService account deletion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes the account and removes persisted media and exports', async () => {
    const users = { delete: jest.fn().mockResolvedValue({ affected: 1 }) }
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          { storage_key: '1/photo', thumbnail_key: '1/thumb' },
          { storage_key: '1/receipt', thumbnail_key: null },
        ])
        .mockResolvedValueOnce([{ storage_key: '1/export.csv' }]),
    }
    storage.delete.mockResolvedValue(undefined)
    const service = new UsersService(
      users as unknown as Repository<UserEntity>,
      {} as Repository<UserSettingsEntity>,
      dataSource as unknown as DataSource,
      storage,
      jwt,
    )

    const { confirmationCode } = await service.requestAccountDeletion('1')
    expect(users.delete).not.toHaveBeenCalled()
    await service.deleteAccount('1', confirmationCode)

    expect(users.delete).toHaveBeenCalledWith('1')
    expect(storage.delete.mock.calls.map(([key]) => key)).toEqual([
      'media/1/photo',
      'media/1/thumb',
      'media/1/receipt',
      'exports/1/export.csv',
    ])
  })

  it.each([
    ['garbage', async () => 'not-a-token'],
    ['an access token', async () => jwt.signAsync({ sub: '1', purpose: 'access' })],
    [
      "another user's code",
      async () => jwt.signAsync({ sub: '2', purpose: 'account-deletion' }, { expiresIn: 60 }),
    ],
    [
      'an expired code',
      async () => jwt.signAsync({ sub: '1', purpose: 'account-deletion' }, { expiresIn: -10 }),
    ],
  ])('rejects %s without deleting anything', async (_label, makeCode) => {
    const users = { delete: jest.fn() }
    const dataSource = { query: jest.fn() }
    const service = new UsersService(
      users as unknown as Repository<UserEntity>,
      {} as Repository<UserSettingsEntity>,
      dataSource as unknown as DataSource,
      storage,
      jwt,
    )

    await expect(service.deleteAccount('1', await makeCode())).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(users.delete).not.toHaveBeenCalled()
    expect(dataSource.query).not.toHaveBeenCalled()
    expect(storage.delete).not.toHaveBeenCalled()
  })
})
