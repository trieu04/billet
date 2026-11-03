import path from 'node:path'
import { buildChoiceSet, parseDataset } from './dataset'

const root = path.resolve('/data/bench')

interface Fixture {
  locale?: string
  choices: {
    imageTypes: { key?: string; label: string; description?: string }[]
    categories: { label: string }[]
    personal?: { label: string }[]
  }
  images: { file: string; imageType: string; category?: string | null; personal?: string }[]
}

function valid(): Fixture {
  return {
    locale: 'en',
    choices: {
      imageTypes: [
        { key: 'receipt', label: 'Receipt', description: 'Printed bill' },
        { key: 'food', label: 'Food' },
      ],
      categories: [{ label: 'Eating out' }, { label: 'Transport' }],
      personal: [{ label: 'Parking' }],
    },
    images: [
      { file: 'a.jpg', imageType: 'receipt', category: 'Eating out', personal: 'Parking' },
      { file: 'sub/b.jpg', imageType: 'food', category: null },
    ],
  }
}

describe('parseDataset', () => {
  it('parses and resolves image paths', () => {
    const dataset = parseDataset(valid(), root)
    expect(dataset.locale).toBe('en')
    expect(dataset.images).toEqual([
      {
        file: path.join(root, 'a.jpg'),
        imageType: 'receipt',
        category: 'Eating out',
        personal: 'Parking',
      },
      { file: path.join(root, 'sub/b.jpg'), imageType: 'food', category: null, personal: null },
    ])
  })

  it('defaults locale and optional choice lists', () => {
    const json = valid()
    delete json.locale
    delete json.choices.personal
    json.images.shift()
    const dataset = parseDataset(json, root)
    expect(dataset.locale).toBe('vi')
    expect(dataset.personal).toEqual([])
  })

  it.each([
    ['unknown image type', (json: Fixture) => (json.images[0].imageType = 'x')],
    ['unknown category', (json: Fixture) => (json.images[0].category = 'x')],
    ['unknown personal', (json: Fixture) => (json.images[0].personal = 'x')],
    ['path traversal', (json: Fixture) => (json.images[0].file = '../secret.jpg')],
    ['absolute path', (json: Fixture) => (json.images[0].file = '/etc/passwd')],
    ['no images', (json: Fixture) => (json.images = [])],
    ['image type without key', (json: Fixture) => delete json.choices.imageTypes[0].key],
    ['duplicate key', (json: Fixture) => (json.choices.imageTypes[1].key = 'receipt')],
    ['duplicate category', (json: Fixture) => (json.choices.categories[1].label = 'Eating out')],
    ['empty image types', (json: Fixture) => (json.choices.imageTypes = [])],
  ])('rejects %s', (_name, mutate) => {
    const json = valid()
    mutate(json)
    expect(() => parseDataset(json, root)).toThrow('Invalid labels.json')
  })
})

describe('buildChoiceSet', () => {
  it('assigns short refs and keeps the reverse mapping', () => {
    const set = buildChoiceSet(parseDataset(valid(), root))
    expect(set.choices.imageTypes).toEqual([
      { ref: 't1', label: 'Receipt', description: 'Printed bill' },
      { ref: 't2', label: 'Food' },
    ])
    expect(set.choices.categories.map((choice) => choice.ref)).toEqual(['c1', 'c2'])
    expect(set.choices.personal).toEqual([{ ref: 'p1', label: 'Parking' }])
    expect(set.imageTypeByRef.get('t2')).toBe('food')
    expect(set.categoryByRef.get('c2')).toBe('Transport')
    expect(set.personalByRef.get('p1')).toBe('Parking')
  })
})
