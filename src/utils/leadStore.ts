import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type LeadPayload = {
  email: string;
  source?: string;
  path?: string;
  visitorCode?: string;
  referrerCode?: string;
  context?: Record<string, unknown>;
};

export type LeadRecord = {
  email: string;
  source: string;
  path: string;
  visitorCode: string;
  referrerCode: string;
  context: Record<string, unknown>;
  status: 'pending' | 'confirmed';
  confirmToken: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
};

type LeadsDb = {
  leads: LeadRecord[];
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEADS_DB_PATH = path.resolve(DATA_DIR, 'leads.json');

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEADS_DB_PATH)) {
    fs.writeFileSync(LEADS_DB_PATH, JSON.stringify({ leads: [] }, null, 2), 'utf8');
  }
}

function readDb(): LeadsDb {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(LEADS_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LeadsDb;
    if (!Array.isArray(parsed.leads)) return { leads: [] };
    return parsed;
  } catch {
    return { leads: [] };
  }
}

function writeDb(db: LeadsDb) {
  ensureDbFile();
  fs.writeFileSync(LEADS_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function sanitize(payload: LeadPayload) {
  return {
    email: payload.email.trim().toLowerCase(),
    source: (payload.source || 'unknown').toString().slice(0, 120),
    path: (payload.path || '').toString().slice(0, 200),
    visitorCode: (payload.visitorCode || '').toString().slice(0, 40),
    referrerCode: (payload.referrerCode || '').toString().slice(0, 40),
    context: payload.context || {}
  };
}

function nextToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

export function upsertPendingLead(payload: LeadPayload) {
  const safe = sanitize(payload);
  const db = readDb();
  const now = new Date().toISOString();
  const existing = db.leads.find((lead) => lead.email === safe.email);

  if (existing?.status === 'confirmed') {
    return { status: 'already_confirmed' as const, lead: existing };
  }

  if (existing?.status === 'pending') {
    existing.source = safe.source;
    existing.path = safe.path;
    existing.visitorCode = safe.visitorCode;
    existing.referrerCode = safe.referrerCode;
    existing.context = safe.context;
    existing.updatedAt = now;
    writeDb(db);
    return { status: 'already_pending' as const, lead: existing };
  }

  const lead: LeadRecord = {
    ...safe,
    status: 'pending',
    confirmToken: nextToken(),
    createdAt: now,
    updatedAt: now
  };
  db.leads.unshift(lead);
  writeDb(db);
  return { status: 'created_pending' as const, lead };
}

export function confirmLeadByToken(token: string) {
  const db = readDb();
  const lead = db.leads.find((item) => item.confirmToken === token);
  if (!lead) return { status: 'not_found' as const };

  if (lead.status === 'confirmed') {
    return { status: 'already_confirmed' as const, lead };
  }

  lead.status = 'confirmed';
  lead.confirmedAt = new Date().toISOString();
  lead.updatedAt = lead.confirmedAt;
  writeDb(db);
  return { status: 'confirmed' as const, lead };
}

export function getLeadAdminSnapshot(limit = 100) {
  const db = readDb();
  const total = db.leads.length;
  const pending = db.leads.filter((lead) => lead.status === 'pending').length;
  const confirmed = db.leads.filter((lead) => lead.status === 'confirmed').length;
  return {
    summary: { total, pending, confirmed },
    leads: db.leads.slice(0, Math.max(1, Math.min(limit, 500)))
  };
}
