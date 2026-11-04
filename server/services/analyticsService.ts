import fs from 'fs';
import path from 'path';
import { getFirebaseFirestore } from '../utils/firebaseAdmin';

export interface DailyAnalyticsRecord {
  date: string; // YYYY-MM-DD UTC
  totalTrims: number;
  totalFullDownloads: number;
  activeUsersCount: number;
  newUsersCount: number;
  qualityBreakdown: Record<string, number>; // e.g. "720": 12, "1080": 24
  failuresCount: number;
  bytesProcessed: number;
  updatedAt: string;
}

// Fallback local storage for offline / dev mode
const LOCAL_ANALYTICS_DIR = path.resolve(process.cwd(), 'server', 'data');
const LOCAL_ANALYTICS_FILE = path.join(LOCAL_ANALYTICS_DIR, 'daily_analytics.json');

if (!fs.existsSync(LOCAL_ANALYTICS_DIR)) {
  try {
    fs.mkdirSync(LOCAL_ANALYTICS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

class AnalyticsService {
  private localAnalytics = new Map<string, DailyAnalyticsRecord>();

  constructor() {
    this.loadLocalAnalytics();
  }

  private loadLocalAnalytics(): void {
    if (fs.existsSync(LOCAL_ANALYTICS_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_ANALYTICS_FILE, 'utf-8');
        const data: Record<string, DailyAnalyticsRecord> = JSON.parse(raw);
        for (const [k, v] of Object.entries(data)) {
          this.localAnalytics.set(k, v);
        }
      } catch (err) {
        console.warn('[Analytics Service] Failed to load local analytics:', err);
      }
    }
  }

  private saveLocalAnalytics(): void {
    try {
      const obj: Record<string, DailyAnalyticsRecord> = {};
      for (const [k, v] of this.localAnalytics.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(LOCAL_ANALYTICS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Analytics Service] Failed to write local analytics:', err);
    }
  }

  public getUtcDateString(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  /**
   * Records a successfully completed or failed video processing job
   */
  public async recordJobEvent(params: {
    isSuccess: boolean;
    isFullVideo: boolean;
    quality?: number;
    fileSizeBytes?: number;
    userId?: string;
  }): Promise<void> {
    const today = this.getUtcDateString();
    const qualityKey = params.quality ? String(params.quality) : 'unknown';

    // 1. Update In-Memory / Local Cache
    let record = this.localAnalytics.get(today);
    if (!record) {
      record = {
        date: today,
        totalTrims: 0,
        totalFullDownloads: 0,
        activeUsersCount: 0,
        newUsersCount: 0,
        qualityBreakdown: {},
        failuresCount: 0,
        bytesProcessed: 0,
        updatedAt: new Date().toISOString(),
      };
      this.localAnalytics.set(today, record);
    }

    if (params.isSuccess) {
      if (params.isFullVideo) {
        record.totalFullDownloads += 1;
      } else {
        record.totalTrims += 1;
      }

      record.qualityBreakdown[qualityKey] = (record.qualityBreakdown[qualityKey] || 0) + 1;
      if (params.fileSizeBytes && params.fileSizeBytes > 0) {
        record.bytesProcessed += params.fileSizeBytes;
      }
    } else {
      record.failuresCount += 1;
    }

    record.updatedAt = new Date().toISOString();
    this.saveLocalAnalytics();

    // 2. Persist to Firestore if available
    const firestore = getFirebaseFirestore();
    if (firestore) {
      try {
        const docRef = firestore.collection('analytics_daily').doc(today);
        const { FieldValue } = require('firebase-admin/firestore');

        const updates: Record<string, unknown> = {
          date: today,
          updatedAt: new Date().toISOString(),
        };

        if (params.isSuccess) {
          if (params.isFullVideo) {
            updates.totalFullDownloads = FieldValue.increment(1);
          } else {
            updates.totalTrims = FieldValue.increment(1);
          }

          updates[`qualityBreakdown.${qualityKey}`] = FieldValue.increment(1);
          if (params.fileSizeBytes && params.fileSizeBytes > 0) {
            updates.bytesProcessed = FieldValue.increment(params.fileSizeBytes);
          }
        } else {
          updates.failuresCount = FieldValue.increment(1);
        }

        await docRef.set(updates, { merge: true });
      } catch (err) {
        console.warn('[Analytics Service] Failed to write to Firestore:', (err as Error).message);
      }
    }
  }

  /**
   * Retrieves aggregated historical analytics for past N days
   */
  public async getDailyAnalytics(daysCount: number = 14): Promise<DailyAnalyticsRecord[]> {
    const dates: string[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(this.getUtcDateString(d));
    }

    const firestore = getFirebaseFirestore();
    const result: DailyAnalyticsRecord[] = [];

    if (firestore) {
      try {
        const snapshots = await Promise.all(
          dates.map((dateStr) => firestore.collection('analytics_daily').doc(dateStr).get())
        );

        for (let i = 0; i < dates.length; i++) {
          const snap = snapshots[i];
          const dateStr = dates[i];
          if (snap.exists) {
            const data = snap.data() as Partial<DailyAnalyticsRecord>;
            result.push({
              date: dateStr,
              totalTrims: data.totalTrims || 0,
              totalFullDownloads: data.totalFullDownloads || 0,
              activeUsersCount: data.activeUsersCount || 0,
              newUsersCount: data.newUsersCount || 0,
              qualityBreakdown: data.qualityBreakdown || {},
              failuresCount: data.failuresCount || 0,
              bytesProcessed: data.bytesProcessed || 0,
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          } else {
            // Fallback to local memory if not yet in Firestore
            const local = this.localAnalytics.get(dateStr) || {
              date: dateStr,
              totalTrims: 0,
              totalFullDownloads: 0,
              activeUsersCount: 0,
              newUsersCount: 0,
              qualityBreakdown: {},
              failuresCount: 0,
              bytesProcessed: 0,
              updatedAt: new Date().toISOString(),
            };
            result.push(local);
          }
        }

        return result;
      } catch (err) {
        console.warn('[Analytics Service] Firestore query failed, falling back to local store:', err);
      }
    }

    // Fallback purely local
    for (const d of dates) {
      result.push(
        this.localAnalytics.get(d) || {
          date: d,
          totalTrims: 0,
          totalFullDownloads: 0,
          activeUsersCount: 0,
          newUsersCount: 0,
          qualityBreakdown: {},
          failuresCount: 0,
          bytesProcessed: 0,
          updatedAt: new Date().toISOString(),
        }
      );
    }

    return result;
  }
}

export const analyticsService = new AnalyticsService();

