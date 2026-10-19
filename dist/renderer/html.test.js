"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const html_1 = require("./html");
(0, node_test_1.test)('the html embed has one numbered line per output line, no phantom last line, and escapes markup', () => {
    const html = (0, html_1.renderHtmlEmbed)([{ text: 'one\n<b>two</b> &amp;\n', delayMs: 0 }], { watermark: false });
    strict_1.default.equal((html.match(/class="ln"/g) || []).length, 2);
    strict_1.default.match(html, /&lt;b&gt;two&lt;\/b&gt;/);
    strict_1.default.match(html, /class="ttyreel-title"/);
});
(0, node_test_1.test)('command output cannot break out of the inline script (</script> injection)', () => {
    const evil = 'x</script><img src=x onerror=alert(1)>\u2028y';
    const html = (0, html_1.renderHtmlEmbed)([{ text: evil, delayMs: 0 }], { watermark: false });
    const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>') + 9);
    strict_1.default.equal((script.match(/<\/script>/g) || []).length, 1, 'only the real closing tag');
    strict_1.default.doesNotMatch(script, /<img/);
    strict_1.default.doesNotMatch(html.replace(script, ''), /<img src=x/, 'the visible copy is escaped too');
    const raw = /const raw = (".*");/.exec(script);
    strict_1.default.ok(raw, 'the raw text is still a JSON string');
    strict_1.default.equal(JSON.parse(raw[1]), evil, 'the copy button still gets the exact text');
});
(0, node_test_1.test)('the copy button copies the plain text without colour codes', () => {
    const html = (0, html_1.renderHtmlEmbed)([{ text: '\x1b[32mgreen\x1b[0m text', delayMs: 0 }], { watermark: false });
    strict_1.default.match(html, /green text/);
    strict_1.default.doesNotMatch(html, /\\x1b|\u001b/);
});
