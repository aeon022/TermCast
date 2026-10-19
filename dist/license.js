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
exports.getSavedLicenseKey = getSavedLicenseKey;
exports.saveLicenseKey = saveLicenseKey;
exports.clearSavedLicense = clearSavedLicense;
exports.validatePolarLicense = validatePolarLicense;
exports.maskKey = maskKey;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// aeon022's Polar.sh organization (public: customers need it to validate keys, no secret involved).
const POLAR_ORG_ID = 'aa792ea4-650e-492e-a955-9b3d564e943e';
const POLAR_VALIDATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/validate';
// Polar benefit that unlocks this tool: the "TermCast Pro" product (family keys come from it too).
const ALLOWED_BENEFIT_IDS = ['0f534979-c9f8-4423-aa4d-6b6583a7e2aa'];
const RECHECK_MS = 24 * 60 * 60 * 1000; // a saved key is re-validated at most once a day
const OFFLINE_GRACE_MS = 21 * 24 * 60 * 60 * 1000; // ... and keeps working this long without reaching Polar
const CONFIG_DIR = path.join(os.homedir(), '.config', 'termcast');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
async function readConfig() {
    try {
        if (await fs.pathExists(CONFIG_FILE))
            return (await fs.readJson(CONFIG_FILE));
    }
    catch {
        // ignore
    }
    return {};
}
async function writeConfig(cfg) {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, cfg, { spaces: 2, mode: 0o600 });
    await fs.chmod(CONFIG_FILE, 0o600); // also tighten a file written by an older version
}
async function getSavedLicenseKey() {
    return (await readConfig()).licenseKey;
}
async function saveLicenseKey(licenseKey) {
    const result = await checkWithPolar(licenseKey.trim());
    if (result.valid)
        await writeConfig({ licenseKey: licenseKey.trim(), validatedAt: new Date().toISOString() });
    return result;
}
async function clearSavedLicense() {
    if (await fs.pathExists(CONFIG_FILE))
        await fs.remove(CONFIG_FILE);
}
/** Asks Polar whether the key is granted (unauthenticated customer-portal endpoint). */
async function checkWithPolar(cleanKey) {
    try {
        const res = await (0, node_fetch_1.default)(POLAR_VALIDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: cleanKey, organization_id: POLAR_ORG_ID }),
            timeout: 10000
        });
        if (res.status >= 500) {
            return { valid: false, message: 'Polar is unavailable right now. Try again later; your key was not rejected.', licenseKey: cleanKey };
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status === 'granted') {
            if (ALLOWED_BENEFIT_IDS.length === 0 || ALLOWED_BENEFIT_IDS.includes(data.benefit_id)) {
                return { valid: true, message: 'PRO LICENSE ACTIVE (verified via Polar.sh)', licenseKey: cleanKey };
            }
            return { valid: false, message: 'This license key does not include TermCast Pro.', licenseKey: cleanKey };
        }
        return { valid: false, message: 'INVALID LICENSE KEY', licenseKey: cleanKey };
    }
    catch {
        return { valid: false, message: 'Could not reach Polar. Check your connection.', licenseKey: cleanKey, };
    }
}
async function validatePolarLicense(licenseKey) {
    const saved = await readConfig();
    const keyToTest = licenseKey || process.env.POLAR_LICENSE_KEY || saved.licenseKey;
    if (!keyToTest || keyToTest.trim() === '') {
        return {
            valid: false,
            message: 'FREE TIER (Includes "Crafted with TermCast" watermark. Upgrade to Pro to remove).'
        };
    }
    const cleanKey = keyToTest.trim();
    const checkedAt = saved.licenseKey === cleanKey && saved.validatedAt ? Date.parse(saved.validatedAt) : NaN;
    const age = Number.isNaN(checkedAt) ? Infinity : Date.now() - checkedAt;
    if (age < RECHECK_MS) {
        return { valid: true, message: 'PRO LICENSE ACTIVE (checked today)', licenseKey: cleanKey };
    }
    const result = await checkWithPolar(cleanKey);
    if (result.valid && saved.licenseKey === cleanKey) {
        await writeConfig({ licenseKey: cleanKey, validatedAt: new Date().toISOString() });
    }
    // Polar can't be reached: a key that was valid recently keeps working for the grace period.
    if (!result.valid && /unavailable|Could not reach/.test(result.message) && age < OFFLINE_GRACE_MS) {
        return { valid: true, message: 'PRO LICENSE ACTIVE (offline, last check within 21 days)', licenseKey: cleanKey };
    }
    return result;
}
/** Shows only the start and end of a key so it can be printed without leaking it. */
function maskKey(key) {
    return key.length <= 10 ? '****' : `${key.slice(0, 4)}…${key.slice(-4)}`;
}
