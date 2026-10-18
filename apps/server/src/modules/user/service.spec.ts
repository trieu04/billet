import type { DataSource, Repository } from 'typeorm'
import { Appearance, type UserSettingsEntity } from './entities/user-settings.entity'
import type { UserEntity } from './entities/user.entity'
import { UsersService } from './service'

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
    )

    await expect(service.updateSettings('1', { appearance: Appearance.Light })).resolves.toEqual({
      id: '7',
      defaultCurrency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      locale: 'vi',
      appearance: Appearance.Light,
      reminderEnabled: true,
      reminderTime: '20:00',
    })
    expect(settings.findOneBy).toHaveBeenCalledTimes(2)
  })
})
