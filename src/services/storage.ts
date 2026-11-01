import { Grocery, Supplier, VegetableItem, DailySheet, Voucher, AuditLog, SystemSettings, DailyOrderRow, UserAccount } from '../types';

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
 * Returns deterministic current date and time in Yemen timezone (Asia/Riyadh, UTC+3).
 */
export function getYemenNow(): {
  dateStr: string;
  time24: string;
  time12: string;
  fullTimestamp: string;
} {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const pMap: Record<string, string> = {};
    parts.forEach((p) => {
      pMap[p.type] = p.value;
    });

    if (pMap.year && pMap.month && pMap.day) {
      year = parseInt(pMap.year, 10);
      month = parseInt(pMap.month, 10);
      day = parseInt(pMap.day, 10);
      hours = parseInt(pMap.hour || '0', 10) % 24;
      minutes = parseInt(pMap.minute || '0', 10);
      seconds = parseInt(pMap.second || '0', 10);
    }
  } catch {
    // fallback to local browser time
  }

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? 'ص' : 'م';
  const time12 = `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;

  return {
    dateStr,
    time24,
    time12,
    fullTimestamp: `${dateStr} ${time24}`,
  };
}

/**
 * Safely extracts a 12-hour Arabic time string (e.g. "02:35 ص") from stored timestamp/time fields.
 * Returns null if the record has no valid stored time (prevents inventing fake times for old records).
 */
export function extractTime12(...candidates: (string | undefined | null)[]): string | null {
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const s = raw.trim();
    if (!s || s.includes('?')) continue;
    // Pure date only
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    // Placeholder midnight timestamp on initial open sheets
    if (s.endsWith('00:00:00')) continue;

    // Already formatted with Arabic AM/PM (e.g. "02:35 ص" or "2026-11-01 02:35 ص" or "02:35:10 م")
    const arMatch = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([صم])/);
    if (arMatch) {
      const hh = String(parseInt(arMatch[1], 10)).padStart(2, '0');
      const mm = arMatch[2];
      const period = arMatch[3];
      return `${hh}:${mm} ${period}`;
    }

    // ISO timestamp (e.g. "2026-10-31T22:16:35.836Z")
    if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s))) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        try {
          const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Riyadh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).formatToParts(d);
          const pMap: Record<string, string> = {};
          parts.forEach((p) => {
            pMap[p.type] = p.value;
          });
          if (pMap.hour && pMap.minute) {
            const hours = parseInt(pMap.hour, 10) % 24;
            const minutes = parseInt(pMap.minute, 10);
            const h12 = hours % 12 || 12;
            const ampm = hours < 12 ? 'ص' : 'م';
            return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
          }
        } catch {
          const hours = d.getHours();
          const minutes = d.getMinutes();
          const h12 = hours % 12 || 12;
          const ampm = hours < 12 ? 'ص' : 'م';
          return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
        }
      }
    }

    // "YYYY-MM-DD HH:MM:SS" or "HH:MM:SS" or "HH:MM"
    const time24Match = s.match(/(?:^\d{4}-\d{2}-\d{2}\s+|^)(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (time24Match) {
      const hours = parseInt(time24Match[1], 10);
      const minutes = parseInt(time24Match[2], 10);
      const seconds = time24Match[3] ? parseInt(time24Match[3], 10) : 0;
      if (hours === 0 && minutes === 0 && seconds === 0) continue;
      const h12 = hours % 12 || 12;
      const ampm = hours < 12 ? 'ص' : 'م';
      return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }
  }
  return null;
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
      supplierId: supplier?.id || "",
      supplierName: supplier?.name || "مورد عام",
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

// Clean initial audit log (empty by default for clean financial testing)
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

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
      // Unique ids per batch (a duplicate id in one upsert is rejected by Postgres)
      changedRecords = Array.from(new Map(changedRecords.map((e) => [String(e.id), e])).values());
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
    const items = this.getItems();
    const suppliers = this.getSuppliers();
    const groceries = this.getGroceries();

    if (!Array.isArray(sheets) || sheets.length === 0) {
      const cleanRows = generateCleanRows(items, suppliers, groceries, effective.dateStr);
      sheets = [
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
      saveToStorage(STORAGE_KEYS.DAILY_SHEETS, sheets);
      return sheets;
    }

    // Check if the current effective market sheet exists
    const exists = sheets.some((s) => s.date === effective.dateStr);

    if (!exists) {
      // Auto-create new sheet for the effective market date
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
    } else {
      // If an open sheet has 0 rows while master items exist, populate clean rows
      let updated = false;
      sheets = sheets.map((s) => {
        if (s.status !== 'settled' && (!s.rows || s.rows.length === 0) && items.length > 0) {
          updated = true;
          return {
            ...s,
            rows: generateCleanRows(items, suppliers, groceries, s.date),
            totalCost: 0,
            totalSale: 0,
            totalProfit: 0,
          };
        }
        return s;
      });
      if (updated) saveToStorage(STORAGE_KEYS.DAILY_SHEETS, sheets);
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

  /**
   * Pure accounting recalculation of all supplier balances from actual settled sheets
   * minus active supplier payment vouchers.
   */
  computeSuppliersWithRecalculatedBalances(
    sheets: DailySheet[],
    vouchers: Voucher[],
    suppliers: Supplier[]
  ): Supplier[] {
    const supplierPurchases: Record<string, number> = {};
    const supplierPaid: Record<string, number> = {};

    sheets.forEach((s) => {
      if (s.status === 'settled') {
        s.rows.forEach((r) => {
          const unitCost = Math.max(0, Number(r.costPrice) || 0);
          let sumGroceryQty = 0;
          Object.values(r.quantities || {}).forEach((qVal) => {
            const q = Math.max(0, Number(qVal) || 0);
            if (q > 0) sumGroceryQty += q;
          });
          sumGroceryQty = Math.round(sumGroceryQty * 100) / 100;

          const cleanSupplierName = (r.supplierName || '').replace(' (مورد إضافي)', '').trim();
          const matchedSupplierId =
            r.supplierId ||
            suppliers.find((sup) => sup.name === r.supplierName || sup.name === cleanSupplierName)?.id ||
            suppliers[0]?.id ||
            '';
          if (matchedSupplierId && unitCost > 0) {
            const rowQty = sumGroceryQty > 0 ? sumGroceryQty : Math.max(0, Number(r.totalQuantity) || 0);
            const lineCost = Math.round(rowQty * unitCost * 100) / 100;
            supplierPurchases[matchedSupplierId] =
              Math.round(((supplierPurchases[matchedSupplierId] || 0) + lineCost) * 100) / 100;
          }
        });
      }
    });

    vouchers.forEach((v) => {
      if (v.partyType === 'supplier' && v.type === 'payment') {
        const amt = Math.max(0, Number(v.amount) || 0);
        supplierPaid[v.partyId] = Math.round(((supplierPaid[v.partyId] || 0) + amt) * 100) / 100;
      }
    });

    return suppliers.map((s) => {
      const totalOwed = Math.round((supplierPurchases[s.id] || 0) * 100) / 100;
      const totalPaid = Math.round((supplierPaid[s.id] || 0) * 100) / 100;
      const netBal = Math.round((totalOwed - totalPaid) * 100) / 100;
      return { ...s, balance: netBal };
    });
  },

  /**
   * Transactional Admin-only update of a Supplier Payment Voucher.
   * Replaces the old voucher effect in-place without duplication, recalculates supplier balances
   * from actual ledger entries, logs the audit trail, and rolls back if database flush fails.
   */
  async updateSupplierPaymentVoucher(params: {
    actor?: UserAccount | null;
    voucherId: string;
    updates: {
      partyId: string;
      amount: number;
      date: string;
      paymentMethod: 'cash' | 'transfer' | 'check';
      referenceNumber?: string;
      notes: string;
    };
  }): Promise<{
    success: boolean;
    voucher?: Voucher;
    vouchers?: Voucher[];
    suppliers?: Supplier[];
    auditLogs?: AuditLog[];
    error?: string;
  }> {
    // 1. Backend/Service Admin Permission Verification
    if (!params.actor || params.actor.role !== 'admin' || !params.actor.active) {
      return {
        success: false,
        error: '⛔ غير مصرح: تعديل السندات المالية مخصص لمدير النظام فقط ولا يملك العامل صلاحية التعديل.',
      };
    }

    try {
      const { data: cloudAdminRows, error: cloudErr } = await supabase
        .from('app_users')
        .select('id,data')
        .eq('id', params.actor.id)
        .limit(1);
      if (!cloudErr && cloudAdminRows && cloudAdminRows.length > 0) {
        const cloudAdmin = cloudAdminRows[0].data as UserAccount;
        if (!cloudAdmin || cloudAdmin.role !== 'admin' || !cloudAdmin.active) {
          return {
            success: false,
            error: '⛔ غير مصرح من الخادم: الحساب الحالي لا يملك صلاحية مدير النظام.',
          };
        }
      }
    } catch {
      // Fallback to verified session check if offline
    }

    // 2. Validate inputs
    const cleanAmount = Math.round((Number(params.updates.amount) || 0) * 100) / 100;
    if (cleanAmount <= 0) {
      return { success: false, error: '⚠️ يرجى إدخال مبلغ صحيح أكبر من الصفر.' };
    }
    const cleanDate = String(params.updates.date || '').trim();
    if (!cleanDate) {
      return { success: false, error: '⚠️ يرجى تحديد تاريخ السند.' };
    }

    // 3. Snapshot pre-transaction state for rollback safety
    const prevVouchers = [...this.getVouchers()];
    const prevSuppliers = [...this.getSuppliers()];
    const prevAuditLogs = [...this.getAuditLogs()];
    const currentSheets = this.getDailySheets();

    const targetIndex = prevVouchers.findIndex((v) => v.id === params.voucherId);
    if (targetIndex === -1) {
      return { success: false, error: '⚠️ السند المطلوب تعديله غير موجود.' };
    }

    const oldVoucher = prevVouchers[targetIndex];
    if (oldVoucher.type !== 'payment' || oldVoucher.partyType !== 'supplier') {
      return {
        success: false,
        error: '⚠️ هذا الإجراء مخصص لسندات الصرف الخاصة بالموردين فقط.',
      };
    }

    const targetSupplier = prevSuppliers.find((s) => s.id === params.updates.partyId);
    if (!targetSupplier) {
      return { success: false, error: '⚠️ المورد المحدد غير موجود في النظام.' };
    }

    // Calculate pre-update supplier balance
    const preBalancedSuppliers = this.computeSuppliersWithRecalculatedBalances(
      currentSheets,
      prevVouchers,
      prevSuppliers
    );
    const oldSupplierBal =
      preBalancedSuppliers.find((s) => s.id === oldVoucher.partyId)?.balance ?? 0;

    // 4. Construct updated voucher in-place (preserving exact id and voucherNumber -> zero duplication)
    const updatedVoucher: Voucher = {
      ...oldVoucher,
      id: oldVoucher.id,
      voucherNumber: oldVoucher.voucherNumber,
      type: 'payment',
      partyType: 'supplier',
      partyId: targetSupplier.id,
      partyName: targetSupplier.name,
      amount: cleanAmount,
      date: cleanDate,
      paymentMethod: params.updates.paymentMethod,
      referenceNumber:
        params.updates.referenceNumber !== undefined
          ? params.updates.referenceNumber
          : oldVoucher.referenceNumber,
      notes: String(params.updates.notes || '').trim() || 'سداد مستحقات توريد',
    };

    const nextVouchers = prevVouchers.map((v, idx) =>
      idx === targetIndex ? updatedVoucher : v
    );
    const nextSuppliers = this.computeSuppliersWithRecalculatedBalances(
      currentSheets,
      nextVouchers,
      prevSuppliers
    );
    const newSupplierBal =
      nextSuppliers.find((s) => s.id === targetSupplier.id)?.balance ?? 0;

    const yemen = getYemenNow();
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: `${yemen.dateStr} ${yemen.time24}`,
      user: params.actor.name,
      role: 'admin',
      action: 'تعديل سند صرف مورد',
      target: `${updatedVoucher.voucherNumber} (${updatedVoucher.partyName})`,
      oldValue: `المورد: ${oldVoucher.partyName} | المبلغ: ${oldVoucher.amount.toLocaleString()} ر.ي | التاريخ: ${oldVoucher.date} | الرصيد السابق: ${oldSupplierBal.toLocaleString()} ر.ي`,
      newValue: `المورد: ${updatedVoucher.partyName} | المبلغ: ${updatedVoucher.amount.toLocaleString()} ر.ي | التاريخ: ${updatedVoucher.date} | الرصيد المحدث: ${newSupplierBal.toLocaleString()} ر.ي`,
      details: `قام المدير (${params.actor.name}) بتعديل سند الصرف رقم ${updatedVoucher.voucherNumber} بتاريخ ${yemen.dateStr} ${yemen.time12}. البيان: ${updatedVoucher.notes}`,
    };
    const nextAuditLogs = [auditEntry, ...prevAuditLogs].slice(0, 300);

    // 5. Commit transaction & flush to Supabase (rollback on failure)
    this.saveVouchers(nextVouchers);
    this.saveSuppliers(nextSuppliers);
    this.saveAuditLogs(nextAuditLogs);

    const flushRes = await this.flushAll();
    if (!flushRes.success) {
      // Rollback in-memory state
      this.saveVouchers(prevVouchers);
      this.saveSuppliers(prevSuppliers);
      this.saveAuditLogs(prevAuditLogs);
      return {
        success: false,
        error: `❌ فشل حفظ تعديل السند في قاعدة البيانات (تم التراجع تلقائياً لحماية الأرصدة): ${flushRes.error}`,
      };
    }

    return {
      success: true,
      voucher: updatedVoucher,
      vouchers: nextVouchers,
      suppliers: nextSuppliers,
      auditLogs: nextAuditLogs,
    };
  },

  /**
   * Transactional Admin-only deletion / accounting reversal of a Supplier Payment Voucher.
   * Cancels the voucher's financial effect, recalculates supplier balances from actual ledger entries
   * (preserving all subsequent/prior operations accurately), preserves historical audit records,
   * and rolls back if database flush fails.
   */
  async deleteSupplierPaymentVoucher(params: {
    actor?: UserAccount | null;
    voucherId: string;
  }): Promise<{
    success: boolean;
    deletedVoucher?: Voucher;
    vouchers?: Voucher[];
    suppliers?: Supplier[];
    auditLogs?: AuditLog[];
    error?: string;
  }> {
    // 1. Backend/Service Admin Permission Verification
    if (!params.actor || params.actor.role !== 'admin' || !params.actor.active) {
      return {
        success: false,
        error: '⛔ غير مصرح: حذف السندات المالية مخصص لمدير النظام فقط ولا يملك العامل صلاحية الحذف.',
      };
    }

    try {
      const { data: cloudAdminRows, error: cloudErr } = await supabase
        .from('app_users')
        .select('id,data')
        .eq('id', params.actor.id)
        .limit(1);
      if (!cloudErr && cloudAdminRows && cloudAdminRows.length > 0) {
        const cloudAdmin = cloudAdminRows[0].data as UserAccount;
        if (!cloudAdmin || cloudAdmin.role !== 'admin' || !cloudAdmin.active) {
          return {
            success: false,
            error: '⛔ غير مصرح من الخادم: الحساب الحالي لا يملك صلاحية مدير النظام.',
          };
        }
      }
    } catch {
      // Fallback to verified session check if offline
    }

    // 2. Snapshot pre-transaction state for rollback safety
    const prevVouchers = [...this.getVouchers()];
    const prevSuppliers = [...this.getSuppliers()];
    const prevAuditLogs = [...this.getAuditLogs()];
    const currentSheets = this.getDailySheets();

    const targetVoucher = prevVouchers.find((v) => v.id === params.voucherId);
    if (!targetVoucher) {
      return { success: false, error: '⚠️ السند المطلوب حذفه غير موجود.' };
    }
    if (targetVoucher.type !== 'payment' || targetVoucher.partyType !== 'supplier') {
      return {
        success: false,
        error: '⚠️ هذا الإجراء مخصص لسندات الصرف الخاصة بالموردين فقط.',
      };
    }

    const preBalancedSuppliers = this.computeSuppliersWithRecalculatedBalances(
      currentSheets,
      prevVouchers,
      prevSuppliers
    );
    const oldSupplierBal =
      preBalancedSuppliers.find((s) => s.id === targetVoucher.partyId)?.balance ?? 0;

    // 3. Remove only the target voucher and recalculate balances from actual ledger entries
    const nextVouchers = prevVouchers.filter((v) => v.id !== params.voucherId);
    const nextSuppliers = this.computeSuppliersWithRecalculatedBalances(
      currentSheets,
      nextVouchers,
      prevSuppliers
    );
    const newSupplierBal =
      nextSuppliers.find((s) => s.id === targetVoucher.partyId)?.balance ?? 0;

    // 4. Record full historical reversal / deletion in AuditLog
    const yemen = getYemenNow();
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: `${yemen.dateStr} ${yemen.time24}`,
      user: params.actor.name,
      role: 'admin',
      action: 'حذف وإلغاء سند صرف مورد',
      target: `${targetVoucher.voucherNumber} (${targetVoucher.partyName})`,
      oldValue: `مبلغ السند الملغي: ${targetVoucher.amount.toLocaleString()} ر.ي | رصيد المورد قبل الإلغاء: ${oldSupplierBal.toLocaleString()} ر.ي`,
      newValue: `تم إلغاء أثر السند | رصيد المورد بعد إعادة الاحتساب: ${newSupplierBal.toLocaleString()} ر.ي`,
      details: `قام المدير (${params.actor.name}) بحذف وإلغاء الأثر المحاسبي لسند الصرف رقم ${targetVoucher.voucherNumber} للمورد (${targetVoucher.partyName}) بمبلغ ${targetVoucher.amount.toLocaleString()} ر.ي (تاريخ السند الأصلي: ${targetVoucher.date}، طريقة الدفع: ${targetVoucher.paymentMethod}، البيان الأصلي: ${targetVoucher.notes}).`,
    };
    const nextAuditLogs = [auditEntry, ...prevAuditLogs].slice(0, 300);

    // 5. Commit transaction & flush to Supabase (rollback on failure)
    this.saveVouchers(nextVouchers);
    this.saveSuppliers(nextSuppliers);
    this.saveAuditLogs(nextAuditLogs);

    const flushRes = await this.flushAll();
    if (!flushRes.success) {
      // Rollback in-memory state
      this.saveVouchers(prevVouchers);
      this.saveSuppliers(prevSuppliers);
      this.saveAuditLogs(prevAuditLogs);
      return {
        success: false,
        error: `❌ فشل حذف السند في قاعدة البيانات (تم التراجع تلقائياً لحماية الأرصدة): ${flushRes.error}`,
      };
    }

    return {
      success: true,
      deletedVoucher: targetVoucher,
      vouchers: nextVouchers,
      suppliers: nextSuppliers,
      auditLogs: nextAuditLogs,
    };
  },

  /**
   * Pure accounting recalculation of all grocery balances from actual settled sheets
   * minus active grocery receipt vouchers.
   */
  computeGroceriesWithRecalculatedBalances(
    sheets: DailySheet[],
    vouchers: Voucher[],
    groceries: Grocery[]
  ): Grocery[] {
    const groceryPurchases: Record<string, number> = {};
    const groceryPaid: Record<string, number> = {};

    sheets.forEach((s) => {
      if (s.status === 'settled') {
        s.rows.forEach((r) => {
          const unitCost = Math.max(0, Number(r.costPrice) || 0);
          if (unitCost > 0) {
            Object.entries(r.quantities || {}).forEach(([gId, qVal]) => {
              const q = Math.max(0, Number(qVal) || 0);
              if (q > 0) {
                const lineAmount = Math.round(q * unitCost * 100) / 100;
                groceryPurchases[gId] =
                  Math.round(((groceryPurchases[gId] || 0) + lineAmount) * 100) / 100;
              }
            });
          }
        });
      }
    });

    vouchers.forEach((v) => {
      if (v.partyType === 'grocery' && v.type === 'receipt') {
        const amt = Math.max(0, Number(v.amount) || 0);
        groceryPaid[v.partyId] = Math.round(((groceryPaid[v.partyId] || 0) + amt) * 100) / 100;
      }
    });

    return groceries.map((g) => {
      const totalDebit = Math.round((groceryPurchases[g.id] || 0) * 100) / 100;
      const totalCredit = Math.round((groceryPaid[g.id] || 0) * 100) / 100;
      const netBal = Math.round((totalDebit - totalCredit) * 100) / 100;
      return { ...g, balance: netBal };
    });
  },

  /**
   * Transactional Admin-only update of a Grocery Receipt Voucher.
   * Replaces the old voucher effect in-place without duplication, recalculates grocery balances
   * from actual ledger entries, logs the audit trail, and rolls back if database flush fails.
   */
  async updateGroceryReceiptVoucher(params: {
    actor?: UserAccount | null;
    voucherId: string;
    updates: {
      partyId: string;
      amount: number;
      date: string;
      paymentMethod: 'cash' | 'transfer' | 'check';
      referenceNumber?: string;
      notes: string;
    };
  }): Promise<{
    success: boolean;
    voucher?: Voucher;
    vouchers?: Voucher[];
    groceries?: Grocery[];
    auditLogs?: AuditLog[];
    error?: string;
  }> {
    // 1. Backend/Service Admin Permission Verification
    if (!params.actor || params.actor.role !== 'admin' || !params.actor.active) {
      return {
        success: false,
        error: '⛔ غير مصرح: تعديل سندات القبض مخصص لمدير النظام فقط ولا يملك العامل صلاحية التعديل.',
      };
    }

    try {
      const { data: cloudAdminRows, error: cloudErr } = await supabase
        .from('app_users')
        .select('id,data')
        .eq('id', params.actor.id)
        .limit(1);
      if (!cloudErr && cloudAdminRows && cloudAdminRows.length > 0) {
        const cloudAdmin = cloudAdminRows[0].data as UserAccount;
        if (!cloudAdmin || cloudAdmin.role !== 'admin' || !cloudAdmin.active) {
          return {
            success: false,
            error: '⛔ غير مصرح من الخادم: الحساب الحالي لا يملك صلاحية مدير النظام.',
          };
        }
      }
    } catch {
      // Fallback to verified session check if offline
    }

    // 2. Validate inputs
    const cleanAmount = Math.round((Number(params.updates.amount) || 0) * 100) / 100;
    if (cleanAmount <= 0) {
      return { success: false, error: '⚠️ يرجى إدخال مبلغ صحيح أكبر من الصفر.' };
    }
    const cleanDate = String(params.updates.date || '').trim();
    if (!cleanDate) {
      return { success: false, error: '⚠️ يرجى تحديد تاريخ السند.' };
    }

    // 3. Snapshot pre-transaction state for rollback safety
    const prevVouchers = [...this.getVouchers()];
    const prevGroceries = [...this.getGroceries()];
    const prevAuditLogs = [...this.getAuditLogs()];
    const currentSheets = this.getDailySheets();

    const targetIndex = prevVouchers.findIndex((v) => v.id === params.voucherId);
    if (targetIndex === -1) {
      return { success: false, error: '⚠️ السند المطلوب تعديله غير موجود.' };
    }

    const oldVoucher = prevVouchers[targetIndex];
    if (oldVoucher.type !== 'receipt' || oldVoucher.partyType !== 'grocery') {
      return {
        success: false,
        error: '⚠️ هذا الإجراء مخصص لسندات القبض الخاصة بالبقالات فقط.',
      };
    }

    const targetGrocery = prevGroceries.find((g) => g.id === params.updates.partyId);
    if (!targetGrocery) {
      return { success: false, error: '⚠️ البقالة المحددة غير موجودة في النظام.' };
    }

    const preBalancedGroceries = this.computeGroceriesWithRecalculatedBalances(
      currentSheets,
      prevVouchers,
      prevGroceries
    );
    const oldGroceryBal =
      preBalancedGroceries.find((g) => g.id === oldVoucher.partyId)?.balance ?? 0;

    // 4. Construct updated voucher in-place (preserving exact id and voucherNumber -> zero duplication)
    const updatedVoucher: Voucher = {
      ...oldVoucher,
      id: oldVoucher.id,
      voucherNumber: oldVoucher.voucherNumber,
      type: 'receipt',
      partyType: 'grocery',
      partyId: targetGrocery.id,
      partyName: targetGrocery.name,
      partyCode: targetGrocery.code,
      amount: cleanAmount,
      date: cleanDate,
      paymentMethod: params.updates.paymentMethod,
      referenceNumber:
        params.updates.referenceNumber !== undefined
          ? params.updates.referenceNumber
          : oldVoucher.referenceNumber,
      notes: String(params.updates.notes || '').trim() || 'دفعة سداد من حساب البقالة',
    };

    const nextVouchers = prevVouchers.map((v, idx) =>
      idx === targetIndex ? updatedVoucher : v
    );
    const nextGroceries = this.computeGroceriesWithRecalculatedBalances(
      currentSheets,
      nextVouchers,
      prevGroceries
    );
    const newGroceryBal =
      nextGroceries.find((g) => g.id === targetGrocery.id)?.balance ?? 0;

    const yemen = getYemenNow();
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: `${yemen.dateStr} ${yemen.time24}`,
      user: params.actor.name,
      role: 'admin',
      action: 'تعديل سند قبض بقالة',
      target: `${updatedVoucher.voucherNumber} (${updatedVoucher.partyName})`,
      oldValue: `البقالة: ${oldVoucher.partyName} | المبلغ: ${oldVoucher.amount.toLocaleString()} ر.ي | التاريخ: ${oldVoucher.date} | الرصيد السابق: ${oldGroceryBal.toLocaleString()} ر.ي`,
      newValue: `البقالة: ${updatedVoucher.partyName} | المبلغ: ${updatedVoucher.amount.toLocaleString()} ر.ي | التاريخ: ${updatedVoucher.date} | الرصيد المحدث: ${newGroceryBal.toLocaleString()} ر.ي`,
      details: `قام المدير (${params.actor.name}) بتعديل سند القبض رقم ${updatedVoucher.voucherNumber} بتاريخ ${yemen.dateStr} ${yemen.time12}. البيان: ${updatedVoucher.notes}`,
    };
    const nextAuditLogs = [auditEntry, ...prevAuditLogs].slice(0, 300);

    // 5. Commit transaction & flush to Supabase (rollback on failure)
    this.saveVouchers(nextVouchers);
    this.saveGroceries(nextGroceries);
    this.saveAuditLogs(nextAuditLogs);

    const flushRes = await this.flushAll();
    if (!flushRes.success) {
      this.saveVouchers(prevVouchers);
      this.saveGroceries(prevGroceries);
      this.saveAuditLogs(prevAuditLogs);
      return {
        success: false,
        error: `❌ فشل حفظ تعديل سند القبض في قاعدة البيانات (تم التراجع تلقائياً لحماية الأرصدة): ${flushRes.error}`,
      };
    }

    return {
      success: true,
      voucher: updatedVoucher,
      vouchers: nextVouchers,
      groceries: nextGroceries,
      auditLogs: nextAuditLogs,
    };
  },

  /**
   * Transactional Admin-only deletion / accounting reversal of a Grocery Receipt Voucher.
   * Cancels the voucher's financial effect, recalculates grocery balances from actual ledger entries
   * (preserving all subsequent/prior operations accurately), preserves historical audit records,
   * and rolls back if database flush fails.
   */
  async deleteGroceryReceiptVoucher(params: {
    actor?: UserAccount | null;
    voucherId: string;
  }): Promise<{
    success: boolean;
    deletedVoucher?: Voucher;
    vouchers?: Voucher[];
    groceries?: Grocery[];
    auditLogs?: AuditLog[];
    error?: string;
  }> {
    // 1. Backend/Service Admin Permission Verification
    if (!params.actor || params.actor.role !== 'admin' || !params.actor.active) {
      return {
        success: false,
        error: '⛔ غير مصرح: حذف سندات القبض مخصص لمدير النظام فقط ولا يملك العامل صلاحية الحذف.',
      };
    }

    try {
      const { data: cloudAdminRows, error: cloudErr } = await supabase
        .from('app_users')
        .select('id,data')
        .eq('id', params.actor.id)
        .limit(1);
      if (!cloudErr && cloudAdminRows && cloudAdminRows.length > 0) {
        const cloudAdmin = cloudAdminRows[0].data as UserAccount;
        if (!cloudAdmin || cloudAdmin.role !== 'admin' || !cloudAdmin.active) {
          return {
            success: false,
            error: '⛔ غير مصرح من الخادم: الحساب الحالي لا يملك صلاحية مدير النظام.',
          };
        }
      }
    } catch {
      // Fallback to verified session check if offline
    }

    // 2. Snapshot pre-transaction state for rollback safety
    const prevVouchers = [...this.getVouchers()];
    const prevGroceries = [...this.getGroceries()];
    const prevAuditLogs = [...this.getAuditLogs()];
    const currentSheets = this.getDailySheets();

    const targetVoucher = prevVouchers.find((v) => v.id === params.voucherId);
    if (!targetVoucher) {
      return { success: false, error: '⚠️ السند المطلوب حذفه غير موجود.' };
    }
    if (targetVoucher.type !== 'receipt' || targetVoucher.partyType !== 'grocery') {
      return {
        success: false,
        error: '⚠️ هذا الإجراء مخصص لسندات القبض الخاصة بالبقالات فقط.',
      };
    }

    const preBalancedGroceries = this.computeGroceriesWithRecalculatedBalances(
      currentSheets,
      prevVouchers,
      prevGroceries
    );
    const oldGroceryBal =
      preBalancedGroceries.find((g) => g.id === targetVoucher.partyId)?.balance ?? 0;

    // 3. Remove only the target voucher and recalculate balances from actual ledger entries
    const nextVouchers = prevVouchers.filter((v) => v.id !== params.voucherId);
    const nextGroceries = this.computeGroceriesWithRecalculatedBalances(
      currentSheets,
      nextVouchers,
      prevGroceries
    );
    const newGroceryBal =
      nextGroceries.find((g) => g.id === targetVoucher.partyId)?.balance ?? 0;

    // 4. Record full historical reversal / deletion in AuditLog
    const yemen = getYemenNow();
    const auditEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: `${yemen.dateStr} ${yemen.time24}`,
      user: params.actor.name,
      role: 'admin',
      action: 'حذف وإلغاء سند قبض بقالة',
      target: `${targetVoucher.voucherNumber} (${targetVoucher.partyName})`,
      oldValue: `مبلغ السند الملغي: ${targetVoucher.amount.toLocaleString()} ر.ي | رصيد البقالة قبل الإلغاء: ${oldGroceryBal.toLocaleString()} ر.ي`,
      newValue: `تم إلغاء أثر السند | رصيد البقالة بعد إعادة الاحتساب: ${newGroceryBal.toLocaleString()} ر.ي`,
      details: `قام المدير (${params.actor.name}) بحذف وإلغاء الأثر المحاسبي لسند القبض رقم ${targetVoucher.voucherNumber} للبقالة (${targetVoucher.partyName}) بمبلغ ${targetVoucher.amount.toLocaleString()} ر.ي (تاريخ السند الأصلي: ${targetVoucher.date}، طريقة القبض: ${targetVoucher.paymentMethod}، البيان الأصلي: ${targetVoucher.notes}).`,
    };
    const nextAuditLogs = [auditEntry, ...prevAuditLogs].slice(0, 300);

    // 5. Commit transaction & flush to Supabase (rollback on failure)
    this.saveVouchers(nextVouchers);
    this.saveGroceries(nextGroceries);
    this.saveAuditLogs(nextAuditLogs);

    const flushRes = await this.flushAll();
    if (!flushRes.success) {
      this.saveVouchers(prevVouchers);
      this.saveGroceries(prevGroceries);
      this.saveAuditLogs(prevAuditLogs);
      return {
        success: false,
        error: `❌ فشل حذف سند القبض في قاعدة البيانات (تم التراجع تلقائياً لحماية الأرصدة): ${flushRes.error}`,
      };
    }

    return {
      success: true,
      deletedVoucher: targetVoucher,
      vouchers: nextVouchers,
      groceries: nextGroceries,
      auditLogs: nextAuditLogs,
    };
  },

  getAuditLogs(): AuditLog[] {
    return loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },
  saveAuditLogs(logs: AuditLog[]): void {
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  },
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const current = this.getAuditLogs();
    const yemen = getYemenNow();
    const timeStr = `${yemen.dateStr} ${yemen.time24}`;
    const newEntry: AuditLog = {
      ...log,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: timeStr,
    };
    const updated = [newEntry, ...current].slice(0, 300);
    this.saveAuditLogs(updated);
  },

  /**
   * Immediately flushes all dirty collections to Supabase and confirms persistence.
   */
  async flushAll(): Promise<{ success: boolean; error?: string }> {
    try {
      for (const k of SYNC_KEYS) {
        clearTimeout(pushTimers[k]);
        let waitCount = 0;
        while (pushing[k] && waitCount < 30) {
          await new Promise((r) => setTimeout(r, 100));
          waitCount++;
        }
        if (isDirty(k)) {
          await pushNow(k);
        }
      }
      const st = getSyncStatus();
      if (st.error) {
        return { success: false, error: st.error };
      }
      return { success: true };
    } catch (e: any) {
      const errMsg = describeError(e?.message || String(e));
      setSyncStatus({ error: errMsg });
      return { success: false, error: errMsg };
    }
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
};