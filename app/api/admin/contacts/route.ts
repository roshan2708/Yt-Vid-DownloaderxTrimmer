import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getFirebaseFirestore } from '@/server/utils/firebaseAdmin';
import { contactService, ContactMessage } from '@/server/services/contactService';

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
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));

    const messages = await contactService.getMessages({
      status: status !== 'all' ? status : undefined,
      search: search || undefined,
      limit,
    });

    // Count unread
    const allMessages = await contactService.getMessages({ limit: 500 });
    const unreadCount = allMessages.filter((m) => m.status === 'unread').length;

    return NextResponse.json({
      messages,
      count: messages.length,
      unreadCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve contact submissions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { id, status } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing contact message id' }, { status: 400 });
    }

    if (!status || !['unread', 'read', 'replied', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    await contactService.updateStatus(id, status as ContactMessage['status']);

    return NextResponse.json({
      success: true,
      id,
      status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update message status';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing contact message id' }, { status: 400 });
    }

    await contactService.deleteMessage(id);

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete message';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
