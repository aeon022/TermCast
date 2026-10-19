"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECRET_PATTERNS = exports.MASK = void 0;
exports.findSecretRanges = findSecretRanges;
exports.redactString = redactString;
exports.redactFrames = redactFrames;
exports.redactAnsiText = redactAnsiText;
exports.MASK = '•';
exports.SECRET_PATTERNS = [
    { name: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/g },
    { name: 'API key (sk-…)', re: /\bsk-(?:ant-|proj-|or-)?[A-Za-z0-9_-]{20,}\b/g },
    { name: 'AWS access key', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
    { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
    { name: 'Stripe key', re: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
    { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
    { name: 'Polar token', re: /\bpolar_(?:oat|pat)_[A-Za-z0-9]{20,}\b/g },
    { name: 'licence key', re: /\b[A-Za-z0-9]{2,16}(?:-[A-Za-z0-9]{2,16})?-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\b/g },
    { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
    { name: 'Bearer token', re: /\bBearer\s+([A-Za-z0-9._~+/=-]{16,})/g, group: 1 },
    { name: 'password in URL', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:([^\s@/]+)@/g, group: 1 },
    {
        name: 'secret assignment',
        re: /\b(?:[A-Za-z0-9_-]*(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)[A-Za-z0-9_-]*)\s*[=:]\s*["']?([^\s"']{6,})/gi,
        group: 1
    }
];
const PRIVATE_KEY_BEGIN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const PRIVATE_KEY_END = /-----END [A-Z ]*PRIVATE KEY-----/;
/** Start/end offsets (end exclusive) of everything to mask in one line of plain text. */
function findSecretRanges(plain, options = {}) {
    const ranges = [];
    const add = (re, group) => {
        const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
        let m;
        while ((m = g.exec(plain)) !== null) {
            if (m[0] === '') {
                g.lastIndex++;
                continue;
            }
            const text = group > 0 ? m[group] : m[0];
            if (!text)
                continue;
            const start = group > 0 ? m.index + m[0].lastIndexOf(text) : m.index;
            ranges.push([start, start + text.length]);
        }
    };
    if (options.auto !== false)
        for (const p of exports.SECRET_PATTERNS)
            add(p.re, p.group || 0);
    for (const re of options.extra || [])
        add(re, 0);
    return ranges;
}
/** Masks the ranges in a string of the same length, keeping everything else. */
function maskRanges(plain, ranges) {
    const chars = Array.from(plain);
    for (const [a, b] of ranges)
        for (let i = a; i < b && i < chars.length; i++)
            chars[i] = exports.MASK;
    return chars.join('');
}
/** Masks secrets in a plain string (window titles hold the command line, which can contain them). */
function redactString(text, options = {}) {
    return maskRanges(text, findSecretRanges(text, options));
}
/**
 * Redacts frames (returns copies) and counts the distinct secrets masked. A row that is filled to the last
 * column continues on the next row (a long token wraps), so such rows are searched together; otherwise a token
 * split over two rows would be only half masked.
 */
function redactFrames(frames, options = {}) {
    const found = new Set();
    const out = frames.map((frame) => {
        const rows = frame.grid;
        const plainRows = rows.map((row) => row.map((c) => c.char || ' ').join(''));
        // group rows into logical lines: a row whose last cell holds a character wraps onto the next row
        const groups = [];
        for (let y = 0; y < rows.length; y++) {
            const wraps = y > 0 && /\S$/.test(plainRows[y - 1]);
            if (wraps && groups.length)
                groups[groups.length - 1].push(y);
            else
                groups.push([y]);
        }
        const hit = rows.map(() => new Set());
        let inKey = false;
        for (const group of groups) {
            const joined = group.map((y) => plainRows[y]).join('');
            let ranges = findSecretRanges(joined, options);
            if (inKey || PRIVATE_KEY_BEGIN.test(joined)) {
                ranges = ranges.concat([[0, joined.length]]);
                inKey = !PRIVATE_KEY_END.test(joined);
            }
            for (const [a, b] of ranges) {
                found.add(joined.slice(a, b));
                for (let i = a; i < b; i++) {
                    const y = group[Math.floor(i / (plainRows[group[0]].length || 1))];
                    if (y !== undefined)
                        hit[y].add(i % (plainRows[group[0]].length || 1));
                }
            }
        }
        const grid = rows.map((row, y) => (hit[y].size === 0 ? row : row.map((cell, x) => (hit[y].has(x) && cell.char.trim() !== '' ? { ...cell, char: exports.MASK } : cell))));
        return { ...frame, grid };
    });
    return { frames: out, count: found.size };
}
const ANSI_TOKEN = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
/** Redacts ANSI text (lines may contain colour codes): the codes stay, the secret characters are masked. */
function redactAnsiText(text, options = {}) {
    const found = new Set();
    let inKey = false;
    const lines = text.split(/(\r?\n)/).map((line) => {
        if (line === '\n' || line === '\r\n')
            return line;
        // split into escape sequences and plain runs; remember where the plain characters live
        const tokens = [];
        let last = 0;
        let m;
        const re = new RegExp(ANSI_TOKEN.source, 'g');
        while ((m = re.exec(line)) !== null) {
            if (m.index > last)
                tokens.push({ esc: false, s: line.slice(last, m.index) });
            tokens.push({ esc: true, s: m[0] });
            last = m.index + m[0].length;
        }
        if (last < line.length)
            tokens.push({ esc: false, s: line.slice(last) });
        const plain = tokens.filter((t) => !t.esc).map((t) => t.s).join('');
        let ranges = findSecretRanges(plain, options);
        if (inKey || PRIVATE_KEY_BEGIN.test(plain)) {
            ranges = ranges.concat([[0, plain.length]]);
            inKey = !PRIVATE_KEY_END.test(plain);
        }
        if (ranges.length === 0)
            return line;
        for (const [a, b] of ranges)
            found.add(plain.slice(a, b));
        const masked = Array.from(maskRanges(plain, ranges));
        let pos = 0;
        return tokens.map((t) => {
            if (t.esc)
                return t.s;
            const chars = Array.from(t.s);
            const piece = masked.slice(pos, pos + chars.length).map((c, i) => (chars[i].trim() === '' ? chars[i] : c)).join('');
            pos += chars.length;
            return piece;
        }).join('');
    });
    return { text: lines.join(''), count: found.size };
}
