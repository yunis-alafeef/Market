import { Grocery, Supplier, VegetableItem, DailySheet, Voucher, AuditLog, SystemSettings, DailyOrderRow } from '../types';

import { supabase } from './supabase';

export const STORAGE_KEYS = {
  GROCERIES: 'veg_app_groceries_clean_v2',
  SUPPLIERS: 'veg_app_suppliers_clean_v2',
  ITEMS: 'veg_app_items_clean_v2',
  DAILY_SHEETS: 'veg_app_daily_sheets_clean_v2',
  VOUCHERS: 'veg_app_vouchers_clean_v2',
  AUDIT_LOGS: 'veg_app_audit_logs_clean_v2',
  SETTINGS: 'veg_app_settings_clean_v2',
};

// 5 Core Groceries in Yemen with +967 numbers
export const INITIAL_GROCERIES: Grocery[] = [
  { id: 'g1', code: 'ص', name: 'بقالة الصلاح النموذجية', ownerName: 'صلاح العماري', phone: '773456789', balance: 0, creditLimit: 500000, pin: '1111', active: true },
  { id: 'g2', code: 'ح', name: 'سوبرماركت الحرمين', ownerName: 'عبدالله الحرمي', phone: '774567890', balance: 0, creditLimit: 700000, pin: '2222', active: true },
  { id: 'g3', code: 'س', name: 'مجمع السعيد للتموينات', ownerName: 'سعيد باوزير', phone: '775678901', balance: 0, creditLimit: 400000, pin: '3333', active: true },
  { id: 'g4', code: 'ع', name: 'بقالة العاصمة الحديثة', ownerName: 'علي النهدي', phone: '776789012', balance: 0, creditLimit: 600000, pin: '4444', active: true },
  { id: 'g5', code: 'ك', name: 'تموينات الكوثر المركزية', ownerName: 'كمال الصبري', phone: '777890123', balance: 0, creditLimit: 500000, pin: '5555', active: true },
];

// Suppliers in Yemen wholesale vegetable market
export const INITIAL_SUPPLIERS: Supplier[] = [
];

// The 10 Core Vegetable items
export const INITIAL_ITEMS: VegetableItem[] = [
];

// Clean Production System Settings for Younis Al-Afif & Mohannad Al-Ahmadi
export const INITIAL_SETTINGS: SystemSettings = {
  businessName: 'مؤسسة العفيف والأحمدي لتوريد وتوزيع الخضروات والفواكه',
  businessSubname: 'النظام المحاسبي والرقابي لمشتريات وتوزيع سوق الجملة والبقالات',
  phone: '772317950 - 772178969',
  countryCode: '+967',
  taxOrRegNumber: 'س.ت: 894523 | ترخيص سوق الجملة رقم 104',
  address: 'اليمن - سوق الجملة المركزي للخضار والفواكه',
  invoiceNotes: 'البضاعة المباعة خاضعة للمعاينة والتسليم الصباحي المباشر. يرجى توثيق أي ملاحظة فور الاستلام.',
  invoiceFooter: 'شاكرين حسن تعاملكم - إدارة المشتريات والتوزيع / يونس العفيف (772317950) · مهند الأحمدي (772178969)',
  permissions: {
    workerCanAddSupplier: false,
    workerCanAddItem: false,
    workerCanEditPrices: false,
    workerCanViewPurchaseCost: false,
    lockDailySheetAfterSave: true,
  },
};

export function getArabicDayName(dateString: string): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const d = new Date(dateString + 'T12:00:00');
  return days[d.getDay()] || 'اليوم';
}

/**
 * Calculates the effective market date for wholesale produce:
 * - If current time is night shift (>= 18:00 / 6:00 PM), rolls over to next morning's market day.
 * - Otherwise (daytime before 18:00), effective market date is today.
 * - Accurate for Yemen timezone (Asia/Riyadh, UTC+3) or local client time.
 */
export function getEffectiveMarketDate(rolloverHour = 18): {
  dateStr: string;
  dayName: string;
  isNightShift: boolean;
  actualDateStr: string;
  actualDayName: string;
} {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();
  let hours = now.getHours();

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const pMap: Record<string, string> = {};
    parts.forEach((p) => {
      pMap[p.type] = p.value;
    });

    if (pMap.year && pMap.month && pMap.day && pMap.hour) {
      year = parseInt(pMap.year, 10);
      month = parseInt(pMap.month, 10) - 1;
      day = parseInt(pMap.day, 10);
      hours = parseInt(pMap.hour, 10);
    }
  } catch {
    // fallback to local browser time
  }

  const currentDateObj = new Date(year, month, day, 12, 0, 0);
  const actualDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const actualDayName = getArabicDayName(actualDateStr);

  const isNightShift = hours >= rolloverHour;

  let targetDateObj = currentDateObj;
  if (isNightShift) {
    // Advance to tomorrow for evening vegetable market preparation
    targetDateObj = new Date(year, month, day + 1, 12, 0, 0);
  }

  const tYear = targetDateObj.getFullYear();
  const tMonth = targetDateObj.getMonth() + 1;
  const tDay = targetDateObj.getDate();
  const dateStr = `${tYear}-${String(tMonth).padStart(2, '0')}-${String(tDay).padStart(2, '0')}`;
  const dayName = getArabicDayName(dateStr);

  return {
    dateStr,
    dayName,
    isNightShift,
    actualDateStr,
    actualDayName,
  };
}

// Generate clean fresh rows with 0 initial quantity for a new day
export function generateCleanRows(items: VegetableItem[], suppliers: Supplier[], groceries: Grocery[], dateStr: string): DailyOrderRow[] {
  return items.map((item, index) => {
    let supplier = suppliers[0];
    if (['بصل', 'بطاط'].includes(item.name)) supplier = suppliers[1] || suppliers[0];
    else if (['كوسه', 'باميه', 'اسود'].includes(item.name)) supplier = suppliers[2] || suppliers[0];
    else if (['ليم', 'جزر'].includes(item.name)) supplier = suppliers[3] || suppliers[0];

    const quantities: Record<string, number> = {};
    groceries.forEach((g) => {
      quantities[g.id] = 0;
    });

    return {
      id: `row_${dateStr}_${item.id}_${index}`,
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      supplierId: supplier.id,
      supplierName: supplier.name,
      costPrice: item.defaultCostPrice,
      salePrice: item.defaultSalePrice,
      quantities,
      totalQuantity: 0,
      totalCost: 0,
      totalSale: 0,
      profit: 0,
      status: 'pending',
      notes: '',
      morningSorted: groceries.reduce((acc, g) => {
        acc[g.id] = { deliveredQty: 0, confirmed: false };
        return acc;
      }, {} as Record<string, { deliveredQty: number; confirmed: boolean }>),
    };
  });
}

// Clean production daily sheets - starts fresh with effective market day (today or tomorrow night shift)
export function getInitialDailySheets(): DailySheet[] {
  const effective = getEffectiveMarketDate();
  const cleanRows = generateCleanRows(INITIAL_ITEMS, INITIAL_SUPPLIERS, INITIAL_GROCERIES, effective.dateStr);

  return [
    {
      id: `sheet_${effective.dateStr}`,
      date: effective.dateStr,
      dayName: effective.dayName,
      status: 'open',
      rows: cleanRows,
      totalCost: 0,
      totalSale: 0,
      totalProfit: 0,
      notes: effective.isNightShift
        ? `كشف اليومية الافتتاحي - وردية الليل لتجهيز مشتريات ${effective.dayName}`
        : `كشف اليومية الافتتاحي ليوم ${effective.dayName}`,
      nightOrdersSaved: false,
      morningSortGenerated: false,
      createdAt: `${effective.dateStr} 00:00:00`,
      updatedAt: `${effective.dateStr} 00:00:00`,
    },
  ];
}

// Clean vouchers (empty by default for real operations)
export const INITIAL_VOUCHERS: Voucher[] = [];

// Clean initial audit log with system initialization
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_init',
    timestamp: new Date().toLocaleDateString('en-CA') + ' ' + new Date().toTimeString().split(' ')[0],
    user: 'يونس العفيف (مدير النظام)',
    role: 'admin',
    action: 'تهيئة النظام للإنتاج الفعلي',
    target: 'قاعدة بيانات النظام',
    details: 'تم تعيين يونس العفيف مديراً رئيسياً للنظام وإعداد كشف اليومية النظيف',
  },
];

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  return key in memCache ? (memCache[key] as T) : defaultValue;
}

// ---------------------------------------------------------------------------
// Cloud storage (Supabase table `app_kv`): data lives ONLY in the database.
// Nothing is persisted in the browser; memCache is just the in-memory copy.
// ---------------------------------------------------------------------------
const SYNC_KEYS: string[] = Object.values(STORAGE_KEYS);
// Collections stored one database row per record (so concurrent edits never overwrite each other)
const RECORD_KEYS: string[] = SYNC_KEYS.filter((k) => k !== STORAGE_KEYS.SETTINGS);
// Collections displayed newest-first
const NEWEST_FIRST: string[] = [STORAGE_KEYS.VOUCHERS, STORAGE_KEYS.AUDIT_LOGS, STORAGE_KEYS.DAILY_SHEETS];
const memCache: Record<string, any> = {};
const lastSynced: Record<string, string> = {}; // settings (single object)
const snapshot: Record<string, Record<string, string>> = {}; // id -> canonical json as stored in the cloud
const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const pushing: Record<string, boolean> = {};
let cloudReady = false;
export interface SyncStatus {
  loaded: boolean;
  error: string | null;
}
let syncStatus: SyncStatus = { loaded: false, error: null };
const statusListeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}
export function setSyncStatus(patch: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...patch };
  statusListeners.forEach((fn) => fn());
}
export function subscribeSyncStatus(fn: () => void): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}
export function describeError(msg: string): string {
  if (/relation .* does not exist|schema cache|Could not find the table/i.test(msg)) {
    return `جداول قاعدة البيانات غير موجودة في Supabase (نفّذ ملفات SQL): ${msg}`;
  }
  if (/permission denied|row-level security/i.test(msg)) {
    return `لا توجد صلاحية للوصول إلى قاعدة البيانات (تحقق من سياسات RLS): ${msg}`;
  }
  if (/fetch|network|Failed to/i.test(msg)) {
    return `تعذر الاتصال بقاعدة البيانات، تحقق من الإنترنت: ${msg}`;
  }
  return `خطأ في الاتصال بقاعدة البيانات: ${msg}`;
}

function canon(v: unknown): string {
  const sort = (x: any): any => {
    if (Array.isArray(x)) return x.map(sort);
    if (x && typeof x === 'object') {
      return Object.keys(x).sort().reduce((o: any, k) => { o[k] = sort(x[k]); return o; }, {});
    }
    return x;
  };
  return JSON.stringify(sort(v));
}

function toMap(key: string): Record<string, string> {
  const map: Record<string, string> = {};
  const arr = Array.isArray(memCache[key]) ? memCache[key] : [];
  for (const e of arr) if (e && e.id != null) map[String(e.id)] = canon(e);
  return map;
}

function mapsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

function isDirty(key: string): boolean {
  if (!(key in memCache)) return false;
  if (RECORD_KEYS.includes(key)) return !mapsEqual(toMap(key), snapshot[key] || {});
  return canon(memCache[key]) !== lastSynced[key];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function pushNow(key: string): Promise<void> {
  if (!cloudReady || !isDirty(key)) return;
  if (pushing[key]) {
    schedulePush(key);
    return;
  }
  pushing[key] = true;
  try {
    if (RECORD_KEYS.includes(key)) {
      const local = toMap(key);
      const snap = snapshot[key] || {};
      let changedRecords = (memCache[key] as any[]).filter(
        (e) => e && e.id != null && snap[String(e.id)] !== local[String(e.id)]
      );
      if (NEWEST_FIRST.includes(key)) changedRecords = [...changedRecords].reverse();
      const now = new Date().toISOString();
      for (const part of chunk(changedRecords, 200)) {
        const { error } = await supabase.from('app_records').upsert(
          part.map((e) => ({ collection: key, id: String(e.id), data: e, updated_at: now })),
          { onConflict: 'collection,id' }
        );
        if (error) throw new Error(error.message);
      }
      const removed = Object.keys(snap).filter((id) => !(id in local));
      for (const part of chunk(removed, 100)) {
        const { error } = await supabase.from('app_records').delete().eq('collection', key).in('id', part);
        if (error) throw new Error(error.message);
      }
      snapshot[key] = local;
    } else {
      const c = canon(memCache[key]);
      const { error } = await supabase
        .from('app_kv')
        .upsert({ key, value: memCache[key], updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      lastSynced[key] = c;
    }
    if (getSyncStatus().error) setSyncStatus({ error: null });
    if (isDirty(key)) schedulePush(key); // changed while saving
  } catch (e: any) {
    setSyncStatus({ error: describeError(e?.message || String(e)) });
  } finally {
    pushing[key] = false;
  }
}

function schedulePush(key: string): void {
  if (!cloudReady || !SYNC_KEYS.includes(key)) return;
  clearTimeout(pushTimers[key]);
  pushTimers[key] = setTimeout(() => void pushNow(key), 150);
}

export function saveToStorage<T>(key: string, value: T): void {
  memCache[key] = value;
  schedulePush(key);
}

async function fetchAllRecords(): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('app_records')
      .select('collection,id,data,seq')
      .order('seq', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
export const StorageService = {
  getGroceries(): Grocery[] {
    return loadFromStorage(STORAGE_KEYS.GROCERIES, INITIAL_GROCERIES);
  },
  saveGroceries(groceries: Grocery[]): void {
    saveToStorage(STORAGE_KEYS.GROCERIES, groceries);
  },

  getSuppliers(): Supplier[] {
    return loadFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  },
  saveSuppliers(suppliers: Supplier[]): void {
    saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
  },

  getItems(): VegetableItem[] {
    return loadFromStorage(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
  },
  saveItems(items: VegetableItem[]): void {
    saveToStorage(STORAGE_KEYS.ITEMS, items);
  },

  getDailySheets(): DailySheet[] {
    const effective = getEffectiveMarketDate();
    let sheets = loadFromStorage<DailySheet[]>(STORAGE_KEYS.DAILY_SHEETS, []);

    if (!Array.isArray(sheets) || sheets.length === 0) {
      sheets = getInitialDailySheets();
      saveToStorage(STORAGE_KEYS.DAILY_SHEETS, sheets);
      return sheets;
    }

    // Check if the current effective market sheet exists
    const exists = sheets.some((s) => s.date === effective.dateStr);

    if (!exists) {
      // Auto-create new sheet for the effective market date
      const items = this.getItems();
      const suppliers = this.getSuppliers();
      const groceries = this.getGroceries();
      const cleanRows = generateCleanRows(items, suppliers, groceries, effective.dateStr);

      const effectiveSheet: DailySheet = {
        id: `sheet_${effective.dateStr}`,
        date: effective.dateStr,
        dayName: effective.dayName,
        status: 'open',
        rows: cleanRows,
        totalCost: 0,
        totalSale: 0,
        totalProfit: 0,
        notes: effective.isNightShift
          ? `كشف اليومية - وردية الليل لتجهيز مشتريات ${effective.dayName}`
          : `كشف اليومية الرسمي ليوم ${effective.dayName}`,
        nightOrdersSaved: false,
        morningSortGenerated: false,
        createdAt: `${effective.dateStr} 00:00:00`,
        updatedAt: `${effective.dateStr} 00:00:00`,
      };

      sheets = [effectiveSheet, ...sheets];
      saveToStorage(STORAGE_KEYS.DAILY_SHEETS, sheets);
    }

    // Sort sheets by date descending so the latest date is always at the top
    sheets.sort((a, b) => b.date.localeCompare(a.date));
    return sheets;
  },
  saveDailySheets(sheets: DailySheet[]): void {
    saveToStorage(STORAGE_KEYS.DAILY_SHEETS, sheets);
  },

  getVouchers(): Voucher[] {
    return loadFromStorage(STORAGE_KEYS.VOUCHERS, INITIAL_VOUCHERS);
  },
  saveVouchers(vouchers: Voucher[]): void {
    saveToStorage(STORAGE_KEYS.VOUCHERS, vouchers);
  },

  getAuditLogs(): AuditLog[] {
    return loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },
  saveAuditLogs(logs: AuditLog[]): void {
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  },
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const current = this.getAuditLogs();
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-CA') + ' ' + now.toTimeString().split(' ')[0];
    const newEntry: AuditLog = {
      ...log,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: timeStr,
    };
    const updated = [newEntry, ...current].slice(0, 300);
    this.saveAuditLogs(updated);
  },

  getSettings(): SystemSettings {
    return loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },
  saveSettings(settings: SystemSettings): void {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  },

  /**
   * Pull the latest data from Supabase into the in-memory cache.
   * Returns the list of storage keys whose value changed. Connection errors are reported.
   */
  async syncFromCloud(): Promise<string[]> {
    const changed: string[] = [];
    try {
      const rows = await fetchAllRecords();
      const { data: kv, error: kvErr } = await supabase.from('app_kv').select('key,value');
      if (kvErr) throw new Error(kvErr.message);
      const kvMap: Record<string, any> = {};
      (kv || []).forEach((r: any) => (kvMap[r.key] = r.value));

      const firstSync = !cloudReady;
      const byKey: Record<string, any[]> = {};
      rows.forEach((r) => (byKey[r.collection] ||= []).push(r));

      for (const key of RECORD_KEYS) {
        const cr = byKey[key] || [];
        const cloudMap: Record<string, string> = {};
        cr.forEach((r) => (cloudMap[String(r.id)] = canon(r.data)));
        const localMap = toMap(key);
        if (mapsEqual(localMap, cloudMap)) {
          snapshot[key] = cloudMap;
          continue;
        }
        if (cr.length === 0) {
          // Nothing in cloud yet: migrate legacy array (older app_kv format) or keep local defaults
          const legacy = kvMap[key];
          if (firstSync && Array.isArray(legacy) && legacy.length > 0) {
            memCache[key] = legacy;
            snapshot[key] = {};
            changed.push(key);
          } else if (!firstSync && !isDirty(key)) {
            memCache[key] = [];
            snapshot[key] = {};
            changed.push(key);
          }
          continue;
        }
        if (firstSync || !isDirty(key)) {
          const arr = cr.map((r) => r.data);
          memCache[key] = NEWEST_FIRST.includes(key) ? arr.reverse() : arr;
          snapshot[key] = cloudMap;
          changed.push(key);
        }
        // else: local edits not yet saved -> they are pushed below and win
      }

      const sKey = STORAGE_KEYS.SETTINGS;
      if (kvMap[sKey] !== undefined) {
        const cloudC = canon(kvMap[sKey]);
        const localC = sKey in memCache ? canon(memCache[sKey]) : null;
        if (cloudC === localC) {
          lastSynced[sKey] = cloudC;
        } else if (firstSync || localC === lastSynced[sKey]) {
          memCache[sKey] = kvMap[sKey];
          lastSynced[sKey] = cloudC;
          changed.push(sKey);
        }
      }

      if (firstSync) cloudReady = true;
      SYNC_KEYS.forEach((k) => {
        if (isDirty(k)) schedulePush(k);
      });
      setSyncStatus({ error: null, loaded: true });
    } catch (e: any) {
      setSyncStatus({ error: describeError(e?.message || String(e)) });
    }
    return changed;
  },

  resetAllData(): void {
    SYNC_KEYS.forEach((k) => {
      delete lastSynced[k];
      delete snapshot[k];
      delete memCache[k];
    });
    void supabase.from('app_records').delete().in('collection', RECORD_KEYS).then(({ error }) => {
      if (error) setSyncStatus({ error: describeError(error.message) });
    });
    void supabase.from('app_kv').delete().in('key', SYNC_KEYS).then(({ error }) => {
      if (error) setSyncStatus({ error: describeError(error.message) });
    });
  },
};