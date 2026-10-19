import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
  licenseKey?: string;
}

// aeon022's Polar.sh organization (public: customers need it to validate keys, no secret involved).
const POLAR_ORG_ID = 'aa792ea4-650e-492e-a955-9b3d564e943e';
const POLAR_VALIDATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/validate';
// Polar benefit that unlocks this tool: the "ttyreel Pro" product (family keys come from it too).
const ALLOWED_BENEFIT_IDS: string[] = ['0f534979-c9f8-4423-aa4d-6b6583a7e2aa'];

const RECHECK_MS = 24 * 60 * 60 * 1000; // a saved key is re-validated at most once a day
const OFFLINE_GRACE_MS = 21 * 24 * 60 * 60 * 1000; // ... and keeps working this long without reaching Polar

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ttyreel');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface SavedConfig {
  licenseKey?: string;
  validatedAt?: string;
}

async function readConfig(): Promise<SavedConfig> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) return (await fs.readJson(CONFIG_FILE)) as SavedConfig;
  } catch {
    // ignore
  }
  return {};
}

async function writeConfig(cfg: SavedConfig): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJson(CONFIG_FILE, cfg, { spaces: 2, mode: 0o600 });
  await fs.chmod(CONFIG_FILE, 0o600); // also tighten a file written by an older version
}

export async function getSavedLicenseKey(): Promise<string | undefined> {
  return (await readConfig()).licenseKey;
}

export async function saveLicenseKey(licenseKey: string): Promise<LicenseValidationResult> {
  const result = await checkWithPolar(licenseKey.trim());
  if (result.valid) await writeConfig({ licenseKey: licenseKey.trim(), validatedAt: new Date().toISOString() });
  return result;
}

export async function clearSavedLicense(): Promise<void> {
  if (await fs.pathExists(CONFIG_FILE)) await fs.remove(CONFIG_FILE);
}

/** Asks Polar whether the key is granted (unauthenticated customer-portal endpoint). */
async function checkWithPolar(cleanKey: string): Promise<LicenseValidationResult> {
  try {
    const res = await fetch(POLAR_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: cleanKey, organization_id: POLAR_ORG_ID }),
      timeout: 10000
    });
    if (res.status >= 500) {
      return { valid: false, message: 'Polar is unavailable right now. Try again later; your key was not rejected.', licenseKey: cleanKey };
    }
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.status === 'granted') {
      if (ALLOWED_BENEFIT_IDS.length === 0 || ALLOWED_BENEFIT_IDS.includes(data.benefit_id)) {
        return { valid: true, message: 'PRO LICENSE ACTIVE (verified via Polar.sh)', licenseKey: cleanKey };
      }
      return { valid: false, message: 'This license key does not include ttyreel Pro.', licenseKey: cleanKey };
    }
    return { valid: false, message: 'INVALID LICENSE KEY', licenseKey: cleanKey };
  } catch {
    return { valid: false, message: 'Could not reach Polar. Check your connection.', licenseKey: cleanKey, };
  }
}

export async function validatePolarLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  const saved = await readConfig();
  const keyToTest = licenseKey || process.env.POLAR_LICENSE_KEY || saved.licenseKey;

  if (!keyToTest || keyToTest.trim() === '') {
    return {
      valid: false,
      message: 'FREE TIER (Includes "Crafted with ttyreel" watermark. Upgrade to Pro to remove).'
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
export function maskKey(key: string): string {
  return key.length <= 10 ? '****' : `${key.slice(0, 4)}…${key.slice(-4)}`;
}
