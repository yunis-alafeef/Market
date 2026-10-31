import { UserAccount, AuthSession } from '../types';
import { supabase } from './supabase';

const SESSION_KEY = 'veg_app_auth_session_v2';
const USERS_STORAGE_KEY = 'veg_app_users_v2';

// 1. Younis Al-Afif (Main Admin)
export const INITIAL_ADMIN_USER: UserAccount = {
  id: 'usr_admin_younis',
  name: 'يونس العفيف (مدير النظام)',
  phone: '772317950',
  countryCode: '+967',
  username: '772317950',
  role: 'admin',
  pin: '772317950', // Password is phone number
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
  pin: '772178969', // Password is phone number
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
  getUsers(): UserAccount[] {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      let users: UserAccount[] = raw ? JSON.parse(raw) : INITIAL_SYSTEM_USERS;

      // Filter out deleted demo accounts (worker & old grocery)
      users = users.filter(
        (u) =>
          u.id !== 'usr_worker_field' &&
          u.id !== 'usr_grocery_salah' &&
          u.phone !== '771234567' &&
          u.phone !== '773456789'
      );

      // Ensure Younis has admin role and his phone as PIN
      let younisIndex = users.findIndex(
        (u) => u.id === 'usr_admin_younis' || u.phone === '772317950'
      );
      if (younisIndex >= 0) {
        users[younisIndex] = {
          ...users[younisIndex],
          id: 'usr_admin_younis',
          name: 'يونس العفيف (مدير النظام)',
          phone: '772317950',
          username: '772317950',
          role: 'admin',
          pin: '772317950',
          active: true,
        };
      } else {
        users.unshift(INITIAL_ADMIN_USER);
      }

      // Ensure Mohannad has admin role and his phone as PIN
      let mohannadIndex = users.findIndex(
        (u) => u.id === 'usr_admin_mohannad' || u.phone === '772178969'
      );
      if (mohannadIndex >= 0) {
        users[mohannadIndex] = {
          ...users[mohannadIndex],
          id: 'usr_admin_mohannad',
          name: 'مهند الأحمدي (مدير النظام)',
          phone: '772178969',
          username: '772178969',
          role: 'admin',
          pin: '772178969',
          active: true,
        };
      } else {
        users.splice(1, 0, INITIAL_ADMIN_MOHANNAD);
      }

      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return users;
    } catch {
      return INITIAL_SYSTEM_USERS;
    }
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
      if (error) console.warn('Supabase app_users sync error:', error.message);
    } catch (e) {
      console.warn('Supabase app_users sync failed:', e);
    }
  },

  /** Load users from Supabase into local storage (cloud is the source of truth). */
  async pullUsersFromCloud(): Promise<UserAccount[]> {
    try {
      const { data, error } = await supabase.from('app_users').select('id,data');
      if (error) {
        console.warn('Supabase app_users load error:', error.message);
        return this.getUsers();
      }
      if (data && data.length > 0) {
        const cloudUsers = data.map((r: any) => r.data as UserAccount);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cloudUsers));
        return this.getUsers();
      }
      const local = this.getUsers();
      await this.pushUsersToCloud(local);
      return local;
    } catch (e) {
      console.warn('Supabase app_users load failed:', e);
      return this.getUsers();
    }
  },

  addUser(user: Omit<UserAccount, 'id' | 'createdAt'>): UserAccount {
    const users = this.getUsers();
    const newUser: UserAccount = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...users, newUser];
    this.saveUsers(updated);
    return newUser;
  },

  updateUser(updatedUser: UserAccount): void {
    const users = this.getUsers();
    const updated = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    this.saveUsers(updated);
  },

  deleteUser(userId: string): void {
    // Prevent deleting main admins
    if (userId === 'usr_admin_younis' || userId === 'usr_admin_mohannad') return;
    const users = this.getUsers();
    const updated = users.filter((u) => u.id !== userId);
    this.saveUsers(updated);
    void supabase.from('app_users').delete().eq('id', userId).then(({ error }) => {
      if (error) console.warn('Supabase app_users delete error:', error.message);
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
    // Clean spaces from phone number (e.g. "772 178 969" -> "772178969")
    const trimmedId = identifier.replace(/\s+/g, '').toLowerCase();
    const cleanPin = pin.replace(/\s+/g, '');
    const users = this.getUsers();

    // Match by phone number, username, or role
    const account = users.find(
      (u) =>
        u.active &&
        (u.phone === trimmedId ||
          u.username.toLowerCase() === trimmedId ||
          u.phone.replace(/^0+/, '') === trimmedId.replace(/^0+/, '') ||
          u.role === trimmedId ||
          (trimmedId === 'admin' && u.role === 'admin'))
    );

    if (!account) {
      return { success: false, error: 'رقم الهاتف أو اسم المستخدم غير موجود' };
    }

    if (account.pin !== cleanPin) {
      return { success: false, error: 'رمز الدخول (PIN) غير صحيح' };
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
