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
    await fs.writeJson(CONFIG_FILE, { licenseKey, validatedAt: new Date().toISOString() }, { spaces: 2 });
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

  try {
    const res = await fetch('https://api.polar.sh/v1/license-keys/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: keyToTest.trim() })
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.status === 'granted' || data.valid) {
        return { valid: true, message: 'PRO LICENSE ACTIVE (Verified via Polar.sh)', licenseKey: keyToTest };
      }
    }
  } catch {
    if (keyToTest.startsWith('polar_') || keyToTest.length >= 20) {
      return { valid: true, message: 'PRO LICENSE ACTIVE (Offline Mode)', licenseKey: keyToTest };
    }
  }

  return { valid: false, message: 'INVALID LICENSE KEY', licenseKey: keyToTest };
}
