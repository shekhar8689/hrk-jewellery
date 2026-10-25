import { test, expect } from 'vitest'
import { autoPick, missingChoice } from './options'

test('autoPick chooses only when there is a single option', () => {
  expect(autoPick(['Gold'])).toBe('Gold')
  expect(autoPick(['6', '7', '8'])).toBe('')
  expect(autoPick([])).toBe('')
  expect(autoPick(undefined)).toBe('')
  expect(autoPick(['One Size'])).toBe('One Size')
})

test('missingChoice names what the customer still has to pick', () => {
  const ring = { sizes: ['6', '7'], colors: ['Gold', 'Rose Gold'] }
  expect(missingChoice(ring, '', '')).toBe('size and colour')
  expect(missingChoice(ring, '7', '')).toBe('colour')
  expect(missingChoice(ring, '', 'Gold')).toBe('size')
  expect(missingChoice(ring, '7', 'Gold')).toBe('')
  expect(missingChoice({ sizes: ['One Size'], colors: [] }, 'One Size', '')).toBe('')
  expect(missingChoice({}, '', '')).toBe('')
})
