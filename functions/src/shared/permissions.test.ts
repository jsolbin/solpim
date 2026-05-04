import test from 'node:test'
import assert from 'node:assert/strict'

import { hasRequiredRole } from './permissions'

test('distinguishes student from admin permissions', () => {
  assert.equal(hasRequiredRole('student', ['student']), true)
  assert.equal(hasRequiredRole('student', ['admin']), false)
  assert.equal(hasRequiredRole('admin', ['admin']), true)
})
