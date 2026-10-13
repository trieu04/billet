import { HealthService } from './health.service'

describe('HealthService', () => {
  it('reports a healthy service', () => {
    expect(new HealthService().check()).toMatchObject({
      status: 'ok',
      service: 'billet-server',
    })
  })
})
