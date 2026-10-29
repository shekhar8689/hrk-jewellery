import { test, expect } from 'vitest'
import { checkUtr } from './utr'

test.each([
  ['412345678901', '412345678901'],
  ['4123 4567 8901', '412345678901'],
  [' 412345678901 ', '412345678901'],
  ['UTR: 412345678901', '412345678901'],
])('accepts %p as %p', (typed, utr) => {
  expect(checkUtr(typed)).toEqual({ utr })
})

test("PhonePe's own Transaction ID (starts with T) gets a clear hint", () => {
  expect(checkUtr('T2410301234567890123456').error).toMatch(/PhonePe.*UTR/i)
})

test("Google Pay's own transaction ID (letters) gets a clear hint", () => {
  expect(checkUtr('CICAgOCx9oXbZA').error).toMatch(/12-digit/i)
})

test.each(['', '12345', '4123456789012345'])('wrong length %p says it has 12 digits', (typed) => {
  expect(checkUtr(typed).error).toMatch(/12 digits/)
})
