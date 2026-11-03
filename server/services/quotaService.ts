import fs from 'fs';
import path from 'path';
import {
  QuotaCheckResult,
  TierConfig,
  UserQuotaRecord,
  UserQuotaResponse,
  UserTier,
} from '../types';
import { getFirebaseFirestore } from '../utils/firebaseAdmin';

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  free: {
    name: 'Starter',
    quotaCycle: 'daily',
    quotaLimit: 3, // 3 daily trims for free
    maxQuality: 720,
    maxClipDurationSec: 120, // 2 minutes
    maxSourceDurationSec: 1200, // 20 minutes
  },
  pro: {
    name: 'Creator Pro',
    quotaCycle: 'monthly',
    quotaLimit: 200, // 200 trims per month
    maxQuality: 2160, // 4K UHD
    maxClipDurationSec: 1200, // 20 minutes
    maxSourceDurationSec: 10800, // 3 hours
  },
  studio: {
    name: 'Studio Power',
    quotaCycle: 'monthly',
    quotaLimit: 500, // 500 trims per month
    maxQuality: 2160, // 4K UHD @ 60fps
    maxClipDurationSec: 3600, // 60 minutes
    maxSourceDurationSec: 18000, // 5 hours
  },
  daypass: {
    name: '24-Hour Pass',
    quotaCycle: 'daily',
    quotaLimit: 15, // 15 trims in 24 hours
    maxQuality: 2160,
    maxClipDurationSec: 900, // 15 minutes
    maxSourceDurationSec: 7200, // 2 hours
  },
};

// Fallback local storage for offline / dev mode without GCP credentials
const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const LOCAL_QUOTA_FILE = path.join(LOCAL_DATA_DIR, 'user_quotas.json');

if (!fs.existsSync(LOCAL_DATA_DIR)) {
  try {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

/**
 * Lightweight per-user mutex lock to avoid race conditions on concurrent requests
 */
class UserMutex {
  private locks = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      releaseLock!();
    }
  }
}

const mutex = new UserMutex();

export class QuotaService {
  private firestoreOperational = true;
  private localCache = new Map<string, UserQuotaRecord>();

  constructor() {
    this.loadLocalCache();
  }

  private loadLocalCache(): void {
    if (fs.existsSync(LOCAL_QUOTA_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_QUOTA_FILE, 'utf-8');
        const data: Record<string, UserQuotaRecord> = JSON.parse(raw);
        for (const [k, v] of Object.entries(data)) {
          this.localCache.set(k, v);
        }
      } catch (err) {
        console.warn('[Cut Tadaao Quota] Could not load local quota file:', err);
      }
    }
  }

  private saveLocalCache(): void {
    try {
      const obj: Record<string, UserQuotaRecord> = {};
      for (const [k, v] of this.localCache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(LOCAL_QUOTA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Cut Tadaao Quota] Could not write local quota file:', err);
    }
  }

  public getUtcDateString(): string {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  public getUtcMonthString(): string {
    return new Date().toISOString().slice(0, 7); // "YYYY-MM"
  }

  public getSecondsUntilUtcMidnight(): number {
    const now = new Date();
    const tomorrowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return Math.max(0, Math.floor((tomorrowUtc.getTime() - now.getTime()) / 1000));
  }

  public getSecondsUntilUtcMonthEnd(): number {
    const now = new Date();
    const nextMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return Math.max(0, Math.floor((nextMonthUtc.getTime() - now.getTime()) / 1000));
  }

  /**
   * Internal reader: Attempts Firestore first, falls back to local JSON store
   */
  private async readUserRecord(userId: string, email?: string): Promise<UserQuotaRecord> {
    const today = this.getUtcDateString();
    const currentMonth = this.getUtcMonthString();
    const firestore = getFirebaseFirestore();

    if (firestore && this.firestoreOperational) {
      try {
        const docRef = firestore.collection('users').doc(userId);
        const snapshot = await docRef.get();

        if (snapshot.exists) {
          const data = snapshot.data() as Partial<UserQuotaRecord>;
          return {
            userId,
            email: data.email || email,
            tier: (data.tier as UserTier) || 'free',
            trimsToday: typeof data.trimsToday === 'number' ? data.trimsToday : 0,
            lastResetDate: data.lastResetDate || today,
            trimsThisMonth: typeof data.trimsThisMonth === 'number' ? data.trimsThisMonth : 0,
            lastResetMonth: data.lastResetMonth || currentMonth,
            bonusCredits: typeof data.bonusCredits === 'number' ? data.bonusCredits : 0,
            totalTrimsAllTime: typeof data.totalTrimsAllTime === 'number' ? data.totalTrimsAllTime : 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        } else {
          const newRecord: UserQuotaRecord = {
            userId,
            email,
            tier: 'free',
            trimsToday: 0,
            lastResetDate: today,
            trimsThisMonth: 0,
            lastResetMonth: currentMonth,
            bonusCredits: 0,
            totalTrimsAllTime: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await docRef.set(newRecord);
          return newRecord;
        }
      } catch (err) {
        if (this.firestoreOperational) {
          console.warn('[Cut Tadaao Quota] Firestore unavailable, using persistent local store:', (err as Error).message);
          this.firestoreOperational = false;
        }
      }
    }

    // Local persistent storage fallback
    const existing = this.localCache.get(userId);
    if (existing) {
      if (email && !existing.email) existing.email = email;
      if (typeof existing.trimsThisMonth !== 'number') existing.trimsThisMonth = 0;
      if (!existing.lastResetMonth) existing.lastResetMonth = currentMonth;
      return existing;
    }

    const created: UserQuotaRecord = {
      userId,
      email,
      tier: 'free',
      trimsToday: 0,
      lastResetDate: today,
      trimsThisMonth: 0,
      lastResetMonth: currentMonth,
      bonusCredits: 0,
      totalTrimsAllTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.localCache.set(userId, created);
    this.saveLocalCache();
    return created;
  }

  /**
   * Internal writer: Writes to Firestore, falls back to local JSON store
   */
  private async writeUserRecord(record: UserQuotaRecord): Promise<void> {
    record.updatedAt = new Date().toISOString();
    this.localCache.set(record.userId, record);
    this.saveLocalCache();

    const firestore = getFirebaseFirestore();
    if (firestore && this.firestoreOperational) {
      try {
        await firestore.collection('users').doc(record.userId).set(record, { merge: true });
      } catch (err) {
        if (this.firestoreOperational) {
          console.warn('[Cut Tadaao Quota] Firestore write failed, stored locally:', (err as Error).message);
          this.firestoreOperational = false;
        }
      }
    }
  }

  /**
   * Performs daily and monthly reset check on a user record
   */
  private checkReset(record: UserQuotaRecord): boolean {
    let changed = false;
    const today = this.getUtcDateString();
    const currentMonth = this.getUtcMonthString();

    if (record.lastResetDate !== today) {
      record.trimsToday = 0;
      record.lastResetDate = today;
      changed = true;
    }

    if (record.lastResetMonth !== currentMonth) {
      record.trimsThisMonth = 0;
      record.lastResetMonth = currentMonth;
      changed = true;
    }

    return changed;
  }

  /**
   * Public: Retrieves user quota status for frontend & display
   */
  public async getUserQuota(userId: string, email?: string): Promise<UserQuotaResponse> {
    return mutex.runExclusive(userId, async () => {
      const record = await this.readUserRecord(userId, email);
      const wasReset = this.checkReset(record);
      if (wasReset) {
        await this.writeUserRecord(record);
      }

      const config = TIER_CONFIGS[record.tier] || TIER_CONFIGS.free;
      const isDaily = config.quotaCycle === 'daily';

      const quotaUsed = isDaily ? record.trimsToday : record.trimsThisMonth;
      const remainingQuota = Math.max(0, config.quotaLimit - quotaUsed);
      const totalRemaining = remainingQuota + record.bonusCredits;
      const secondsUntilReset = isDaily
        ? this.getSecondsUntilUtcMidnight()
        : this.getSecondsUntilUtcMonthEnd();

      return {
        userId,
        tier: record.tier,
        tierName: config.name,
        quotaCycle: config.quotaCycle,
        quotaLimit: config.quotaLimit,
        quotaUsed,
        remainingQuota,
        bonusCredits: record.bonusCredits,
        totalRemaining,
        secondsUntilReset,
        maxQuality: config.maxQuality,
        maxClipDurationSec: config.maxClipDurationSec,
        maxSourceDurationSec: config.maxSourceDurationSec,

        // Backward compatibility convenience fields
        trimsToday: isDaily ? record.trimsToday : record.trimsThisMonth,
        dailyLimit: config.quotaLimit,
        remainingToday: remainingQuota,
      };
    });
  }

  /**
   * Public: Validates job constraints and atomically reserves 1 trim quota
   */
  public async validateAndReserveQuota(params: {
    userId: string;
    email?: string;
    requestedQuality: number;
    startSeconds?: number;
    endSeconds?: number;
    isFullVideo: boolean;
    sourceDuration?: number;
  }): Promise<QuotaCheckResult> {
    return mutex.runExclusive(params.userId, async () => {
      const record = await this.readUserRecord(params.userId, params.email);
      this.checkReset(record);

      const config = TIER_CONFIGS[record.tier] || TIER_CONFIGS.free;
      const isDaily = config.quotaCycle === 'daily';
      const resetInSeconds = isDaily
        ? this.getSecondsUntilUtcMidnight()
        : this.getSecondsUntilUtcMonthEnd();

      // 1. Resolution Constraint
      if (params.requestedQuality > config.maxQuality) {
        return {
          allowed: false,
          code: 'QUALITY_RESTRICTED',
          reason: `1080p and 4K resolutions require Creator Pro. Your current plan (${config.name}) is limited to ${config.maxQuality}p.`,
        };
      }

      // 2. Source Video Length Constraint
      if (params.sourceDuration && params.sourceDuration > config.maxSourceDurationSec) {
        const maxMins = Math.round(config.maxSourceDurationSec / 60);
        return {
          allowed: false,
          code: 'SOURCE_RESTRICTED',
          reason: `Source video exceeds your plan limit of ${maxMins} minutes. Upgrade to Creator Pro to trim podcasts and long videos.`,
        };
      }

      // 3. Clip Duration Constraint
      if (!params.isFullVideo && typeof params.startSeconds === 'number' && typeof params.endSeconds === 'number') {
        const clipDuration = Math.max(0, params.endSeconds - params.startSeconds);
        if (clipDuration > config.maxClipDurationSec) {
          const maxClipMins = Math.round(config.maxClipDurationSec / 60);
          return {
            allowed: false,
            code: 'DURATION_RESTRICTED',
            reason: `Selected clip length exceeds your plan limit of ${maxClipMins} minutes. Upgrade to Creator Pro for longer clips.`,
          };
        }
      } else if (params.isFullVideo && params.sourceDuration && params.sourceDuration > config.maxClipDurationSec) {
        const maxClipMins = Math.round(config.maxClipDurationSec / 60);
        return {
          allowed: false,
          code: 'DURATION_RESTRICTED',
          reason: `Full video download exceeds the ${maxClipMins}-minute limit for your plan. Please select a start and end time.`,
        };
      }

      // 4. Quota Check & Atomic Reservation
      if (isDaily) {
        if (record.trimsToday < config.quotaLimit) {
          record.trimsToday += 1;
          record.totalTrimsAllTime += 1;
          await this.writeUserRecord(record);
          return {
            allowed: true,
            consumedFrom: 'daily',
          };
        }
      } else {
        // Monthly quota (Pro: 200, Studio: 500)
        if (record.trimsThisMonth < config.quotaLimit) {
          record.trimsThisMonth += 1;
          record.totalTrimsAllTime += 1;
          await this.writeUserRecord(record);
          return {
            allowed: true,
            consumedFrom: 'monthly',
          };
        }
      }

      // 5. Bonus Top-Up Credits Check
      if (record.bonusCredits > 0) {
        record.bonusCredits -= 1;
        record.totalTrimsAllTime += 1;
        await this.writeUserRecord(record);
        return {
          allowed: true,
          consumedFrom: 'bonus',
        };
      }

      // 6. Quota exhausted
      const quotaName = isDaily ? 'Daily' : 'Monthly';
      const resetDescription = isDaily ? 'Quota resets at 00:00 UTC.' : 'Quota resets on the 1st of next month.';

      return {
        allowed: false,
        code: 'LIMIT_REACHED',
        reason: `${quotaName} trim limit reached (${config.quotaLimit}/${config.quotaLimit} used). ${resetDescription}`,
        resetInSeconds,
      };
    });
  }

  /**
   * Public: Critical Edge Case - Automatically refunds 1 trim if a job fails
   */
  public async refundQuota(userId: string, consumedFrom: 'daily' | 'monthly' | 'bonus' = 'daily'): Promise<void> {
    return mutex.runExclusive(userId, async () => {
      try {
        const record = await this.readUserRecord(userId);
        if (consumedFrom === 'daily') {
          record.trimsToday = Math.max(0, record.trimsToday - 1);
        } else if (consumedFrom === 'monthly') {
          record.trimsThisMonth = Math.max(0, record.trimsThisMonth - 1);
        } else if (consumedFrom === 'bonus') {
          record.bonusCredits += 1;
        }

        record.totalTrimsAllTime = Math.max(0, record.totalTrimsAllTime - 1);
        await this.writeUserRecord(record);

        console.log(
          `[Cut Tadaao Quota] Successfully refunded 1 ${consumedFrom} trim to user ${userId}.`
        );
      } catch (err) {
        console.error(`[Cut Tadaao Quota] Error refunding quota for user ${userId}:`, err);
      }
    });
  }
}

export const quotaService = new QuotaService();
