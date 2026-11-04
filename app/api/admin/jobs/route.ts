import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { jobManager } from '@/server/services/jobManager';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await verifyAdminToken(token);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const jobs = jobManager.getAllJobs();
    return NextResponse.json({
      jobs,
      total: jobs.length,
      activeCount: jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve jobs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await verifyAdminToken(token);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, jobId } = body;

    if (action === 'CANCEL_JOB') {
      if (!jobId) {
        return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
      }
      jobManager.deleteJobFile(jobId);
      jobManager.updateJob(jobId, {
        status: 'failed',
        step: 'Aborted by Administrator.',
        error: 'Job was cancelled by an administrator.',
      });
      return NextResponse.json({ success: true, message: `Job ${jobId} cancelled.` });
    }

    if (action === 'CLEAN_ORPHANED_FILES') {
      jobManager.cleanOrphanedFiles();
      jobManager.cleanupExpiredJobs();
      return NextResponse.json({ success: true, message: 'Orphaned files and expired jobs cleaned.' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
