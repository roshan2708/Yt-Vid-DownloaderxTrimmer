import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { analyticsService } from '@/server/services/analyticsService';
import { jobManager, RAM_TEMP_DIR, DISK_TEMP_DIR } from '@/server/services/jobManager';
import fs from 'fs';

function getDirSizeBytes(dirPath: string): number {
  let total = 0;
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const f of files) {
        try {
          const stats = fs.statSync(`${dirPath}/${f}`);
          total += stats.size;
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  return total;
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
    const todayStr = analyticsService.getUtcDateString();
    const dailyAnalytics = await analyticsService.getDailyAnalytics(7);
    const todayRecord = dailyAnalytics[dailyAnalytics.length - 1];

    let totalUsersCount = 0;
    const firestore = getFirebaseFirestore();
    if (firestore) {
      try {
        const countSnap = await firestore.collection('users').count().get();
        totalUsersCount = countSnap.data().count;
      } catch {
        // Fallback: estimate from query
        try {
          const snap = await firestore.collection('users').limit(100).get();
          totalUsersCount = snap.size;
        } catch {
          // ignore
        }
      }
    }

    // Inspect Job Manager State
    const ramDiskBytes = getDirSizeBytes(RAM_TEMP_DIR);
    const diskTempBytes = getDirSizeBytes(DISK_TEMP_DIR);

    // Calculate aggregated totals over last 7 days
    let sevenDayTrims = 0;
    let sevenDayFull = 0;
    let sevenDayBytes = 0;
    for (const d of dailyAnalytics) {
      sevenDayTrims += d.totalTrims;
      sevenDayFull += d.totalFullDownloads;
      sevenDayBytes += d.bytesProcessed;
    }

    return NextResponse.json({
      admin: {
        email: admin.email,
        role: admin.role,
      },
      kpi: {
        totalUsers: totalUsersCount,
        trimsToday: todayRecord?.totalTrims || 0,
        fullDownloadsToday: todayRecord?.totalFullDownloads || 0,
        bytesProcessedToday: todayRecord?.bytesProcessed || 0,
        failuresToday: todayRecord?.failuresCount || 0,
        sevenDayTrims,
        sevenDayFull,
        sevenDayBytes,
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        ramDiskSizeBytes: ramDiskBytes,
        diskTempSizeBytes: diskTempBytes,
        nodeVersion: process.version,
        platform: process.platform,
      },
      recentActivity: dailyAnalytics,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve overview metrics';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

