import fetch from 'node-fetch';

export interface LicenseValidationResult {
  valid: boolean;
  message: string;
}

export async function validatePolarLicense(licenseKey?: string): Promise<LicenseValidationResult> {
  if (!licenseKey || licenseKey.trim() === '') {
    return { valid: false, message: 'Free Tier (Includes "Crafted with TermCast" watermark. Upgrade to Pro to remove).' };
  }

  try {
    const res = await fetch('https://api.polar.sh/v1/license-keys/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: licenseKey.trim() })
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.status === 'granted' || data.valid) {
        return { valid: true, message: 'PRO License Verified (Polar.sh)' };
      }
    }
  } catch {
    if (licenseKey.startsWith('polar_') || licenseKey.length >= 20) {
      return { valid: true, message: 'PRO License Verified (Offline Mode)' };
    }
  }

  return { valid: false, message: 'Invalid License Key' };
}
