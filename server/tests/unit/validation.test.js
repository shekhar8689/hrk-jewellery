const { validateAddress } = require('../../utils/validation')

const good = { name: 'Riya Shah', phone: '9876543210', street: '12 MG Road, Andheri', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' }

test('a correct Indian address passes', () => {
  expect(validateAddress(good)).toBeNull()
  expect(validateAddress({ ...good, name: "D'Souza-Rao", city: 'Navi Mumbai', state: 'Jammu & Kashmir'.replace('&', 'and') })).toBeNull()
})

test.each([
  ['no address at all', undefined, /name/i],
  ['one-letter name', { name: 'R' }, /name/i],
  ['name with numbers', { name: 'Riya 123' }, /letters/],
  ['phone with 9 digits', { phone: '987654321' }, /10-digit/],
  ['phone starting with 5', { phone: '5876543210' }, /10-digit/],
  ['phone with +91', { phone: '+919876543210' }, /10-digit/],
  ['short street', { street: '12' }, /Street/],
  ['city with digits', { city: 'Mumbai 1' }, /City/],
  ['missing state', { state: '' }, /State/],
  ['pincode starting with 0', { pincode: '012345' }, /Pincode/],
  ['5-digit pincode', { pincode: '40005' }, /Pincode/],
])('rejects %s', (_n, change, msg) => {
  expect(validateAddress(change === undefined ? undefined : { ...good, ...change })).toMatch(msg)
})

test.each([
  ['phone', { $gt: '' }],
  ['name', ['Riya', 'Shah']],
  ['pincode', 400053],
])('rejects a non-text %s instead of crashing', (field, value) => {
  expect(() => validateAddress({ ...good, [field]: value })).not.toThrow()
  expect(validateAddress({ ...good, [field]: value })).toEqual(expect.any(String))
})
