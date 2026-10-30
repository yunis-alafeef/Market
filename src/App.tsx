/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ActivePage,
  DailySheet,
  Grocery,
  Supplier,
  VegetableItem,
  Voucher,
  AuditLog,
  SystemSettings,
  DailyOrderRow,
  ThemeId,
  AuthSession,
  UserAccount,
} from './types';
import { StorageService, getArabicDayName } from './services/storage';
import { AuthService } from './services/auth';
import { Header } from './components/Header';
import { WorkerView } from './components/WorkerView';
import { AdminReportsView } from './components/AdminReportsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { GroceryPortalView } from './components/GroceryPortalView';
import { AddVoucherModal } from './components/AddVoucherModal';
import { AddItemModal } from './components/AddItemModal';
import { AddSupplierModal } from './components/AddSupplierModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { LoginModal } from './components/LoginModal';

export default function App() {
  // Authentication & Session
  const [session, setSession] = useState<AuthSession | null>(() => AuthService.getCurrentSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    // If no existing session on mobile device, prompt login immediately
    const existing = AuthService.getCurrentSession();
    return !existing;
  });

  // Current active user & role
  const currentUser: UserAccount | null = session?.user || null;
  const currentRole: 'worker' | 'admin' | 'grocery' = currentUser?.role || 'worker';

  // Navigation state (initial page matches role)
  const [activePage, setActivePage] = useState<ActivePage>(() => {
    const s = AuthService.getCurrentSession();
    if (s?.user.role === 'admin') return 'dashboard';
    if (s?.user.role === 'grocery') return 'grocery';
    return 'worker';
  });

  // Strict role isolation: worker only sees worker, grocery only sees grocery
  useEffect(() => {
    if (currentRole === 'worker' && activePage !== 'worker') {
      setActivePage('worker');
    } else if (currentRole === 'grocery' && activePage !== 'grocery') {
      setActivePage('grocery');
    }
  }, [currentRole, activePage]);

  // Themes state
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      return (localStorage.getItem('veg_app_theme_v1') as ThemeId) || 'royal_navy';
    } catch {
      return 'royal_navy';
    }
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.body.setAttribute('data-theme', currentTheme);
    try {
      localStorage.setItem('veg_app_theme_v1', currentTheme);
    } catch {
      // ignore
    }
  }, [currentTheme]);

  // Core Data Collections
  const [groceries, setGroceries] = useState<Grocery[]>(() => StorageService.getGroceries());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => StorageService.getSuppliers());
  const [items, setItems] = useState<VegetableItem[]>(() => StorageService.getItems());
  const [dailySheets, setDailySheets] = useState<DailySheet[]>(() => StorageService.getDailySheets());
  const [vouchers, setVouchers] = useState<Voucher[]>(() => StorageService.getVouchers());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());

  // Current active date for worker worksheet (allows editing past days with date retention!)
  const [currentWorksheetDate, setCurrentWorksheetDate] = useState<string>(() => {
    const sheets = StorageService.getDailySheets();
    return sheets[0]?.date || new Date().toISOString().split('T')[0];
  });

  // Modal States
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherModalConfig, setVoucherModalConfig] = useState<{
    defaultType: 'receipt' | 'payment';
    defaultPartyId?: string;
  }>({ defaultType: 'receipt' });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Print & PDF Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalData, setPrintModalData] = useState<{
    title: string;
    type: 'daily_invoice' | 'statement' | 'morning_sort' | 'voucher';
    data: {
      sheet?: DailySheet;
      grocery?: Grocery;
      supplier?: Supplier;
      voucher?: Voucher;
      statementRows?: {
        date: string;
        description: string;
        debit: number;
        credit: number;
        balance: number;
      }[];
    };
  }>({
    title: 'فاتورة رسمية',
    type: 'daily_invoice',
    data: {},
  });

  // Sync to storage
  useEffect(() => {
    StorageService.saveGroceries(groceries);
  }, [groceries]);

  useEffect(() => {
    StorageService.saveSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    StorageService.saveItems(items);
  }, [items]);

  useEffect(() => {
    StorageService.saveDailySheets(dailySheets);
  }, [dailySheets]);

  useEffect(() => {
    StorageService.saveVouchers(vouchers);
  }, [vouchers]);

  useEffect(() => {
    StorageService.saveAuditLogs(auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  // Audit Log Adder Helper
  const logAudit = (
    action: string,
    target: string,
    oldValue?: string,
    newValue?: string,
    details?: string
  ) => {
    const now = new Date();
    const timestamp =
      now.toISOString().split('T')[0] +
      ' ' +
      now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      user: currentUser ? currentUser.name : 'مستخدم الجوال',
      role: currentRole,
      action,
      target,
      oldValue,
      newValue,
      details,
    };

    setAuditLogs((prev) => [newLog, ...prev].slice(0, 300));
  };

  // Get or Create Worksheet for Date
  const currentSheet =
    dailySheets.find((s) => s.date === currentWorksheetDate) ||
    dailySheets[0] || {
      id: `sheet_${currentWorksheetDate}`,
      date: currentWorksheetDate,
      dayName: getArabicDayName(currentWorksheetDate),
      status: 'open',
      rows: [],
      totalCost: 0,
      totalSale: 0,
      totalProfit: 0,
      notes: '',
      nightOrdersSaved: false,
      morningSortGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  // Update Daily Sheet Handler
  const handleUpdateSheet = (updated: DailySheet) => {
    setDailySheets((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      }
      return [updated, ...prev];
    });
  };

  // The KEY REQUIRED FEATURE: "تعديل شامل لليوم"
  const handleEditDayComprehensive = (sheet: DailySheet) => {
    setCurrentWorksheetDate(sheet.date);
    setActivePage('worker');
    logAudit(
      'تعديل شامل لليوم',
      `كشف ${sheet.dayName} (${sheet.date})`,
      'استعراض تقرير',
      'فتح شاشة الكشف اليومي للتعديل',
      'تم نقل المدير لشاشة التعديل الشامل مع الاحتفاظ بنفس التاريخ القديم لترحيل التعديلات'
    );
  };

  // Add Voucher (Receipt or Payment)
  const handleAddVoucher = (voucherData: Omit<Voucher, 'id' | 'createdAt'>) => {
    const newVoucher: Voucher = {
      ...voucherData,
      id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setVouchers((prev) => [newVoucher, ...prev]);

    if (voucherData.type === 'receipt' && voucherData.partyType === 'grocery') {
      setGroceries((prev) =>
        prev.map((g) => {
          if (g.id === voucherData.partyId) {
            const oldB = g.balance;
            const newB = Math.max(0, g.balance - voucherData.amount);
            logAudit(
              'تسجيل سند قبض',
              `${g.name} (${g.code})`,
              `${oldB.toLocaleString()} ر.س`,
              `${newB.toLocaleString()} ر.س`,
              `سند رقم ${newVoucher.voucherNumber} بمبلغ ${voucherData.amount.toLocaleString()} ر.س`
            );
            return { ...g, balance: newB };
          }
          return g;
        })
      );
    } else if (voucherData.type === 'payment' && voucherData.partyType === 'supplier') {
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id === voucherData.partyId) {
            const oldB = s.balance;
            const newB = Math.max(0, s.balance - voucherData.amount);
            logAudit(
              'تسجيل سند صرف',
              s.name,
              `${oldB.toLocaleString()} ر.س`,
              `${newB.toLocaleString()} ر.س`,
              `سند رقم ${newVoucher.voucherNumber} بمبلغ ${voucherData.amount.toLocaleString()} ر.س`
            );
            return { ...s, balance: newB };
          }
          return s;
        })
      );
    }
  };

  // Add Item to System & Current Worksheet
  const handleAddItem = (newItemData: Omit<VegetableItem, 'id'>) => {
    const newItem: VegetableItem = {
      ...newItemData,
      id: `item_${Date.now()}`,
    };

    setItems((prev) => [...prev, newItem]);

    const newRow: DailyOrderRow = {
      id: `row_${currentSheet.date}_${newItem.id}_${Date.now()}`,
      itemId: newItem.id,
      itemName: newItem.name,
      unit: newItem.unit,
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || 'مورد عام',
      costPrice: newItem.defaultCostPrice,
      salePrice: newItem.defaultSalePrice,
      quantities: groceries.reduce((acc, g) => {
        acc[g.id] = 0;
        return acc;
      }, {} as Record<string, number>),
      totalQuantity: 0,
      totalCost: 0,
      totalSale: 0,
      profit: 0,
      status: 'pending',
    };

    handleUpdateSheet({
      ...currentSheet,
      rows: [...currentSheet.rows, newRow],
    });

    logAudit('إضافة صنف جديد', newItem.name, '', `الوحدة: ${newItem.unit}، سعر الشراء: ${newItem.defaultCostPrice}`);
  };

  // Add Supplier
  const handleAddSupplier = (newSupplierData: Omit<Supplier, 'id' | 'balance' | 'active'>) => {
    const newSupplier: Supplier = {
      ...newSupplierData,
      id: `sup_${Date.now()}`,
      balance: 0,
      active: true,
    };

    setSuppliers((prev) => [...prev, newSupplier]);
    logAudit('إضافة مورد جديد', newSupplier.name, '', `الهاتف: ${newSupplier.phone}، التخصص: ${newSupplier.specialty}`);
  };

  // Add Grocery (generates new column automatically!)
  const handleAddGrocery = (groceryData: Omit<Grocery, 'id' | 'balance' | 'active'>) => {
    const newGrocery: Grocery = {
      ...groceryData,
      id: `g_${Date.now()}`,
      balance: 0,
      active: true,
    };

    setGroceries((prev) => [...prev, newGrocery]);

    setDailySheets((prevSheets) =>
      prevSheets.map((sheet) => ({
        ...sheet,
        rows: sheet.rows.map((row) => ({
          ...row,
          quantities: {
            ...row.quantities,
            [newGrocery.id]: row.quantities[newGrocery.id] ?? 0,
          },
        })),
      }))
    );

    logAudit(
      'إضافة بقالة وتوليد عمود',
      `${newGrocery.name} (${newGrocery.code})`,
      '',
      `تم توليد عمود جديد تلقائياً في شاشات الإدخال والفرز`
    );
  };

  const handleUpdateGrocery = (updated: Grocery) => {
    setGroceries((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    logAudit('تعديل بيانات بقالة', updated.name, '', `تحديث الهاتف أو الرصيد`);
  };

  const handleDeleteGrocery = (id: string) => {
    const g = groceries.find((item) => item.id === id);
    if (!g) return;
    setGroceries((prev) => prev.filter((item) => item.id !== id));
    logAudit('حذف بقالة', g.name, g.code, 'محذوف');
  };

  const handleResetData = () => {
    StorageService.resetAllData();
    window.location.reload();
  };

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setIsLoginModalOpen(false);
    if (newSession.user.role === 'admin') setActivePage('dashboard');
    else if (newSession.user.role === 'grocery') setActivePage('grocery');
    else setActivePage('worker');
  };

  const handleLogout = () => {
    AuthService.logout();
    setSession(null);
    setIsLoginModalOpen(true);
  };

  return (
    <div
      data-theme={currentTheme}
      className="min-h-screen flex flex-col font-sans transition-colors duration-300"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Universal Top Header */}
      <Header
        activePage={activePage}
        onPageChange={setActivePage}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        onOpenNewVoucher={() => {
          setVoucherModalConfig({ defaultType: 'receipt' });
          setIsVoucherModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl w-full mx-auto">
        {/* Page 1: Worker Field Worksheet */}
        {activePage === 'worker' && (
          <WorkerView
            sheet={currentSheet}
            groceries={groceries}
            suppliers={suppliers}
            items={items}
            settings={settings}
            currentRole={currentRole}
            onUpdateSheet={handleUpdateSheet}
            onOpenAddItem={() => setIsItemModalOpen(true)}
            onOpenAddSupplier={() => setIsSupplierModalOpen(true)}
            onOpenPrintModal={(type) => {
              setPrintModalData({
                title: type === 'daily_invoice' ? `كشف اليومية (${currentSheet.dayName})` : `جدول فرز الصباح`,
                type,
                data: { sheet: currentSheet },
              });
              setIsPrintModalOpen(true);
            }}
            onAddAuditLog={logAudit}
            onUpdateItemPrice={(itemId, costPrice, salePrice) => {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === itemId
                    ? { ...it, defaultCostPrice: costPrice, defaultSalePrice: salePrice }
                    : it
                )
              );
            }}
          />
        )}

        {/* Page 2: Past Days Reports & Comprehensive Day Edit */}
        {activePage === 'reports' && (
          <AdminReportsView
            dailySheets={dailySheets}
            groceries={groceries}
            suppliers={suppliers}
            settings={settings}
            onEditDayComprehensive={handleEditDayComprehensive}
            onOpenPrintModal={(type, sheet) => {
              setPrintModalData({
                title: `كشف مبيعات ${sheet.dayName} (${sheet.date})`,
                type,
                data: { sheet },
              });
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {/* Page 3: Admin Financial Dashboard */}
        {activePage === 'dashboard' && (
          <AdminDashboardView
            sheets={dailySheets}
            groceries={groceries}
            suppliers={suppliers}
            vouchers={vouchers}
            settings={settings}
            onOpenNewVoucher={(type = 'receipt', partyId) => {
              setVoucherModalConfig({ defaultType: type, defaultPartyId: partyId });
              setIsVoucherModalOpen(true);
            }}
            onOpenPrintModal={(type, data) => {
              setPrintModalData({
                title:
                  type === 'statement'
                    ? `كشف حساب رسمي: ${data.grocery?.name || data.supplier?.name}`
                    : `سند مالي: ${data.voucher?.voucherNumber}`,
                type,
                data,
              });
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {/* Page 4: Admin Settings & Audit Trail */}
        {activePage === 'settings' && (
          <AdminSettingsView
            settings={settings}
            groceries={groceries}
            suppliers={suppliers}
            auditLogs={auditLogs}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            onUpdateSettings={setSettings}
            onAddGrocery={handleAddGrocery}
            onUpdateGrocery={handleUpdateGrocery}
            onDeleteGrocery={handleDeleteGrocery}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={(sup) =>
              setSuppliers((prev) => prev.map((s) => (s.id === sup.id ? sup : s)))
            }
            onResetData={handleResetData}
          />
        )}

        {/* Page 5: Grocery Owner Portal (Read-Only) */}
        {activePage === 'grocery' && (
          <GroceryPortalView
            groceries={groceries}
            sheets={dailySheets}
            vouchers={vouchers}
            settings={settings}
            currentUser={currentUser}
            onOpenPrintModal={(type, data) => {
              setPrintModalData({
                title:
                  type === 'statement'
                    ? `كشف حساب: ${data.grocery?.name}`
                    : `جدول فرز واستلام الصباح: ${data.grocery?.name}`,
                type,
                data,
              });
              setIsPrintModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        isMandatory={!session}
      />

      <AddVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        groceries={groceries}
        suppliers={suppliers}
        onAddVoucher={handleAddVoucher}
        defaultType={voucherModalConfig.defaultType}
        defaultPartyId={voucherModalConfig.defaultPartyId}
      />

      <AddItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onAddItem={handleAddItem}
      />

      <AddSupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onAddSupplier={handleAddSupplier}
      />

      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={printModalData.title}
        type={printModalData.type}
        settings={settings}
        data={printModalData.data}
      />
    </div>
  );
}
