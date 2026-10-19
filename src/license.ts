import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
  licenseKey?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'termcast');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function getSavedLicenseKey(): Promise<string | undefined> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      return config.licenseKey;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export async function saveLicenseKey(licenseKey: string): Promise<LicenseValidationResult> {
  const result = await validatePolarLicense(licenseKey);
  if (result.valid) {
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, { licenseKey, validatedAt: new Date().toISOString() }, { spaces: 2, mode: 0o600 });
    await fs.chmod(CONFIG_FILE, 0o600); // also tighten a file written by an older version
  }
  return result;
}

export async function clearSavedLicense(): Promise<void> {
  if (await fs.pathExists(CONFIG_FILE)) {
    await fs.remove(CONFIG_FILE);
  }
}

export async function validatePolarLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  const keyToTest = licenseKey || process.env.POLAR_LICENSE_KEY || (await getSavedLicenseKey());

  if (!keyToTest || keyToTest.trim() === '') {
    return {
      valid: false,
      message: 'FREE TIER (Includes "Crafted with TermCast" watermark. Upgrade to Pro to remove).'
    };
  }

  const cleanKey = keyToTest.trim();

  try {
    // The old code called Polar's /v1/license-keys/validate directly, which
    // requires an organization auth token and always returns 401 from a
    // client with none — meaning this call never actually succeeded, and
    // every "PRO" grant went through the (now removed) any-key-shaped
    // fallback below. Route through the shared verify backend instead,
    // which calls Polar's unauthenticated customer-portal validate
    // endpoint server-side.
    const res = await fetch('https://api.abteilung83.at/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: cleanKey })
    });

    if (res.status >= 500) {
      return { valid: false, message: 'License server unavailable right now. Try again later; your key was not rejected.', licenseKey: cleanKey };
    }
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.valid) {
      return { valid: true, message: 'PRO LICENSE ACTIVE (Verified via Polar.sh)', licenseKey: cleanKey };
    }
    return { valid: false, message: 'INVALID LICENSE KEY', licenseKey: cleanKey };
  } catch {
    return { valid: false, message: 'Could not reach license server. Check your connection.', licenseKey: cleanKey };
  }
}

/** Shows only the start and end of a key so it can be printed without leaking it. */
export function maskKey(key: string): string {
  return key.length <= 10 ? '****' : `${key.slice(0, 4)}…${key.slice(-4)}`;
}
