export interface Grocery {
  id: string;
  code: string; // e.g. ص، ح، س، ع، ك
  name: string;
  phone: string;
  ownerName: string;
  balance: number; // positive = grocery owes us (مدين)
  creditLimit: number;
  pin: string; // PIN for grocery portal
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  balance: number; // positive = we owe the supplier (دائن)
  active: boolean;
}

export interface VegetableItem {
  id: string;
  name: string;
  unit: string; // سلة، شوال، كرتون، كيس، كيلو
  defaultCostPrice: number;
  defaultSalePrice: number;
}

export interface DailyOrderRow {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  supplierId: string;
  supplierName: string;
  costPrice: number; // سعر الشراء للوحدة
  salePrice: number; // سعر البيع للوحدة
  quantities: Record<string, number>; // { [groceryId]: number }
  totalQuantity: number;
  totalCost: number;
  totalSale: number;
  profit: number;
  status: 'pending' | 'purchased'; // ⏳ قيد الشراء | تم الشراء ✅
  notes?: string;
  morningSorted?: Record<string, { deliveredQty: number; confirmed: boolean }>;
}

export interface DailySheet {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string;
  status: 'open' | 'saved_night' | 'settled';
  rows: DailyOrderRow[];
  totalCost: number;
  totalSale: number;
  totalProfit: number;
  notes: string;
  nightOrdersSaved: boolean;
  morningSortGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: 'receipt' | 'payment'; // receipt = قبض من بقالة, payment = صرف لمورد
  date: string;
  partyType: 'grocery' | 'supplier';
  partyId: string;
  partyName: string;
  partyCode?: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'check';
  referenceNumber?: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: 'admin' | 'worker' | 'system' | 'grocery';
  action: string;
  target: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface SystemSettings {
  businessName: string;
  businessSubname: string;
  phone: string;
  countryCode: string;
  taxOrRegNumber: string;
  address: string;
  invoiceNotes: string;
  invoiceFooter: string;
  permissions: {
    workerCanAddSupplier: boolean;
    workerCanAddItem: boolean;
    workerCanEditPrices: boolean;
    workerCanViewPurchaseCost: boolean;
    lockDailySheetAfterSave: boolean;
  };
}

export type ActivePage = 'worker' | 'reports' | 'dashboard' | 'settings' | 'grocery';

export type ThemeId = 'royal_navy' | 'indigo_gold' | 'emerald_botanical' | 'dark_luxury' | 'ruby_luxury';

export type PrintTemplateId = 'royal_classic' | 'modern_minimal';

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  countryCode: string; // default '+967'
  username: string;
  role: 'admin' | 'worker' | 'grocery';
  pin: string;
  groceryId?: string; // if role === 'grocery'
  avatarBadge: string;
  active: boolean;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
  deviceName: string;
  loggedAt: string;
  rememberDevice: boolean;
}
