import { detectImage } from './service'
describe('detectImage', () => {
  it('reads PNG dimensions from verified content', () => {
    const data = Buffer.alloc(24)
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(data)
    data.writeUInt32BE(320, 16)
    data.writeUInt32BE(240, 20)
    expect(detectImage(data)).toEqual({ mimeType: 'image/png', width: 320, height: 240 })
  })
  it('rejects arbitrary content', () => expect(detectImage(Buffer.from('not an image'))).toBeNull())
})
