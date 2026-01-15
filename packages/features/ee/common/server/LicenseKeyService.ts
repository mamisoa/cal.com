/**
 * LicenseKeyService Stub
 *
 * This is a stub that bypasses Cal.com's license validation.
 * All license checks return true, simulating an enterprise license.
 *
 * CHANGELOG:
 * - 2026-01-14: Replaced with stub for self-hosted fork - all checks return true
 */

// Usage event enum - kept for compatibility
export enum UsageEvent {
  BOOKING = "booking",
  USER = "user",
}

// Interface matching the original
export interface ILicenseKeyService {
  incrementUsage(usageEvent?: UsageEvent): Promise<void>;
  checkLicense(): Promise<boolean>;
}

/**
 * Stub LicenseKeyService - always validates as enterprise
 */
class LicenseKeyService implements ILicenseKeyService {
  /**
   * Stub - no-op for usage tracking
   */
  async incrementUsage(_usageEvent?: UsageEvent): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Stub - always returns true (license is valid)
   */
  async checkLicense(): Promise<boolean> {
    return true;
  }

  /**
   * Static method to validate a license key - always returns true
   */
  public static async validateLicenseKey(_licenseKey: string): Promise<boolean> {
    return true;
  }

  /**
   * Factory method - returns stub instance
   */
  public static async create(_deploymentRepo?: unknown): Promise<ILicenseKeyService> {
    return new LicenseKeyService();
  }
}

/**
 * NoopLicenseKeyService - also returns true for fork compatibility
 */
export class NoopLicenseKeyService implements ILicenseKeyService {
  async incrementUsage(_usageEvent?: UsageEvent): Promise<void> {
    return Promise.resolve();
  }

  async checkLicense(): Promise<boolean> {
    return true;
  }
}

/**
 * Singleton for license key service access
 */
export class LicenseKeySingleton {
  private static instance: ILicenseKeyService | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static async getInstance(_deploymentRepo?: unknown): Promise<ILicenseKeyService> {
    if (!LicenseKeySingleton.instance) {
      LicenseKeySingleton.instance = new LicenseKeyService();
    }
    return LicenseKeySingleton.instance;
  }
}

// Function export for simple imports
export const checkLicense = async (): Promise<boolean> => true;

export default LicenseKeyService;
