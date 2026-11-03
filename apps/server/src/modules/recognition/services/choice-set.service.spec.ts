import type { Repository } from 'typeorm'
import type { CategoryService } from '../../category/service'
import type { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { ChoiceSetService } from './choice-set.service'

function setup() {
  const imageType = {
    id: '1',
    kind: 'image_type',
    key: 'parking_ticket',
    label: 'Vé gửi xe',
    description: null,
  }
  const personal = {
    id: '50',
    kind: 'personal',
    label: 'Gửi xe – Tòa A',
    description: null,
    placeKey: 'w3gvk1c',
    lastSelectedAt: null,
  }
  const choices = {
    find: jest.fn(async ({ where }: { where: { kind: string } }) =>
      where.kind === 'image_type' ? [imageType] : [personal],
    ),
  }
  let stamp = '8:a'
  const categories = {
    catalogStamp: jest.fn(async () => stamp),
    listChoices: jest.fn(async () => [{ id: '2', name: 'Di chuyển' }]),
  }
  const service = new ChoiceSetService(
    choices as unknown as Repository<DecisionChoiceEntity>,
    categories as unknown as CategoryService,
  )
  return { service, choices, categories, setStamp: (value: string) => (stamp = value) }
}

describe('ChoiceSetService', () => {
  it('builds the choice set and serves repeat requests from the cache', async () => {
    const { service, choices, categories } = setup()

    const first = await service.build('7', 'w3gvk1c', 64)
    const second = await service.build('7', 'w3gvk1c', 64)

    expect(first.choices.personal).toEqual([{ ref: 'p1', label: 'Gửi xe – Tòa A' }])
    expect(second.version).toBe(first.version)
    expect(categories.listChoices).toHaveBeenCalledTimes(1)
    // One image type query and one personal query; the stamp is checked every time.
    expect(choices.find).toHaveBeenCalledTimes(2)
    expect(categories.catalogStamp).toHaveBeenCalledTimes(2)
  })

  it('reloads categories when the catalog stamp changes and personal choices on invalidate', async () => {
    const { service, choices, categories, setStamp } = setup()
    await service.build('7', null, 64)

    setStamp('9:b')
    await service.build('7', null, 64)
    expect(categories.listChoices).toHaveBeenCalledTimes(2)
    expect(choices.find).toHaveBeenCalledTimes(2)

    service.invalidate('7')
    await service.build('7', null, 64)
    expect(choices.find).toHaveBeenCalledTimes(3)
  })
})
