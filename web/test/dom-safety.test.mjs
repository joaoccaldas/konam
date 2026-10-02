import test from 'node:test';
import assert from 'node:assert/strict';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]));

test('hostile metadata escapes into inert text', () => {
  const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script>&';
  const out = esc(payload);
  assert.equal(out.includes('<script>'), false);
  assert.equal(out.includes('onerror="'), false);
  assert.match(out, /&lt;img/);
  assert.match(out, /&amp;/);
});

test('quotes are escaped for attribute contexts', () => {
  const out = esc('" onmouseover="boom');
  assert.equal(out.includes('" onmouseover="'), false);
  assert.match(out, /&quot;/);
});
