import { UserAccount, AuthSession } from '../types';
import { supabase } from './supabase';
import { setSyncStatus, describeError } from './storage';

const SESSION_KEY = 'veg_app_auth_session_v2';
const USERS_STORAGE_KEY = 'veg_app_users_v2';
const PASSWORD_HASH_PREFIX = 'sha256$';
const PASSWORD_SALT = 'veg_market_yemen_v2_salt:';

/**
 * Pure synchronous SHA-256 implementation (works identically in Browser & Node)
 * so passwords are never stored in cleartext.
 */
function sha256Hex(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const utf8 = unescape(encodeURIComponent(ascii));
  const asciiBitLength = utf8.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let padded = utf8 + '\x80';
  while ((padded.length % 64) - 56) padded += '\x00';
  for (let i = 0; i < padded.length; i++) {
    const j = padded.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
      void i2;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

export function isPasswordHashed(val?: string): boolean {
  return Boolean(val && val.startsWith(PASSWORD_HASH_PREFIX) && val.length === PASSWORD_HASH_PREFIX.length + 64);
}

export function hashPassword(plain: string): string {
  const clean = String(plain ?? '').trim();
  if (isPasswordHashed(clean)) return clean;
  return `${PASSWORD_HASH_PREFIX}${sha256Hex(PASSWORD_SALT + clean)}`;
}

export function verifyPassword(inputPlain: string, user: UserAccount): boolean {
  const cleanInput = String(inputPlain ?? '').trim();
  if (!cleanInput) return false;
  const candidateHash = hashPassword(cleanInput);
  if (user.passwordHash && isPasswordHashed(user.passwordHash)) {
    return user.passwordHash === candidateHash;
  }
  if (isPasswordHashed(user.pin)) {
    return user.pin === candidateHash;
  }
  if (user.pin && user.pin !== '••••••••') {
    return hashPassword(user.pin) === candidateHash;
  }
  return false;
}

function normalizeUserRecord(u: UserAccount): UserAccount {
  const computedHash =
    u.passwordHash && isPasswordHashed(u.passwordHash)
      ? u.passwordHash
      : isPasswordHashed(u.pin)
      ? u.pin
      : u.pin && u.pin !== '••••••••'
      ? hashPassword(u.pin)
      : hashPassword(u.phone || '0000');

  return {
    ...u,
    passwordHash: computedHash,
    pin: '••••••••',
  };
}

// 1. Younis Al-Afif (Main Admin)
export const INITIAL_ADMIN_USER: UserAccount = {
  id: 'usr_admin_younis',
  name: 'يونس العفيف (مدير النظام)',
  phone: '772317950',
  countryCode: '+967',
  username: '772317950',
  role: 'admin',
  pin: '••••••••',
  passwordHash: hashPassword('772317950'),
  avatarBadge: 'ي',
  active: true,
  createdAt: '2026-10-29',
};

// 2. Mohannad Al-Ahmadi (Co-Admin)
export const INITIAL_ADMIN_MOHANNAD: UserAccount = {
  id: 'usr_admin_mohannad',
  name: 'مهند الأحمدي (مدير النظام)',
  phone: '772178969',
  countryCode: '+967',
  username: '772178969',
  role: 'admin',
  pin: '••••••••',
  passwordHash: hashPassword('772178969'),
  avatarBadge: 'م',
  active: true,
  createdAt: '2026-10-29',
};

// Default initial accounts created by system: Only Younis & Mohannad as Admins
export const INITIAL_SYSTEM_USERS: UserAccount[] = [
  INITIAL_ADMIN_USER,
  INITIAL_ADMIN_MOHANNAD,
];

export const AuthService = {
  hashPassword,
  verifyPassword,
  isPasswordHashed,

  getUsers(): UserAccount[] {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      let users: UserAccount[] = raw ? JSON.parse(raw) : [...INITIAL_SYSTEM_USERS];

      // Filter out deleted demo accounts (worker & old grocery)
      users = users.filter(
        (u) =>
          u.id !== 'usr_worker_field' &&
          u.id !== 'usr_grocery_salah' &&
          u.phone !== '771234567' &&
          u.phone !== '773456789'
      );

      // Ensure at least one admin exists if storage was empty or corrupted,
      // WITHOUT overwriting any admin credentials that were edited by the manager.
      const hasAnyAdmin = users.some((u) => u.role === 'admin');
      if (!hasAnyAdmin) {
        users = [...INITIAL_SYSTEM_USERS, ...users];
      }

      users = users.map(normalizeUserRecord);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return users;
    } catch {
      return INITIAL_SYSTEM_USERS.map(normalizeUserRecord);
    }
  },

  /**
   * Backend/Service-level verification that the acting user is an active Admin.
   */
  verifyAdminActor(actor?: UserAccount | null): {
    allowed: boolean;
    adminUser?: UserAccount;
    error?: string;
  } {
    const candidate = actor || this.getCurrentSession()?.user || null;
    if (!candidate || candidate.role !== 'admin') {
      return {
        allowed: false,
        error: '⛔ غير مصرح: هذه العملية مخصصة لمدير النظام فقط ولا يملك العامل أو المستخدم العادي صلاحية تنفيذها.',
      };
    }

    const users = this.getUsers();
    const verifiedAdmin = users.find(
      (u) => u.id === candidate.id && u.role === 'admin' && u.active
    );
    if (!verifiedAdmin) {
      return {
        allowed: false,
        error: '⛔ غير مصرح: فشل التحقق من هوية وصلاحية المدير في النظام.',
      };
    }

    return { allowed: true, adminUser: verifiedAdmin };
  },

  saveUsers(users: UserAccount[]): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users:', e);
    }
    void this.pushUsersToCloud(users);
  },

  /** Upsert all users to Supabase (table app_users) */
  async pushUsersToCloud(users: UserAccount[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_users')
        .upsert(users.map((u) => ({ id: u.id, data: u, updated_at: new Date().toISOString() })));
      if (error) setSyncStatus({ error: describeError(error.message) });
    } catch (e) {
      setSyncStatus({ error: describeError((e as any)?.message || String(e)) });
    }
  },

  /** Load users from Supabase into local storage (cloud is the source of truth). */
  async pullUsersFromCloud(): Promise<UserAccount[]> {
    try {
      const { data, error } = await supabase.from('app_users').select('id,data');
      if (error) throw new Error(error.message);
      if (data && data.length > 0) {
        const cloudUsers = data.map((r: any) => r.data as UserAccount);
        const needsHashMigration = cloudUsers.some(
          (u) => !u.passwordHash || !isPasswordHashed(u.passwordHash) || u.pin !== '••••••••'
        );
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cloudUsers));
        const normalized = this.getUsers();
        if (needsHashMigration) {
          await this.pushUsersToCloud(normalized);
        }
        return normalized;
      }
      const local = this.getUsers();
      await this.pushUsersToCloud(local);
      return local;
    } catch (e) {
      const msg = describeError((e as any)?.message || String(e));
      setSyncStatus({ error: msg });
      throw new Error(msg);
    }
  },

  addUser(user: Omit<UserAccount, 'id' | 'createdAt'>, actor?: UserAccount | null): UserAccount {
    const authCheck = this.verifyAdminActor(actor);
    if (!authCheck.allowed) {
      throw new Error(authCheck.error || 'غير مصرح');
    }
    const users = this.getUsers();
    const rawNew: UserAccount = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      passwordHash: hashPassword(user.passwordHash || user.pin),
      pin: '••••••••',
      createdAt: new Date().toISOString().split('T')[0],
    };
    const newUser = normalizeUserRecord(rawNew);
    const updated = [...users, newUser];
    this.saveUsers(updated);
    return newUser;
  },

  updateUser(updatedUser: UserAccount, actor?: UserAccount | null): void {
    const authCheck = this.verifyAdminActor(actor);
    if (!authCheck.allowed) {
      throw new Error(authCheck.error || 'غير مصرح');
    }
    const users = this.getUsers();
    const normalized = normalizeUserRecord(updatedUser);
    const updated = users.map((u) => (u.id === normalized.id ? normalized : u));
    this.saveUsers(updated);
  },

  /**
   * Admin-only method to edit any registered user's Username, Password, and User ID / Phone.
   * Performs backend/service-level admin authorization, uniqueness & non-empty validation,
   * SHA-256 password hashing, and preserves all user relationships & active sessions.
   */
  async updateUserCredentials(params: {
    actorUser?: UserAccount | null;
    targetOriginalId: string;
    newUsername: string;
    newUserId: string;
    newPassword?: string;
    newDisplayName?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    // 1. Verify Admin authorization locally
    const authCheck = this.verifyAdminActor(params.actorUser);
    if (!authCheck.allowed || !authCheck.adminUser) {
      return {
        success: false,
        error:
          authCheck.error ||
          '⛔ غير مصرح: هذه العملية مخصصة لمدير النظام فقط ولا يملك العامل أو المستخدم العادي صلاحية تعديل الحسابات.',
      };
    }

    // 2. Verify Admin identity in Supabase backend (when cloud records exist)
    try {
      const { data: cloudAdminRows, error: cloudAuthErr } = await supabase
        .from('app_users')
        .select('id,data')
        .eq('id', authCheck.adminUser.id)
        .limit(1);
      if (!cloudAuthErr && cloudAdminRows && cloudAdminRows.length > 0) {
        const cloudAdmin = cloudAdminRows[0].data as UserAccount;
        if (!cloudAdmin || cloudAdmin.role !== 'admin' || !cloudAdmin.active) {
          return {
            success: false,
            error: '⛔ غير مصرح من الخادم: الحساب الحالي لا يمتلك صلاحيات مدير النظام.',
          };
        }
      }
    } catch {
      // Fallback to local verified admin check if offline
    }

    const users = this.getUsers();
    const targetIndex = users.findIndex((u) => u.id === params.targetOriginalId);
    if (targetIndex === -1) {
      return { success: false, error: '⚠️ المستخدم المطلوب تعديله غير موجود في النظام.' };
    }

    const currentTarget = users[targetIndex];
    const cleanUsername = String(params.newUsername ?? '').trim();
    const cleanUserId = String(params.newUserId ?? '').replace(/\s+/g, '').trim();
    const cleanDisplayName = String(params.newDisplayName ?? '').trim() || cleanUsername;
    const rawNewPassword = params.newPassword !== undefined ? String(params.newPassword).trim() : '';

    // 3. Validate required fields are non-empty
    if (!cleanUsername) {
      return {
        success: false,
        error: '⚠️ رفض التعديل: حقل "اسم المستخدم (Username)" مطلوب ولا يمكن تركه فارغاً.',
      };
    }
    if (!cleanUserId) {
      return {
        success: false,
        error: '⚠️ رفض التعديل: حقل "رقم المستخدم (User ID)" مطلوب ولا يمكن تركه فارغاً.',
      };
    }
    if (cleanUsername.length < 2) {
      return {
        success: false,
        error: '⚠️ رفض التعديل: اسم المستخدم قصير جداً (يجب أن يتكون من حرفين على الأقل).',
      };
    }

    // 4. Validate uniqueness of Username and User ID across all OTHER users
    const lowerUsername = cleanUsername.toLowerCase();
    const lowerDisplayName = cleanDisplayName.toLowerCase();
    const lowerUserId = cleanUserId.toLowerCase();

    for (const other of users) {
      if (other.id === currentTarget.id) continue;

      const otherUsername = (other.username || '').trim().toLowerCase();
      const otherName = (other.name || '').trim().toLowerCase();
      const otherPhone = (other.phone || '').replace(/\s+/g, '').toLowerCase();
      const otherId = (other.id || '').trim().toLowerCase();

      // Check Username conflict
      if (
        lowerUsername === otherUsername ||
        lowerUsername === otherName ||
        (lowerDisplayName && lowerDisplayName === otherName)
      ) {
        return {
          success: false,
          error: `⚠️ رفض التعديل لتعارض البيانات: اسم المستخدم "${cleanUsername}" مستخدم مسبقاً لحساب آخر (${other.name}). يرجى اختيار اسم مستخدم مختلف.`,
        };
      }

      // Check User ID / Phone conflict
      if (
        lowerUserId === otherPhone ||
        lowerUserId === otherId ||
        (otherPhone && lowerUserId.replace(/^0+/, '') === otherPhone.replace(/^0+/, ''))
      ) {
        return {
          success: false,
          error: `⚠️ رفض التعديل لتعارض البيانات: رقم المستخدم "${cleanUserId}" مسجل مسبقاً لحساب آخر (${other.name}). يرجى إدخال رقم مستخدم غير مكرر.`,
        };
      }
    }

    // 5. Handle password validation & hashing
    let nextPasswordHash = currentTarget.passwordHash || hashPassword(currentTarget.pin);
    if (rawNewPassword.length > 0) {
      if (rawNewPassword.length < 3) {
        return {
          success: false,
          error: '⚠️ رفض التعديل: كلمة المرور الجديدة يجب أن تتكون من 3 أحرف أو أرقام على الأقل.',
        };
      }
      nextPasswordHash = hashPassword(rawNewPassword);
    }

    // Determine updated user ID:
    // Keep internal ID stable if cleanUserId matches old phone, or update ID if admin customized it
    const oldId = currentTarget.id;
    const oldPhone = currentTarget.phone;
    const nextId =
      cleanUserId !== oldPhone && cleanUserId !== oldId ? cleanUserId : oldId;

    const updatedUser: UserAccount = {
      ...currentTarget,
      id: nextId,
      name: cleanDisplayName,
      username: cleanUsername,
      phone: cleanUserId,
      passwordHash: nextPasswordHash,
      pin: '••••••••',
      avatarBadge: cleanDisplayName.charAt(0) || currentTarget.avatarBadge || 'م',
    };

    const nextUsers = users.map((u, idx) => (idx === targetIndex ? updatedUser : u));

    // 6. Save locally & sync to Supabase
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
    } catch (e) {
      console.error('Failed to save users locally:', e);
    }

    try {
      const { error: upsertErr } = await supabase.from('app_users').upsert(
        nextUsers.map((u) => ({
          id: u.id,
          data: u,
          updated_at: new Date().toISOString(),
        }))
      );
      if (upsertErr) {
        setSyncStatus({ error: describeError(upsertErr.message) });
        return {
          success: false,
          error: `❌ فشل حفظ التعديلات في قاعدة البيانات: ${describeError(upsertErr.message)}`,
        };
      }

      if (nextId !== oldId) {
        await supabase.from('app_users').delete().eq('id', oldId);
      }
    } catch (e) {
      const msg = describeError((e as any)?.message || String(e));
      setSyncStatus({ error: msg });
      return {
        success: false,
        error: `❌ تعذر الاتصال بقاعدة البيانات لحفظ التعديلات: ${msg}`,
      };
    }

    // 7. Preserve active session if the modified account is currently logged in
    const currentSession = this.getCurrentSession();
    if (
      currentSession &&
      (currentSession.user.id === oldId || currentSession.user.id === updatedUser.id)
    ) {
      const updatedSession: AuthSession = {
        ...currentSession,
        user: updatedUser,
      };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
      } catch {
        // ignore storage error
      }
    }

    return { success: true, user: updatedUser };
  },

  deleteUser(userId: string, actor?: UserAccount | null): void {
    const authCheck = this.verifyAdminActor(actor);
    if (!authCheck.allowed) return;
    // Prevent deleting main admins
    if (userId === 'usr_admin_younis' || userId === 'usr_admin_mohannad') return;
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 2) {
      return;
    }
    const updated = users.filter((u) => u.id !== userId);
    this.saveUsers(updated);
    void supabase.from('app_users').delete().eq('id', userId).then(({ error }) => {
      if (error) setSyncStatus({ error: describeError(error.message) });
    });
  },

  getCurrentSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  login(
    identifier: string,
    pin: string,
    rememberDevice = true
  ): { success: boolean; session?: AuthSession; error?: string } {
    const rawTrimmed = String(identifier ?? '').trim().toLowerCase();
    const noSpaceId = rawTrimmed.replace(/\s+/g, '');
    const cleanPin = String(pin ?? '').trim();
    const users = this.getUsers();

    // Match by Username, Display Name, User ID, or Phone number
    const account = users.find((u) => {
      if (!u.active) return false;
      const uPhone = (u.phone || '').replace(/\s+/g, '').toLowerCase();
      const uUsername = (u.username || '').trim().toLowerCase();
      const uUsernameNoSpace = uUsername.replace(/\s+/g, '');
      const uName = (u.name || '').trim().toLowerCase();
      const uId = (u.id || '').trim().toLowerCase();

      return (
        uUsername === rawTrimmed ||
        uUsernameNoSpace === noSpaceId ||
        uName === rawTrimmed ||
        uPhone === noSpaceId ||
        uId === noSpaceId ||
        (uPhone && noSpaceId && uPhone.replace(/^0+/, '') === noSpaceId.replace(/^0+/, '')) ||
        u.role === noSpaceId ||
        (noSpaceId === 'admin' && u.role === 'admin')
      );
    });

    if (!account) {
      return { success: false, error: 'اسم المستخدم أو رقم المستخدم غير موجود' };
    }

    if (!verifyPassword(cleanPin, account)) {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    const session: AuthSession = {
      token: 'tok_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      user: account,
      deviceName: navigator.userAgent.includes('Mobile') ? 'هاتف جوال (اليمن)' : 'جهاز سطح المكتب',
      loggedAt: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
      rememberDevice,
    };

    if (rememberDevice) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return { success: true, session };
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  switchAccount(user: UserAccount): AuthSession {
    const session: AuthSession = {
      token: 'tok_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      user,
      deviceName: 'جلسة سريعة',
      loggedAt: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA'),
      rememberDevice: true,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },
};
