import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHtmlEmbed } from './html';

test('the html embed has one numbered line per output line, no phantom last line, and escapes markup', () => {
  const html = renderHtmlEmbed([{ text: 'one\n<b>two</b> &amp;\n', delayMs: 0 }], { watermark: false });
  assert.equal((html.match(/class="ln"/g) || []).length, 2);
  assert.match(html, /&lt;b&gt;two&lt;\/b&gt;/);
  assert.match(html, /class="termcast-title"/);
});

test('command output cannot break out of the inline script (</script> injection)', () => {
  const evil = 'x</script><img src=x onerror=alert(1)>\u2028y';
  const html = renderHtmlEmbed([{ text: evil, delayMs: 0 }], { watermark: false });
  const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>') + 9);
  assert.equal((script.match(/<\/script>/g) || []).length, 1, 'only the real closing tag');
  assert.doesNotMatch(script, /<img/);
  assert.doesNotMatch(html.replace(script, ''), /<img src=x/, 'the visible copy is escaped too');
  const raw = /const raw = (".*");/.exec(script);
  assert.ok(raw, 'the raw text is still a JSON string');
  assert.equal(JSON.parse(raw![1]), evil, 'the copy button still gets the exact text');
});

test('the copy button copies the plain text without colour codes', () => {
  const html = renderHtmlEmbed([{ text: '\x1b[32mgreen\x1b[0m text', delayMs: 0 }], { watermark: false });
  assert.match(html, /green text/);
  assert.doesNotMatch(html, /\\x1b|\u001b/);
});
