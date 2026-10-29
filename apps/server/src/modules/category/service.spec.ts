import type { DataSource, Repository } from 'typeorm'
import type { CategoryEntity } from './entities/category.entity'
import { CategoryService } from './service'

describe('CategoryService', () => {
  it('maps account usage and ownership from the ranked category query', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          id: '10',
          code: 'custom-cafe',
          name: 'Cà phê',
          color: '#F4B89C',
          icon: 'coffee',
          sort_order: 1010,
          user_id: '7',
          usage_count: '12',
        },
        {
          id: '1',
          code: 'food',
          name: 'Ăn uống',
          color: '#FF8A65',
          icon: 'coffee',
          sort_order: 10,
          user_id: null,
          usage_count: '3',
        },
      ]),
    }
    const service = new CategoryService(
      {} as Repository<CategoryEntity>,
      dataSource as unknown as DataSource,
    )

    await expect(service.list('7')).resolves.toEqual([
      expect.objectContaining({ id: '10', usageCount: 12, isCustom: true }),
      expect.objectContaining({ id: '1', usageCount: 3, isCustom: false }),
    ])
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY count(e.id) DESC'),
      ['7'],
    )
  })

  it('scopes category resolution to global categories and categories owned by the account', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    }
    const categories = { createQueryBuilder: jest.fn().mockReturnValue(query) }
    const service = new CategoryService(
      categories as unknown as Repository<CategoryEntity>,
      {} as DataSource,
    )

    await expect(service.resolve('7', '22')).rejects.toThrow('Category not found')
    expect(query.andWhere).toHaveBeenCalledWith(
      '(category.userId IS NULL OR category.userId = :userId)',
      { userId: '7' },
    )
  })

  it('creates a normalized custom category after the account custom sort range', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sortOrder: 1040 }),
    }
    const categories = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: '22', ...value })),
    }
    const service = new CategoryService(
      categories as unknown as Repository<CategoryEntity>,
      {} as DataSource,
    )

    await expect(
      service.create('7', { name: '  Cà phê  ', color: '#f4b89c', icon: 'coffee' }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: '22',
        name: 'Cà phê',
        color: '#F4B89C',
        icon: 'coffee',
        sortOrder: 1050,
        usageCount: 0,
        isCustom: true,
      }),
    )
    expect(categories.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '7', active: true }),
    )
  })

  it('does not archive a custom category that is still used by an expense', async () => {
    const categories = {
      findOneBy: jest.fn().mockResolvedValue({ id: '22', userId: '7', active: true }),
      save: jest.fn(),
    }
    const dataSource = { query: jest.fn().mockResolvedValue([{ count: '1' }]) }
    const service = new CategoryService(
      categories as unknown as Repository<CategoryEntity>,
      dataSource as unknown as DataSource,
    )

    await expect(service.remove('7', '22')).rejects.toThrow('Category is currently in use')
    expect(categories.save).not.toHaveBeenCalled()
  })
})
