// 账号与 token 存储:server/data/accounts.json(原子写,建议挂卷持久化)。
// 安全模型:token 明文仅在创建响应中出现一次;服务端只存 sha256(salt+token)。
// 房间簿:每账号 rooms[]({code,name,lastUsed}),进入自动登记、退出(单个/批量)解除。
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

const MAX_ROOMS_PER_ACCOUNT = 50;
const NAME_MAX_LEN = 20;

// ---------- 持久化(单进程低频写,原子替换足够;量大再迁 SQLite) ----------

let accounts = null;

function load() {
  if (accounts) return accounts;
  try {
    accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    if (!Array.isArray(accounts)) throw new Error('bad shape');
  } catch {
    accounts = []; // 首启/损坏回落空(挂卷即持久,不重建即丢——部署必挂卷)
  }
  return accounts;
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = ACCOUNTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(accounts, null, 2));
  fs.renameSync(tmp, ACCOUNTS_FILE);
}

// ---------- token ----------

function hashToken(salt, token) {
  return crypto.createHash('sha256').update(salt + token).digest('hex');
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** 创建账号:名字唯一;返回含明文 token(仅此一次)。 */
export function createAccount(rawName) {
  const name = String(rawName ?? '').trim();
  if (!name || name.length > NAME_MAX_LEN) {
    const err = new Error('用户名需为 1-20 个字符');
    err.code = 'E_NAME_INVALID';
    throw err;
  }
  const list = load();
  if (list.some((a) => a.name === name)) {
    const err = new Error('用户名已被占用');
    err.code = 'ERR_NAME_TAKEN';
    throw err;
  }
  const token = 'poly_' + crypto.randomBytes(24).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const account = {
    id: crypto.randomUUID(),
    name,
    salt,
    tokenHash: hashToken(salt, token),
    createdAt: new Date().toISOString(),
    rooms: [],
  };
  list.push(account);
  persist();
  return { id: account.id, name: account.name, token };
}

/** 校验 Bearer token → 账号(或 null)。 */
export function verifyToken(token) {
  if (typeof token !== 'string' || !token.startsWith('poly_')) return null;
  const list = load();
  for (const a of list) {
    if (safeEqualHex(hashToken(a.salt, token), a.tokenHash)) return a;
  }
  return null;
}

// ---------- 房间簿 ----------

function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase().slice(0, 16);
}

/** 进入/改名登记(upsert;容量上限内淘汰最旧)。 */
export function enterRoom(accountId, rawCode, rawName) {
  const code = normalizeCode(rawCode);
  if (!code) return [];
  const list = load();
  const acc = list.find((a) => a.id === accountId);
  if (!acc) return acc?.rooms ?? [];
  const name = String(rawName ?? '').trim().slice(0, 40);
  const rest = acc.rooms.filter((r) => r.code !== code);
  const prev = acc.rooms.find((r) => r.code === code);
  rest.unshift({ code, name: name || prev?.name || '', lastUsed: Date.now() });
  acc.rooms = rest.slice(0, MAX_ROOMS_PER_ACCOUNT);
  persist();
  return acc.rooms;
}

/** 批量退出(解除关联;房间内容不受影响,凭码仍可再进)。 */
export function leaveRooms(accountId, rawCodes) {
  const codes = new Set(
    (Array.isArray(rawCodes) ? rawCodes : []).map(normalizeCode).filter(Boolean)
  );
  const list = load();
  const acc = list.find((a) => a.id === accountId);
  if (!acc) return [];
  acc.rooms = acc.rooms.filter((r) => !codes.has(r.code));
  persist();
  return acc.rooms;
}

/** 我的房间(按 lastUsed 倒序)。 */
export function getRooms(accountId) {
  const acc = load().find((a) => a.id === accountId);
  return [...(acc?.rooms ?? [])].sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0));
}
