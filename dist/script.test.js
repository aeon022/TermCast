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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const script_1 = require("./script");
(0, node_test_1.test)('a script with strings and mappings as steps, defaults filled in', () => {
    const s = (0, script_1.parseScript)({ title: 'demo', steps: ['ls', { cmd: 'git status', pause: 500, type: false }] });
    strict_1.default.equal(s.typing, true);
    strict_1.default.deepEqual(s.steps, [{ cmd: 'ls', show: undefined, type: undefined, pause: undefined }, { cmd: 'git status', show: undefined, type: false, pause: 500 }]);
    strict_1.default.equal(s.title, 'demo');
});
(0, node_test_1.test)('mistakes are reported with the step number', () => {
    strict_1.default.throws(() => (0, script_1.parseScript)({}), /non-empty list/);
    strict_1.default.throws(() => (0, script_1.parseScript)({ steps: [] }), /non-empty list/);
    strict_1.default.throws(() => (0, script_1.parseScript)({ steps: [{ cmd: 'ok' }, { pause: 5 }] }), /step 2 needs a "cmd"/);
    strict_1.default.throws(() => (0, script_1.parseScript)({ steps: [{ cmd: 'x', pause: -1 }] }), /step 1: "pause" must be a number between 0 and 60000/);
    strict_1.default.throws(() => (0, script_1.parseScript)({ steps: [{ cmd: 'x', type: 'yes' }] }), /step 1: "type" must be true or false/);
    strict_1.default.throws(() => (0, script_1.parseScript)({ steps: ['x'], cols: 5 }), /"cols" must be a number between 20 and 300/);
    strict_1.default.throws(() => (0, script_1.parseScript)([1, 2]), /expected a mapping/);
});
(0, node_test_1.test)('loadScript reads YAML and JSON and explains unreadable files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttyreel-'));
    fs.writeFileSync(path.join(dir, 'a.yml'), 'theme: nord\nprompt: starship\ncols: 60\nsteps:\n  - echo one\n  - cmd: echo two\n    pause: 100\n');
    const y = (0, script_1.loadScript)(path.join(dir, 'a.yml'));
    strict_1.default.equal(y.theme, 'nord');
    strict_1.default.equal(y.cols, 60);
    strict_1.default.equal(y.steps.length, 2);
    fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify({ steps: [{ cmd: 'ls' }], typing: false }));
    strict_1.default.equal((0, script_1.loadScript)(path.join(dir, 'b.json')).typing, false);
    fs.writeFileSync(path.join(dir, 'bad.yml'), 'steps: [unclosed');
    strict_1.default.throws(() => (0, script_1.loadScript)(path.join(dir, 'bad.yml')), /Cannot parse script .*bad\.yml/);
    strict_1.default.throws(() => (0, script_1.loadScript)(path.join(dir, 'missing.yml')), /Cannot read script/);
});
