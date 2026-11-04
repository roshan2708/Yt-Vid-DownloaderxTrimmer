import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { analyticsService } from '@/server/services/analyticsService';

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
      },
      dailyRecords,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve analytics';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

