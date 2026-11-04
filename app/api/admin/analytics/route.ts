import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { analyticsService } from '@/server/services/analyticsService';
import { quotaService } from '@/server/services/quotaService';

function normalizeDateStr(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (val as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  if (typeof (val as { _seconds?: number })._seconds === 'number') {
    return new Date((val as { _seconds: number })._seconds * 1000).toISOString().slice(0, 10);
  }
  if (typeof (val as { seconds?: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString().slice(0, 10);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing administrative authorization token.' },
      { status: 401 }
    );
  }

  const admin = await verifyAdminToken(token);
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden: Access denied. Administrative privileges are required.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(60, Math.max(3, parseInt(searchParams.get('days') || '14', 10)));

    const dailyRecords = await analyticsService.getDailyAnalytics(days);

    // Aggregate quality metrics over the timeframe
    const qualityTotals: Record<string, number> = {};
    let totalTrims = 0;
    let totalFullDownloads = 0;
    let totalBytes = 0;
    let totalFailures = 0;

    for (const day of dailyRecords) {
      totalTrims += day.totalTrims;
      totalFullDownloads += day.totalFullDownloads;
      totalBytes += day.bytesProcessed;
      totalFailures += day.failuresCount;

      for (const [q, count] of Object.entries(day.qualityBreakdown)) {
        qualityTotals[q] = (qualityTotals[q] || 0) + count;
      }
    }

    const totalJobs = totalTrims + totalFullDownloads + totalFailures;
    const successRate = totalJobs > 0 ? ((totalTrims + totalFullDownloads) / totalJobs) * 100 : 100;

    // Aggregate User Analytics
    let totalUsersCount = 0;
    const tierCounts: Record<string, number> = { free: 0, pro: 0, studio: 0, daypass: 0 };
    const dailyRegistrations: Record<string, number> = {};
    let newUsersInPeriod = 0;

    // Date range boundaries
    const dateRangeSet = new Set(dailyRecords.map((d) => d.date));

    const firestore = getFirebaseFirestore();
    let rawUsers: Array<{ tier?: string; createdAt?: unknown; lastLoginAt?: unknown }> = [];

    if (firestore) {
      try {
        const snap = await firestore.collection('users').get();
        rawUsers = snap.docs.map((doc) => doc.data());
      } catch {
        rawUsers = quotaService.getLocalUsers();
      }
    } else {
      rawUsers = quotaService.getLocalUsers();
    }

    totalUsersCount = rawUsers.length;
    for (const u of rawUsers) {
      const tier = u.tier || 'free';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;

      const createdDate = normalizeDateStr(u.createdAt);
      if (createdDate && dateRangeSet.has(createdDate)) {
        dailyRegistrations[createdDate] = (dailyRegistrations[createdDate] || 0) + 1;
        newUsersInPeriod += 1;
      }
    }

    // Populate dailyRecords with newUsersCount
    const enrichedDailyRecords = dailyRecords.map((d) => ({
      ...d,
      newUsersCount: dailyRegistrations[d.date] || 0,
    }));

    return NextResponse.json({
      days,
      summary: {
        totalTrims,
        totalFullDownloads,
        totalBytes,
        totalFailures,
        totalJobs,
        successRate: parseFloat(successRate.toFixed(1)),
        qualityTotals,
        userAnalytics: {
          totalUsers: totalUsersCount,
          newUsersInPeriod,
          tierCounts,
        },
      },
      dailyRecords: enrichedDailyRecords,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve analytics';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

