import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHtmlEmbed } from './html';

test('the html embed has one numbered line per output line, no phantom last line, and escapes markup', () => {
  const html = renderHtmlEmbed([{ text: 'one\n<b>two</b> &amp;\n', delayMs: 0 }], { watermark: false });
  assert.equal((html.match(/class="ln"/g) || []).length, 2);
  assert.match(html, /&lt;b&gt;two&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>two/);
  assert.match(html, /class="termcast-title"/);
});

test('the copy button copies the plain text without colour codes', () => {
  const html = renderHtmlEmbed([{ text: '\x1b[32mgreen\x1b[0m text', delayMs: 0 }], { watermark: false });
  assert.match(html, /green text/);
  assert.doesNotMatch(html, /\\x1b|\u001b/);
});
