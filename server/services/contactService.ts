import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseFirestore } from '../utils/firebaseAdmin';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  createdAt: string;
  updatedAt: string;
  ip?: string;
  userAgent?: string;
}

const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const LOCAL_CONTACTS_FILE = path.join(LOCAL_DATA_DIR, 'contact_messages.json');

class ContactService {
  private localMessages: Map<string, ContactMessage> = new Map();

  constructor() {
    this.ensureStorageDir();
    this.loadLocalMessages();
  }

  private ensureStorageDir(): void {
    try {
      if (!fs.existsSync(LOCAL_DATA_DIR)) {
        fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[Contact Service] Could not ensure data directory:', err);
    }
  }

  private loadLocalMessages(): void {
    if (fs.existsSync(LOCAL_CONTACTS_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_CONTACTS_FILE, 'utf-8');
        const list: ContactMessage[] = JSON.parse(raw);
        for (const msg of list) {
          this.localMessages.set(msg.id, msg);
        }
      } catch (err) {
        console.warn('[Contact Service] Could not read local contact messages:', err);
      }
    }
  }

  private saveLocalMessages(): void {
    try {
      const list = Array.from(this.localMessages.values());
      fs.writeFileSync(LOCAL_CONTACTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Contact Service] Could not persist local contact messages:', err);
    }
  }

  /**
   * Records a new user contact inquiry
   */
  public async createMessage(params: {
    name: string;
    email: string;
    topic: string;
    message: string;
    ip?: string;
    userAgent?: string;
  }): Promise<ContactMessage> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const record: ContactMessage = {
      id,
      name: params.name.trim(),
      email: params.email.trim(),
      topic: params.topic.trim(),
      message: params.message.trim(),
      status: 'unread',
      createdAt: now,
      updatedAt: now,
      ip: params.ip,
      userAgent: params.userAgent,
    };

    // 1. Always save locally first for resilience
    this.localMessages.set(id, record);
    this.saveLocalMessages();

    // 2. Persist to Cloud Firestore if operational
    const firestore = getFirebaseFirestore();
    if (firestore) {
      try {
        await firestore.collection('contact_messages').doc(id).set(record);
      } catch (err) {
        console.warn('[Contact Service] Firestore save warning:', (err as Error).message);
      }
    }

    return record;
  }

  /**
   * Retrieves messages with optional status filter and search query
   */
  public async getMessages(options: {
    status?: string;
    search?: string;
    limit?: number;
  } = {}): Promise<ContactMessage[]> {
    const firestore = getFirebaseFirestore();
    const limit = options.limit || 100;
    const messageMap = new Map<string, ContactMessage>();

    // 1. Ingest from local cache
    for (const [id, msg] of this.localMessages.entries()) {
      messageMap.set(id, msg);
    }

    // 2. Query Firestore if available
    if (firestore) {
      try {
        let query: FirebaseFirestore.Query = firestore.collection('contact_messages');
        if (options.status && options.status !== 'all') {
          query = query.where('status', '==', options.status);
        }
        const snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
        for (const doc of snap.docs) {
          const data = doc.data() as Partial<ContactMessage>;
          messageMap.set(doc.id, {
            id: doc.id,
            name: data.name || 'Anonymous',
            email: data.email || 'No email',
            topic: data.topic || 'General Inquiry',
            message: data.message || '',
            status: data.status || 'unread',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            ip: data.ip,
            userAgent: data.userAgent,
          });
        }
      } catch (err) {
        console.warn('[Contact Service] Firestore query fallback to local:', (err as Error).message);
      }
    }

    let list = Array.from(messageMap.values());

    // Apply filters
    if (options.status && options.status !== 'all') {
      list = list.filter((m) => m.status === options.status);
    }

    if (options.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.slice(0, limit);
  }

  /**
   * Updates message status (e.g. mark read, replied, archived)
   */
  public async updateStatus(id: string, status: ContactMessage['status']): Promise<boolean> {
    const local = this.localMessages.get(id);
    const now = new Date().toISOString();
    if (local) {
      local.status = status;
      local.updatedAt = now;
      this.saveLocalMessages();
    }

    const firestore = getFirebaseFirestore();
    if (firestore) {
      try {
        await firestore.collection('contact_messages').doc(id).update({
          status,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('[Contact Service] Could not update Firestore message status:', err);
      }
    }

    return true;
  }

  /**
   * Deletes a contact message
   */
  public async deleteMessage(id: string): Promise<boolean> {
    this.localMessages.delete(id);
    this.saveLocalMessages();

    const firestore = getFirebaseFirestore();
    if (firestore) {
      try {
        await firestore.collection('contact_messages').doc(id).delete();
      } catch (err) {
        console.warn('[Contact Service] Could not delete Firestore message:', err);
      }
    }

    return true;
  }
}

export const contactService = new ContactService();

