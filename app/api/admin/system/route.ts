import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFirestore, verifyAdminToken } from '@/server/utils/firebaseAdmin';
import { RAM_TEMP_DIR, DISK_TEMP_DIR } from '@/server/services/jobManager';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function getDirSizeBytes(dirPath: string): number {
  let total = 0;
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const f of files) {
        try {
          const stats = fs.statSync(path.join(dirPath, f));
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

function getYtDlpVersion(): string {
  try {
    const localBin = path.resolve(
      process.cwd(),
      'bin',
      process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    );
    const cmd = fs.existsSync(localBin) ? `"${localBin}" --version` : 'yt-dlp --version';
    return execSync(cmd, { timeout: 3000, encoding: 'utf-8' }).trim();
  } catch {
    return 'Unknown / System Default';
  }
}

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
    const firestore = getFirebaseFirestore();
    let configData = {
      maintenanceMode: false,
      maintenanceMessage: 'System undergoing scheduled optimization. We will be back shortly.',
      defaultDailyFreeLimit: 3,
    };

    if (firestore) {
      try {
        const configSnap = await firestore.collection('system_config').doc('general').get();
        if (configSnap.exists) {
          configData = { ...configData, ...configSnap.data() };
        }
      } catch {
        // fallback
      }
    }

    const ramSizeBytes = getDirSizeBytes(RAM_TEMP_DIR);
    const diskSizeBytes = getDirSizeBytes(DISK_TEMP_DIR);
    const ytDlpVersion = getYtDlpVersion();

    return NextResponse.json({
      config: configData,
      storage: {
        ramTempDir: RAM_TEMP_DIR,
        ramSizeBytes,
        diskTempDir: DISK_TEMP_DIR,
        diskSizeBytes,
        totalTempBytes: ramSizeBytes + diskSizeBytes,
      },
      binaries: {
        ytDlpVersion,
      },
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve system status';
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

  if (admin.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Forbidden: Superadmin privileges required to modify system configuration.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Firestore is unavailable' }, { status: 503 });
    }

    const { maintenanceMode, maintenanceMessage, defaultDailyFreeLimit } = body;
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
    };

    if (typeof maintenanceMode === 'boolean') updates.maintenanceMode = maintenanceMode;
    if (typeof maintenanceMessage === 'string') updates.maintenanceMessage = maintenanceMessage;
    if (typeof defaultDailyFreeLimit === 'number') updates.defaultDailyFreeLimit = defaultDailyFreeLimit;

    await firestore.collection('system_config').doc('general').set(updates, { merge: true });

    // Audit log
    await firestore.collection('audit_logs').add({
      action: 'SYSTEM_CONFIG_UPDATED',
      adminUid: admin.uid,
      adminEmail: admin.email,
      details: updates,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, updates });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update system config';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

