import type { Repository } from 'typeorm'
import { PushDeviceEntity, PushPlatform } from '../entities/push-device.entity'
import { PushNotificationsService } from './push.service'

describe('PushNotificationsService', () => {
  const devices = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: '7', ...value })),
    update: jest.fn(),
  }
  const service = new PushNotificationsService(devices as unknown as Repository<PushDeviceEntity>, {
    enabled: false,
    serviceAccountFile: '',
  })

  beforeEach(() => jest.clearAllMocks())

  it('registers a normalized token for the current user', async () => {
    devices.findOneBy.mockResolvedValue(null)
    await expect(service.register('1', ' token ', PushPlatform.Android)).resolves.toEqual({
      id: '7',
      platform: PushPlatform.Android,
      active: true,
    })
    expect(devices.findOneBy).toHaveBeenCalledWith({ token: 'token' })
  })

  it('only deactivates a token owned by the current user', async () => {
    await service.unregister('1', ' token ')
    expect(devices.update).toHaveBeenCalledWith(
      { userId: '1', token: 'token', active: true },
      { active: false },
    )
  })
})
