import { test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { RETURN_REPORT_WINDOW } from '../config/policy'

const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? files(path.join(dir, d.name)) : /\.jsx?$/.test(d.name) && !/\.test\./.test(d.name) ? [path.join(dir, d.name)] : [])
const src = files(path.resolve(__dirname, '..'))

test('no page promises 30-day returns or exchanges any more', () => {
  const offenders = src.filter(f => /30[- ]?day|30 days|exchange policy|No questions asked/i.test(fs.readFileSync(f, 'utf8')))
  expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
})

test('the return window is set in one place and used on the policy and FAQ pages', () => {
  expect(RETURN_REPORT_WINDOW).toBeTruthy()
  for (const f of ['pages/ReturnPolicy.jsx', 'pages/FAQ.jsx']) {
    expect(fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8')).toMatch(/RETURN_REPORT_WINDOW/)
  }
})
