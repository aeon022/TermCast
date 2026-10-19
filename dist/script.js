"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScript = parseScript;
exports.loadScript = loadScript;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const num = (v, name, min, max) => {
    if (v === undefined)
        return undefined;
    if (typeof v !== 'number' || !isFinite(v) || v < min || v > max)
        throw new Error(`"${name}" must be a number between ${min} and ${max}`);
    return v;
};
/** Validates a parsed script; every problem names the offending step so the file can be fixed without guessing. */
function parseScript(raw, fileName = 'script') {
    const fail = (m) => { throw new Error(`Invalid script ${fileName}: ${m}`); };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        fail('expected a mapping with a "steps" list');
    if (!Array.isArray(raw.steps) || raw.steps.length === 0)
        fail('"steps" must be a non-empty list');
    const steps = raw.steps.map((s, i) => {
        const entry = typeof s === 'string' ? { cmd: s } : s;
        if (!entry || typeof entry.cmd !== 'string' || entry.cmd.trim() === '')
            fail(`step ${i + 1} needs a "cmd" string`);
        if (entry.type !== undefined && typeof entry.type !== 'boolean')
            fail(`step ${i + 1}: "type" must be true or false`);
        let pause;
        try {
            pause = num(entry.pause, 'pause', 0, 60000);
        }
        catch (e) {
            fail(`step ${i + 1}: ${e.message}`);
        }
        if (entry.show !== undefined && typeof entry.show !== 'string')
            fail(`step ${i + 1}: "show" must be a string`);
        return { cmd: entry.cmd, show: entry.show, type: entry.type, pause };
    });
    try {
        return {
            title: raw.title === undefined ? undefined : String(raw.title),
            theme: raw.theme === undefined ? undefined : String(raw.theme),
            themeFile: raw.themeFile === undefined ? undefined : String(raw.themeFile),
            gradient: raw.gradient === undefined ? undefined : String(raw.gradient),
            prompt: raw.prompt === undefined ? undefined : String(raw.prompt),
            cols: num(raw.cols, 'cols', 20, 300),
            rows: num(raw.rows, 'rows', 3, 100),
            typing: raw.typing === undefined ? true : Boolean(raw.typing),
            typeSpeed: num(raw.typeSpeed, 'typeSpeed', 0, 1000),
            steps
        };
    }
    catch (e) {
        return fail(e.message);
    }
}
function loadScript(file) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    }
    catch (err) {
        throw new Error(`Cannot read script ${file}: ${err.message}`);
    }
    const ext = path.extname(file).toLowerCase();
    let raw;
    try {
        raw = ext === '.json' ? JSON.parse(text) : yaml.load(text);
    }
    catch (err) {
        throw new Error(`Cannot parse script ${file}: ${err.message}`);
    }
    return parseScript(raw, path.basename(file));
}
