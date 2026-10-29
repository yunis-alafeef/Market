import { Grocery, Supplier, VegetableItem, DailySheet, Voucher, AuditLog, SystemSettings, DailyOrderRow } from '../types';

const STORAGE_KEYS = {
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
  { id: 's1', name: 'مزارع الوادي الأخضر (طماط وخيار)', phone: '771122334', specialty: 'طماط، خيار، بيبار محمي', balance: 0, active: true },
  { id: 's2', name: 'سوق الجملة المركزي (أبو رشيد)', phone: '772233445', specialty: 'بصل، بطاط، ثوم بلدي', balance: 0, active: true },
  { id: 's3', name: 'مزارع السهل الذهبي', phone: '773344556', specialty: 'كوسه، باميه، باذنجان أسود', balance: 0, active: true },
  { id: 's4', name: 'مؤسسة البركة لاستيراد وتوريد الفواكه', phone: '774455667', specialty: 'ليمون، حمضيات، جزر', balance: 0, active: true },
];

// The 10 Core Vegetable items
export const INITIAL_ITEMS: VegetableItem[] = [
  { id: 'item_1', name: 'طماط', unit: 'سلة', defaultCostPrice: 3500, defaultSalePrice: 4200 },
  { id: 'item_2', name: 'بطاط', unit: 'شوال', defaultCostPrice: 6000, defaultSalePrice: 7200 },
  { id: 'item_3', name: 'بصل', unit: 'شوال', defaultCostPrice: 4500, defaultSalePrice: 5500 },
  { id: 'item_4', name: 'جزر', unit: 'كرتون', defaultCostPrice: 3000, defaultSalePrice: 3800 },
  { id: 'item_5', name: 'بيبار', unit: 'كرتون', defaultCostPrice: 5000, defaultSalePrice: 6200 },
  { id: 'item_6', name: 'باميه', unit: 'سلة', defaultCostPrice: 7000, defaultSalePrice: 8500 },
  { id: 'item_7', name: 'كوسه', unit: 'سلة', defaultCostPrice: 4000, defaultSalePrice: 5000 },
  { id: 'item_8', name: 'اسود', unit: 'سلة', defaultCostPrice: 3500, defaultSalePrice: 4400 },
  { id: 'item_9', name: 'ليم', unit: 'كرتون', defaultCostPrice: 5500, defaultSalePrice: 6800 },
  { id: 'item_10', name: 'خيار', unit: 'كرتون', defaultCostPrice: 2800, defaultSalePrice: 3500 },
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

// Clean production daily sheets - starts fresh with today's sheet
export function getInitialDailySheets(): DailySheet[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const dayName = getArabicDayName(todayStr);

  const cleanRows = generateCleanRows(INITIAL_ITEMS, INITIAL_SUPPLIERS, INITIAL_GROCERIES, todayStr);

  return [
    {
      id: `sheet_${todayStr}`,
      date: todayStr,
      dayName,
      status: 'open',
      rows: cleanRows,
      totalCost: 0,
      totalSale: 0,
      totalProfit: 0,
      notes: 'كشف اليومية الافتتاحي - جاهز لتسجيل طلبات الليل والمشتريات الميدانية',
      nightOrdersSaved: false,
      morningSortGenerated: false,
      createdAt: `${todayStr} 00:00:00`,
      updatedAt: `${todayStr} 00:00:00`,
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
    const updated = [newEntry, ...current].slice(0, 300);
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
