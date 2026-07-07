const { test } = require('node:test');
const assert = require('node:assert');
const { decodeJwt } = require('./auth-helpers');

test('decodeJwt decodes a valid JWT token', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.some-sig';
  const decoded = decodeJwt(token);
  assert.deepStrictEqual(decoded, {
    sub: '1234567890',
    name: 'John Doe',
    iat: 1516239022
  });
});

test('decodeJwt returns null for invalid JWT tokens', () => {
  assert.strictEqual(decodeJwt('invalid-token'), null);
  assert.strictEqual(decodeJwt(''), null);
  assert.strictEqual(decodeJwt('part1.part2'), null);
  assert.strictEqual(decodeJwt(null), null);
  assert.strictEqual(decodeJwt(undefined), null);
});

test('decodeJwt handles UTF-8 correctly', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiS2jDoWNoIGjDoW5nIn0.sig';
  const decoded = decodeJwt(token);
  assert.deepStrictEqual(decoded, {
    sub: '123',
    name: 'Khách háng'
  });
});

// ADVERSARIAL TESTS

test('decodeJwt handles malformed base64 without throwing', () => {
  // Payload has invalid base64 characters (e.g. @#$%^&)
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjo@#$%^&.sig';
  const decoded = decodeJwt(token);
  assert.strictEqual(decoded, null);
});

test('decodeJwt handles malformed JSON without throwing', () => {
  // Payload decodes to invalid JSON: {"sub": 123
  // Base64 of {"sub": 123 is eyJzdWIiOiAxMjM
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiAxMjM.sig';
  const decoded = decodeJwt(token);
  assert.strictEqual(decoded, null);
});

test('decodeJwt handles malformed URI percent-encoding without throwing', () => {
  // When payload bytes are decoded, if they map to invalid percent encoding like %zz
  // Custom base64Decode might generate raw characters that map to bad URI sequence.
  // Let's craft a token payload that is base64 of '%ff%ff' (invalid UTF-8 bytes)
  // base64: //8=
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.Ly84.sig';
  const decoded = decodeJwt(token);
  assert.strictEqual(decoded, null);
});

test('decodeJwt handles valid JSON that is not an object without throwing', () => {
  // JSON parsed payload is a number or string
  // Payload: "hello" -> In base64: ImhlbGxvIg==
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ImhlbGxvIg.sig';
  const decoded = decodeJwt(token);
  assert.strictEqual(decoded, 'hello'); // JSON.parse("hello") will successfully return "hello"
});

test('decodeJwt decodes expired token payload (expiration check is AuthContext responsibility)', () => {
  // Payload: {"sub":"123","exp":1000} (expired in 1970)
  // Base64 of {"sub":"123","exp":1000} is eyJzdWIiOiIxMjMiLCJleHAiOjEwMDB9
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjEwMDB9.sig';
  const decoded = decodeJwt(token);
  assert.deepStrictEqual(decoded, {
    sub: '123',
    exp: 1000
  });
});
