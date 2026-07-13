import { test } from 'node:test';
import assert from 'node:assert';
import { decodeJwt } from '../auth-helpers';

test('decodeJwt decodes a valid JWT token', () => {
  // Header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
  // Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022} -> eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.some-sig';

  const decoded = decodeJwt(token);
  assert.deepStrictEqual(decoded, {
    sub: '1234567890',
    name: 'John Doe',
    iat: 1516239022,
  });
});

test('decodeJwt returns null for invalid JWT tokens', () => {
  assert.strictEqual(decodeJwt('invalid-token'), null);
  assert.strictEqual(decodeJwt(''), null);
  assert.strictEqual(decodeJwt('part1.part2'), null);
});

test('decodeJwt handles UTF-8 correctly', () => {
  // Payload: {"sub":"123","name":"Khách háng"} -> eyJzdWIiOiIxMjMiLCJuYW1lIjoiS2jDoWNoIGjDoW5nIn0
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiS2jDoWNoIGjDoW5nIn0.sig';
  const decoded = decodeJwt(token);
  assert.deepStrictEqual(decoded, {
    sub: '123',
    name: 'Khách háng',
  });
});
