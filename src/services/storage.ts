import { Grocery, Supplier, VegetableItem, DailySheet, Voucher, AuditLog, SystemSettings, DailyOrderRow } from '../types';

const STORAGE_KEYS = {
  GROCERIES: 'veg_app_groceries_v1',
  SUPPLIERS: 'veg_app_suppliers_v1',
  ITEMS: 'veg_app_items_v1',
  DAILY_SHEETS: 'veg_app_daily_sheets_v1',
  VOUCHERS: 'veg_app_vouchers_v1',
  AUDIT_LOGS: 'veg_app_audit_logs_v1',
  SETTINGS: 'veg_app_settings_v1',
};

export const INITIAL_GROCERIES: Grocery[] = [
  { id: 'g1', code: 'ص', name: 'بقالة الصلاح النموذجية', ownerName: 'صلاح العماري', phone: '0501234561', balance: 1450, creditLimit: 5000, pin: '1111', active: true },
  { id: 'g2', code: 'ح', name: 'سوبرماركت الحرمين', ownerName: 'عبدالله الحرمي', phone: '0501234562', balance: 2800, creditLimit: 7000, pin: '2222', active: true },
  { id: 'g3', code: 'س', name: 'مجمع السعيد للتموينات', ownerName: 'سعيد باوزير', phone: '0501234563', balance: 950, creditLimit: 4000, pin: '3333', active: true },
  { id: 'g4', code: 'ع', name: 'بقالة العاصمة الحديثة', ownerName: 'علي النهدي', phone: '0501234564', balance: 3200, creditLimit: 6000, pin: '4444', active: true },
  { id: 'g5', code: 'ك', name: 'تموينات الكوثر المركزية', ownerName: 'كمال الصبري', phone: '0501234565', balance: 1780, creditLimit: 5000, pin: '5555', active: true },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'شركة مزارع الوادي الأخضر', phone: '0559876541', specialty: 'طماط، خيار، بيبار محمي', balance: 4500, active: true },
  { id: 's2', name: 'سوق الجملة المركزي (أبو رشيد)', phone: '0559876542', specialty: 'بصل، بطاط، ثوم بلدي', balance: 3800, active: true },
  { id: 's3', name: 'مزارع السهل الذهبي', phone: '0559876543', specialty: 'كوسه، باميه، باذنجان أسود', balance: 1900, active: true },
  { id: 's4', name: 'مؤسسة البركة لتوريد الليم والفواكه', phone: '0559876544', specialty: 'ليمون، حمضيات، جزر', balance: 2200, active: true },
];

export const INITIAL_ITEMS: VegetableItem[] = [
  { id: 'item_1', name: 'طماط', unit: 'سلة', defaultCostPrice: 35, defaultSalePrice: 42 },
  { id: 'item_2', name: 'بطاط', unit: 'شوال', defaultCostPrice: 60, defaultSalePrice: 72 },
  { id: 'item_3', name: 'بصل', unit: 'شوال', defaultCostPrice: 45, defaultSalePrice: 55 },
  { id: 'item_4', name: 'جزر', unit: 'كرتون', defaultCostPrice: 30, defaultSalePrice: 38 },
  { id: 'item_5', name: 'بيبار', unit: 'كرتون', defaultCostPrice: 50, defaultSalePrice: 62 },
  { id: 'item_6', name: 'باميه', unit: 'سلة', defaultCostPrice: 70, defaultSalePrice: 85 },
  { id: 'item_7', name: 'كوسه', unit: 'سلة', defaultCostPrice: 40, defaultSalePrice: 50 },
  { id: 'item_8', name: 'اسود', unit: 'سلة', defaultCostPrice: 35, defaultSalePrice: 44 },
  { id: 'item_9', name: 'ليم', unit: 'كرتون', defaultCostPrice: 55, defaultSalePrice: 68 },
  { id: 'item_10', name: 'خيار', unit: 'كرتون', defaultCostPrice: 28, defaultSalePrice: 35 },
];

export const INITIAL_SETTINGS: SystemSettings = {
  businessName: 'مؤسسة النخبة لتوريد وتوزيع الخضروات والفواكه',
  businessSubname: 'النظام المحاسبي والرقابي المركزي لمشتريات الجملة وتوزيع البقالات',
  phone: '0550001122 - 0114002233',
  taxOrRegNumber: 'س.ت: 1010894523 | ر.ض: 300192837400003',
  address: 'سوق الجملة المركزي للخضار والفواكه - قطاع التوزيع رقم 4',
  invoiceNotes: 'البضاعة المباعة خاضعة للمعاينة والتسليم الصباحي المباشر. يرجى توثيق أي ملاحظة فور الاستلام.',
  invoiceFooter: 'شاكرين حسن تعاملكم - للاستفسارات المحاسبية يرجى مراجعة إدارة الحسابات',
  permissions: {
    workerCanAddSupplier: true,
    workerCanAddItem: true,
    workerCanEditPrices: true,
    workerCanViewPurchaseCost: true,
    lockDailySheetAfterSave: false,
  },
};

// Helper to get formatted Arabic day name
export function getArabicDayName(dateString: string): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const d = new Date(dateString + 'T12:00:00');
  return days[d.getDay()] || 'اليوم';
}

// Generate realistic default rows for a date
export function generateDefaultRows(items: VegetableItem[], suppliers: Supplier[], groceries: Grocery[], dateStr: string): DailyOrderRow[] {
  return items.map((item, index) => {
    // Pick supplier based on item category
    let supplier = suppliers[0];
    if (['بصل', 'بطاط'].includes(item.name)) supplier = suppliers[1] || suppliers[0];
    else if (['كوسه', 'باميه', 'اسود'].includes(item.name)) supplier = suppliers[2] || suppliers[0];
    else if (['ليم', 'جزر'].includes(item.name)) supplier = suppliers[3] || suppliers[0];

    const quantities: Record<string, number> = {};
    let totalQty = 0;

    // Realistic initial seed quantities for default groceries
    const sampleQtyPatterns: Record<string, number[]> = {
      طماط: [2.5, 3, 1.5, 2, 4],
      بطاط: [3, 4, 2, 3, 5],
      بصل: [2, 3, 1, 2, 3],
      جزر: [1, 1.5, 1, 0.5, 2],
      بيبار: [1.5, 1, 0.5, 1, 1.5],
      باميه: [0.5, 1, 0.5, 0.5, 1],
      كوسه: [1, 1.5, 1, 1, 2],
      اسود: [1, 1, 0.5, 1, 1.5],
      ليم: [0.5, 1, 0.5, 0.5, 1],
      خيار: [2, 2.5, 1.5, 2, 3],
    };

    const pattern = sampleQtyPatterns[item.name] || [1, 1, 1, 1, 1];
    groceries.forEach((g, gIdx) => {
      const q = pattern[gIdx % pattern.length];
      quantities[g.id] = q;
      totalQty += q;
    });

    const costPrice = item.defaultCostPrice;
    const salePrice = item.defaultSalePrice;
    const totalCost = totalQty * costPrice;
    const totalSale = totalQty * salePrice;

    return {
      id: `row_${dateStr}_${item.id}_${index}`,
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      supplierId: supplier.id,
      supplierName: supplier.name,
      costPrice,
      salePrice,
      quantities,
      totalQuantity: totalQty,
      totalCost,
      totalSale,
      profit: totalSale - totalCost,
      status: index < 5 ? 'purchased' : 'pending',
      notes: '',
      morningSorted: groceries.reduce((acc, g) => {
        const q = quantities[g.id] || 0;
        acc[g.id] = { deliveredQty: q, confirmed: index < 4 };
        return acc;
      }, {} as Record<string, { deliveredQty: number; confirmed: boolean }>),
    };
  });
}

// Generate initial sample daily sheets (Today and past 3 days)
export function getInitialDailySheets(): DailySheet[] {
  const today = new Date();
  const sheets: DailySheet[] = [];

  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = getArabicDayName(dateStr);

    const rows = generateDefaultRows(INITIAL_ITEMS, INITIAL_SUPPLIERS, INITIAL_GROCERIES, dateStr);
    const totalCost = rows.reduce((sum, r) => sum + r.totalCost, 0);
    const totalSale = rows.reduce((sum, r) => sum + r.totalSale, 0);
    const totalProfit = totalSale - totalCost;

    sheets.push({
      id: `sheet_${dateStr}`,
      date: dateStr,
      dayName,
      status: i === 0 ? 'open' : 'settled',
      rows,
      totalCost,
      totalSale,
      totalProfit,
      notes: i === 0 ? 'مشتريات اليوم قيد التجميع والمتابعة الميدانية' : `تم إقفال كشف ${dayName} وتوريد الصباح وتسوية الحسابات.`,
      nightOrdersSaved: true,
      morningSortGenerated: true,
      createdAt: `${dateStr} 21:30:00`,
      updatedAt: `${dateStr} 23:45:00`,
    });
  }

  return sheets;
}

export const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: 'v_rec_1',
    voucherNumber: 'سند-قبض-101',
    type: 'receipt',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    partyType: 'grocery',
    partyId: 'g1',
    partyName: 'بقالة الصلاح النموذجية',
    partyCode: 'ص',
    amount: 1500,
    paymentMethod: 'cash',
    referenceNumber: 'CASH-9821',
    notes: 'دفعة سداد حساب مسحوبات الأسبوع الماضي',
    createdBy: 'مدير الحسابات',
    createdAt: '2026-10-27 10:15:00',
  },
  {
    id: 'v_rec_2',
    voucherNumber: 'سند-قبض-102',
    type: 'receipt',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    partyType: 'grocery',
    partyId: 'g2',
    partyName: 'سوبرماركت الحرمين',
    partyCode: 'ح',
    amount: 3000,
    paymentMethod: 'transfer',
    referenceNumber: 'TRX-77401',
    notes: 'تحويل بنكي - دفعة من الرصيد السابق',
    createdBy: 'مدير الحسابات',
    createdAt: '2026-10-28 14:30:00',
  },
  {
    id: 'v_pay_1',
    voucherNumber: 'سند-صرف-201',
    type: 'payment',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    partyType: 'supplier',
    partyId: 's1',
    partyName: 'شركة مزارع الوادي الأخضر',
    amount: 2500,
    paymentMethod: 'transfer',
    referenceNumber: 'AL-INMA-4491',
    notes: 'سداد جزئي لفاتورة توريد الطماط والخيار',
    createdBy: 'مدير الحسابات',
    createdAt: '2026-10-27 11:45:00',
  },
  {
    id: 'v_pay_2',
    voucherNumber: 'سند-صرف-202',
    type: 'payment',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    partyType: 'supplier',
    partyId: 's2',
    partyName: 'سوق الجملة المركزي (أبو رشيد)',
    amount: 2000,
    paymentMethod: 'cash',
    referenceNumber: 'CASH-3312',
    notes: 'سداد نقدي لتوريد شحنة البطاط والبصل',
    createdBy: 'أمين الصندوق',
    createdAt: '2026-10-28 17:20:00',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    timestamp: '2026-10-29 02:15:30',
    user: 'عامل الميدان (أبو فهد)',
    role: 'worker',
    action: 'حفظ طلبات الليل وتوليد فرز الصباح',
    target: 'كشف اليومية 2026-10-29',
    details: 'تم تثبيت 10 أصناف لـ 5 بقالات بإجمالي 82 وحدة وتوليد كشوف الفرز التلقائية',
  },
  {
    id: 'log_2',
    timestamp: '2026-10-29 01:45:12',
    user: 'عامل الميدان (أبو فهد)',
    role: 'worker',
    action: 'تأكيد شراء صنف',
    target: 'طماط - شركة مزارع الوادي الأخضر',
    oldValue: 'قيد الشراء ⏳',
    newValue: 'تم الشراء ✅',
    details: 'تم تأكيد استلام وشراء 13 سلة طماط بسعر 35 ريال',
  },
  {
    id: 'log_3',
    timestamp: '2026-10-28 14:32:00',
    user: 'مدير النظام (أحمد)',
    role: 'admin',
    action: 'تسجيل سند قبض',
    target: 'سوبرماركت الحرمين (ح)',
    oldValue: 'الرصيد: 5,800 ريال',
    newValue: 'الرصيد: 2,800 ريال',
    details: 'سند رقم سند-قبض-102 بمبلغ 3,000 ريال عبر تحويل بنكي',
  },
  {
    id: 'log_4',
    timestamp: '2026-10-28 11:20:45',
    user: 'مدير النظام (أحمد)',
    role: 'admin',
    action: 'تعديل شامل لليوم',
    target: 'كشف تاريخ 2026-10-27',
    oldValue: 'إجمالي الشراء: 3,420 ريال',
    newValue: 'إجمالي الشراء: 3,680 ريال',
    details: 'تعديل كمية البطاط للبقالة (س) وإعادة ترحيل الحسابات دون تغيير التاريخ الأصلي',
  },
  {
    id: 'log_5',
    timestamp: '2026-10-27 19:10:05',
    user: 'مدير النظام (أحمد)',
    role: 'admin',
    action: 'تعديل صلاحيات العامل',
    target: 'إعدادات النظام',
    oldValue: 'تعديل الأسعار: مقفل',
    newValue: 'تعديل الأسعار: مسموح',
    details: 'منح العامل صلاحية تعديل أسعار الشراء وفق حركة سوق الخضار المفاجئة',
  },
];

// LocalStorage helpers with error resilience
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load ${key} from storage:`, err);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to storage:`, err);
  }
}

// Storage API
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
    return loadFromStorage(STORAGE_KEYS.DAILY_SHEETS, getInitialDailySheets());
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
    const updated = [newEntry, ...current].slice(0, 300); // keep last 300 entries
    this.saveAuditLogs(updated);
  },

  getSettings(): SystemSettings {
    return loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },
  saveSettings(settings: SystemSettings): void {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  },

  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.GROCERIES);
    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
    localStorage.removeItem(STORAGE_KEYS.ITEMS);
    localStorage.removeItem(STORAGE_KEYS.DAILY_SHEETS);
    localStorage.removeItem(STORAGE_KEYS.VOUCHERS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  },
};
