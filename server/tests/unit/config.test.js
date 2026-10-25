const { checkConfig, trustProxySetting } = require('../../utils/config')

describe('checkConfig (runs when the server starts)', () => {
  const strong = 'k3J9xQ2mV8pL5sR1tY7wZ4nB6cD0fG2hJ8kL3mN5pQ7r'
  test.each(['', 'secret', 'test-secret-123', 'changeme', 'your_jwt_secret_here', 'a'.repeat(31)])(
    'refuses JWT_SECRET %p in production', (s) => {
      expect(() => checkConfig({ NODE_ENV: 'production', JWT_SECRET: s })).toThrow(/JWT_SECRET/)
    })
  test('accepts a long random secret', () => {
    expect(() => checkConfig({ NODE_ENV: 'production', JWT_SECRET: strong })).not.toThrow()
  })
  test('Render counts as production even without NODE_ENV', () => {
    expect(() => checkConfig({ RENDER: 'true', JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/)
  })
  test('only warns (does not stop) during local development', () => {
    expect(() => checkConfig({ NODE_ENV: 'development', JWT_SECRET: 'dev' })).not.toThrow()
  })
})

describe('trustProxySetting', () => {
  test('on Render, trust the one Render proxy', () => expect(trustProxySetting({ RENDER: 'true' })).toBe(1))
  test('elsewhere, do not trust X-Forwarded-For unless told to', () => expect(trustProxySetting({})).toBe(false))
  test('TRUST_PROXY can set it explicitly', () => {
    expect(trustProxySetting({ TRUST_PROXY: '2' })).toBe(2)
    expect(trustProxySetting({ TRUST_PROXY: 'false', RENDER: 'true' })).toBe(false)
  })
})
