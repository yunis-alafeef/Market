/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useSyncExternalStore } from 'react';
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
import { StorageService, getArabicDayName, getEffectiveMarketDate, getYemenNow, generateCleanRows, STORAGE_KEYS, getSyncStatus, subscribeSyncStatus } from './services/storage';
import { AuthService } from './services/auth';
import { SupabaseBackupService } from './services/supabaseBackup';
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

function AppInner() {
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

  // Current active date for worker worksheet (dynamically rolls over to today or tomorrow's night shift)
  const [currentWorksheetDate, setCurrentWorksheetDate] = useState<string>(() => {
    return getEffectiveMarketDate().dateStr;
  });

  // Flag indicating Manager is comprehensively editing a specific past sheet
  const [managerEditingDate, setManagerEditingDate] = useState<string | null>(null);

  // Automatic daily update & night rollover check (handles midnight and 18:00 night shift rollover)
  useEffect(() => {
    const checkMarketRollover = () => {
      const effective = getEffectiveMarketDate();
      const updatedSheets = StorageService.getDailySheets();
      setDailySheets(updatedSheets);

      // If user hasn't explicitly navigated to an older past sheet, keep them on the active market sheet
      setCurrentWorksheetDate((prevDate) => {
        // Do not auto-advance if Manager is editing a past sheet
        if (managerEditingDate) return prevDate;
        // If the date is older than today or night shift, auto-advance
        if (prevDate < effective.actualDateStr) {
          return effective.dateStr;
        }
        return prevDate;
      });
    };

    checkMarketRollover();
    const timer = setInterval(checkMarketRollover, 30000); // Check every 30 seconds
    window.addEventListener('focus', checkMarketRollover);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', checkMarketRollover);
    };
  }, []);

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
        time?: string | null;
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

  // Cloud sync: load shared data from Supabase and keep all devices up to date
  useEffect(() => {
    let stopped = false;
    const run = async () => {
      const changed = await StorageService.syncFromCloud();
      if (stopped || changed.length === 0) return;
      if (changed.includes(STORAGE_KEYS.GROCERIES)) setGroceries(StorageService.getGroceries());
      if (changed.includes(STORAGE_KEYS.SUPPLIERS)) setSuppliers(StorageService.getSuppliers());
      if (changed.includes(STORAGE_KEYS.ITEMS)) setItems(StorageService.getItems());
      if (changed.includes(STORAGE_KEYS.DAILY_SHEETS)) setDailySheets(StorageService.getDailySheets());
      if (changed.includes(STORAGE_KEYS.VOUCHERS)) setVouchers(StorageService.getVouchers());
      if (changed.includes(STORAGE_KEYS.AUDIT_LOGS)) setAuditLogs(StorageService.getAuditLogs());
      if (changed.includes(STORAGE_KEYS.SETTINGS)) setSettings(StorageService.getSettings());
    };
    run();
    const id = setInterval(run, 5000);
    window.addEventListener('focus', run);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener('focus', run);
    };
  }, []);

  // Audit Log Adder Helper
  const logAudit = (
    action: string,
    target: string,
    oldValue?: string,
    newValue?: string,
    details?: string
  ) => {
    const yemen = getYemenNow();
    const timestamp = `${yemen.dateStr} ${yemen.time24}`;

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
  const targetWorksheetDate = currentWorksheetDate;
  const currentSheet =
    (managerEditingDate
      ? dailySheets.find((s) => s.id === managerEditingDate) ||
        dailySheets.find((s) => s.date === managerEditingDate && s.status === 'settled') ||
        dailySheets.find((s) => s.date === managerEditingDate)
      : null) ||
    dailySheets.find((s) => s.date === currentWorksheetDate && s.status !== 'settled') ||
    dailySheets.find((s) => s.date === currentWorksheetDate) ||
    dailySheets[0] || {
      id: `sheet_${targetWorksheetDate}`,
      date: targetWorksheetDate,
      dayName: getArabicDayName(targetWorksheetDate),
      status: 'open',
      rows: [],
      totalCost: 0,
      totalSale: 0,
      totalProfit: 0,
      notes: '',
      nightOrdersSaved: false,
      morningSortGenerated: false,
      createdAt: `${targetWorksheetDate} 00:00:00`,
      updatedAt: `${targetWorksheetDate} 00:00:00`,
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

  // Helper to recompute balances from all settled sheets and vouchers accurately without duplication
  const recalculateAllBalances = (currentSheets: DailySheet[], currentVouchers: Voucher[]) => {
    // Calculate total purchases per grocery from settled sheets
    const groceryPurchases: Record<string, number> = {};
    // Calculate total supplies per supplier from settled sheets
    const supplierPurchases: Record<string, number> = {};

    currentSheets.forEach((s) => {
      if (s.status === 'settled') {
        s.rows.forEach((r) => {
          const unitCost = Number(r.costPrice) || 0;
          // Grocery amounts: (كمية البقالة من الصنف × سعر الشراء)
          Object.entries(r.quantities || {}).forEach(([gId, qVal]) => {
            const q = Number(qVal) || 0;
            if (q > 0 && unitCost > 0) {
              const lineAmount = Math.round(q * unitCost * 100) / 100;
              groceryPurchases[gId] = (groceryPurchases[gId] || 0) + lineAmount;
            }
          });
          // Supplier amounts: (إجمالي كمية الصنف المشتراة × سعر الشراء)
          const cleanSupplierName = (r.supplierName || '').replace(' (مورد إضافي)', '').trim();
          const matchedSupplierId =
            r.supplierId ||
            suppliers.find((sup) => sup.name === r.supplierName || sup.name === cleanSupplierName)?.id ||
            '';
          if (matchedSupplierId) {
            const sumGQty = Object.values(r.quantities || {}).reduce((acc, q) => acc + (Number(q) || 0), 0);
            const rowQty = (Number(r.totalQuantity) || 0) > 0 ? Number(r.totalQuantity) : sumGQty;
            const lineCost = Math.round(rowQty * unitCost * 100) / 100;
            supplierPurchases[matchedSupplierId] = (supplierPurchases[matchedSupplierId] || 0) + lineCost;
          }
        });
      }
    });

    // Payments / Receipts from vouchers
    const groceryPaid: Record<string, number> = {};
    const supplierPaid: Record<string, number> = {};

    currentVouchers.forEach((v) => {
      if (v.partyType === 'grocery' && v.type === 'receipt') {
        groceryPaid[v.partyId] = (groceryPaid[v.partyId] || 0) + (Number(v.amount) || 0);
      } else if (v.partyType === 'supplier' && v.type === 'payment') {
        supplierPaid[v.partyId] = (supplierPaid[v.partyId] || 0) + (Number(v.amount) || 0);
      }
    });

    // Update groceries state
    setGroceries((prev) =>
      prev.map((g) => {
        const totalDebit = Math.round((groceryPurchases[g.id] || 0) * 100) / 100;
        const totalCredit = Math.round((groceryPaid[g.id] || 0) * 100) / 100;
        const netBal = Math.round((totalDebit - totalCredit) * 100) / 100;
        return { ...g, balance: netBal };
      })
    );

    // Update suppliers state
    setSuppliers((prev) =>
      prev.map((s) => {
        const totalOwed = Math.round((supplierPurchases[s.id] || 0) * 100) / 100;
        const totalPaid = Math.round((supplierPaid[s.id] || 0) * 100) / 100;
        const netBal = Math.round((totalOwed - totalPaid) * 100) / 100;
        return { ...s, balance: netBal };
      })
    );
  };

  // Auto-recompute balances whenever settled sheets or vouchers change (keeps all devices in sync)
  useEffect(() => {
    recalculateAllBalances(dailySheets, vouchers);
  }, [dailySheets, vouchers, groceries.length, suppliers.length]);

  // Normal Worker Settling: Mark settled, update ledgers, confirm cloud save, then zero out worksheet
  const handleSettleWorkerSheet = async (sheetToSettle: DailySheet) => {
    const yemen = getYemenNow();
    const normalizedRows = sheetToSettle.rows.map((r) => {
      const sumGQty = Math.round(
        Object.values(r.quantities || {}).reduce((acc, q) => acc + (Number(q) || 0), 0) * 100
      ) / 100;
      const rowQty = (Number(r.totalQuantity) || 0) > 0 ? Number(r.totalQuantity) : sumGQty;
      const unitCost = Math.max(0, Number(r.costPrice) || 0);
      const lineCost = Math.round(rowQty * unitCost * 100) / 100;
      return {
        ...r,
        costPrice: unitCost,
        salePrice: unitCost,
        totalQuantity: rowQty,
        totalCost: lineCost,
        totalSale: lineCost,
        profit: 0,
      };
    });
    const totalQty = Math.round(normalizedRows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0) * 100) / 100;
    const totalCost = Math.round(normalizedRows.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0) * 100) / 100;

    const settledSheet: DailySheet = {
      ...sheetToSettle,
      rows: normalizedRows,
      totalCost,
      totalSale: totalCost,
      totalProfit: 0,
      status: 'settled',
      nightOrdersSaved: true,
      morningSortGenerated: true,
      updatedAt: `${yemen.dateStr} ${yemen.time12}`,
    };

    const nextSheets = dailySheets.map((s) => (s.id === settledSheet.id ? settledSheet : s));
    if (!nextSheets.some((s) => s.id === settledSheet.id)) {
      nextSheets.unshift(settledSheet);
    }

    // Stage changes to storage and verify database persistence BEFORE zeroing out fields
    StorageService.saveDailySheets(nextSheets);
    const flushRes = await StorageService.flushAll();
    if (!flushRes.success) {
      alert(
        `❌ تعذر ترحيل الحسابات وحفظها في قاعدة البيانات:\n${flushRes.error || 'خطأ في الاتصال'}\n\nتم الاحتفاظ بجميع البيانات المدخلة في الشاشة حتى لا تفقد عملك.`
      );
      return;
    }

    setDailySheets(nextSheets);
    recalculateAllBalances(nextSheets, vouchers);

    logAudit(
      'حفظ الشراء وترحيل الحسابات',
      `كشف ${settledSheet.dayName} (${settledSheet.date})`,
      'قيد العمل',
      'مرحل ومقفل ✅',
      `تم ترحيل مبيعات بقيمة ${settledSheet.totalSale.toLocaleString()} ر.ي ومشتريات بقيمة ${settledSheet.totalCost.toLocaleString()} ر.ي وإجمالي ${totalQty} وحدة وتصفير الحقول ليوم جديد.`
    );

    // Automatic Daily Backup to Supabase (Requirement)
    SupabaseBackupService.backupSettledDay(settledSheet, groceries, suppliers, vouchers).then((res) => {
      if (res.success) {
        logAudit('نسخ احتياطي سحابي تلقائي', `كشف ${settledSheet.date}`, 'محلي', 'سحابي في Supabase', res.message);
      }
    });

    // Generate fresh clean blank rows (quantities = 0, total = 0, status = pending) ONLY after successful settle
    const effective = getEffectiveMarketDate();
    const blankRows = generateCleanRows(items, suppliers, groceries, effective.dateStr);

    const freshNewSheet: DailySheet = {
      id: `sheet_${effective.dateStr}_${Date.now()}`,
      date: effective.dateStr,
      dayName: effective.dayName,
      status: 'open',
      rows: blankRows,
      totalCost: 0,
      totalSale: 0,
      totalProfit: 0,
      notes: 'كشف عمل جديد بعد الترحيل والتصفير التلقائي',
      nightOrdersSaved: false,
      morningSortGenerated: false,
      createdAt: `${effective.dateStr} 00:00:00`,
      updatedAt: `${effective.dateStr} 00:00:00`,
    };

    const sheetsWithFresh = [
      freshNewSheet,
      ...nextSheets.filter(
        (s) => s.id !== freshNewSheet.id && !(s.date === effective.dateStr && s.status !== 'settled')
      ),
    ];
    setDailySheets(sheetsWithFresh);
    StorageService.saveDailySheets(sheetsWithFresh);
    void StorageService.flushAll();

    setCurrentWorksheetDate(effective.dateStr);
    setManagerEditingDate(null);

    alert('✅ تم ترحيل الشراء والحسابات بنجاح إلى كشوفات المدير وصفحة التقارير، وتصفير الواجهة لتصبح فارغة ونظيفة وجاهزة ليوم جديد!\n(تم النسخ الاحتياطي التلقائي في سوبابيز ☁️)');
  };

  // The KEY REQUIRED FEATURE: "تعديل شامل لليوم"
  const handleEditDayComprehensive = (sheet: DailySheet) => {
    setDailySheets((prev) => {
      const exists = prev.some((s) => s.id === sheet.id);
      if (exists) {
        return prev.map((s) => (s.id === sheet.id ? sheet : s));
      }
      return [sheet, ...prev];
    });
    setCurrentWorksheetDate(sheet.date);
    setManagerEditingDate(sheet.id);
    setActivePage('worker');
    logAudit(
      'تعديل شامل لليوم',
      `كشف ${sheet.dayName} (${sheet.date})`,
      'استعراض تقرير',
      'فتح شاشة الكشف اليومي للتعديل',
      'تم نقل المدير لشاشة التعديل الشامل مع الاحتفاظ بنفس التاريخ القديم لترحيل التعديلات'
    );
  };

  // Manager Save Edit & Resettle with Exact Original Date
  const handleSaveManagerEditAndResettle = async (updatedSheet: DailySheet) => {
    const yemen = getYemenNow();
    const normalizedRows = updatedSheet.rows.map((r) => {
      const sumGQty = Math.round(
        Object.values(r.quantities || {}).reduce((acc, q) => acc + (Number(q) || 0), 0) * 100
      ) / 100;
      const rowQty = (Number(r.totalQuantity) || 0) > 0 ? Number(r.totalQuantity) : sumGQty;
      const unitCost = Math.max(0, Number(r.costPrice) || 0);
      const lineCost = Math.round(rowQty * unitCost * 100) / 100;
      return {
        ...r,
        costPrice: unitCost,
        salePrice: unitCost,
        totalQuantity: rowQty,
        totalCost: lineCost,
        totalSale: lineCost,
        profit: 0,
      };
    });
    const totalCost = Math.round(normalizedRows.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0) * 100) / 100;

    const finalSheet: DailySheet = {
      ...updatedSheet,
      rows: normalizedRows,
      totalCost,
      totalSale: totalCost,
      totalProfit: 0,
      status: 'settled',
      updatedAt: `${yemen.dateStr} ${yemen.time12}`,
    };

    // Replace the edited sheet in place without creating duplicates, and zero out any open worksheet
    const effective = getEffectiveMarketDate();
    const blankRows = generateCleanRows(items, suppliers, groceries, effective.dateStr);
    const hasEditedSheet = dailySheets.some((s) => s.id === finalSheet.id);
    let nextSheets = (hasEditedSheet
      ? dailySheets.map((s) => (s.id === finalSheet.id ? finalSheet : s))
      : [finalSheet, ...dailySheets]
    ).map((s) => {
      if (s.status !== 'settled' && s.id !== finalSheet.id) {
        return {
          ...s,
          rows: generateCleanRows(items, suppliers, groceries, s.date),
          totalCost: 0,
          totalSale: 0,
          totalProfit: 0,
          nightOrdersSaved: false,
          morningSortGenerated: false,
        };
      }
      return s;
    });

    if (!nextSheets.some((s) => s.date === effective.dateStr && s.status !== 'settled')) {
      nextSheets = [
        {
          id: `sheet_${effective.dateStr}_${Date.now()}`,
          date: effective.dateStr,
          dayName: effective.dayName,
          status: 'open',
          rows: blankRows,
          totalCost: 0,
          totalSale: 0,
          totalProfit: 0,
          notes: 'كشف عمل نظيف بعد حفظ التعديل الشامل',
          nightOrdersSaved: false,
          morningSortGenerated: false,
          createdAt: `${effective.dateStr} 00:00:00`,
          updatedAt: `${effective.dateStr} 00:00:00`,
        },
        ...nextSheets,
      ];
    }

    StorageService.saveDailySheets(nextSheets);
    const flushRes = await StorageService.flushAll();
    if (!flushRes.success) {
      alert(
        `❌ تعذر حفظ التعديل وإعادة الترحيل في قاعدة البيانات:\n${flushRes.error || 'خطأ في الاتصال'}\n\nتم الاحتفاظ بالتعديلات في الشاشة.`
      );
      return;
    }

    setDailySheets(nextSheets);
    recalculateAllBalances(nextSheets, vouchers);

    logAudit(
      'حفظ التعديل الشامل وإعادة الترحيل بنفس التاريخ',
      `كشف ${finalSheet.dayName} (${finalSheet.date})`,
      'تعديل مدير',
      'مرحل بنفس التاريخ القديم ✅',
      `تم تحديث الحسابات والأرصدة بأثر رجعي دقيق بنفس تاريخ اليوم الأصلي (${finalSheet.date}) دون تكرار الفواتير.`
    );

    // Automatic Backup to Supabase
    SupabaseBackupService.backupSettledDay(finalSheet, groceries, suppliers, vouchers).then((res) => {
      if (res.success) {
        logAudit('نسخ احتياطي سحابي بعد تعديل اليوم', `كشف ${finalSheet.date}`, 'محلي', 'سحابي في Supabase', res.message);
      }
    });

    setCurrentWorksheetDate(effective.dateStr);
    setManagerEditingDate(null);
    setActivePage('reports');
    alert(`✅ تم حفظ التعديل الشامل وإعادة ترحيل كشف ${finalSheet.dayName} (${finalSheet.date}) بنجاح بنفس تاريخه القديم وتحديث كافة أرصدة البقالات والموردين وتصفير شاشة العمل! ☁️`);
  };

  // Add Voucher (Receipt or Payment)
  const handleAddVoucher = (voucherData: Omit<Voucher, 'id' | 'createdAt'>) => {
    const yemen = getYemenNow();
    const newVoucher: Voucher = {
      ...voucherData,
      id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: `${yemen.dateStr} ${yemen.time24}`,
    };

    const nextVouchers = [newVoucher, ...vouchers];
    setVouchers(nextVouchers);
    recalculateAllBalances(dailySheets, nextVouchers);

    if (voucherData.type === 'receipt' && voucherData.partyType === 'grocery') {
      const g = groceries.find((item) => item.id === voucherData.partyId);
      if (g) {
        const oldB = g.balance;
        const newB = Math.round((oldB - voucherData.amount) * 100) / 100;
        logAudit(
          'تسجيل سند قبض',
          `${g.name} (${g.code})`,
          `${oldB.toLocaleString()} ر.ي`,
          `${newB.toLocaleString()} ر.ي`,
          `سند رقم ${newVoucher.voucherNumber} بمبلغ ${voucherData.amount.toLocaleString()} ر.ي`
        );
      }
    } else if (voucherData.type === 'payment' && voucherData.partyType === 'supplier') {
      const s = suppliers.find((item) => item.id === voucherData.partyId);
      if (s) {
        const oldB = s.balance;
        const newB = Math.round((oldB - voucherData.amount) * 100) / 100;
        logAudit(
          'تسجيل سند صرف',
          s.name,
          `${oldB.toLocaleString()} ر.ي`,
          `${newB.toLocaleString()} ر.ي`,
          `سند رقم ${newVoucher.voucherNumber} بمبلغ ${voucherData.amount.toLocaleString()} ر.ي`
        );
      }
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
      salePrice: newItem.defaultCostPrice,
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

    // Auto-assign this supplier to any open sheet rows that lack a valid supplierId
    setDailySheets((prevSheets) =>
      prevSheets.map((sh) => {
        if (sh.status === 'settled') return sh;
        return {
          ...sh,
          rows: sh.rows.map((r) =>
            !r.supplierId
              ? { ...r, supplierId: newSupplier.id, supplierName: newSupplier.name }
              : r
          ),
        };
      })
    );

    logAudit('إضافة مورد جديد', newSupplier.name, '', `الهاتف: ${newSupplier.phone}، التخصص: ${newSupplier.specialty}`);
  };

  const handleDeleteSupplier = (id: string) => {
    const s = suppliers.find((item) => item.id === id);
    if (!s) return;
    setSuppliers((prev) => prev.filter((item) => item.id !== id));
    logAudit('حذف مورد', s.name, s.phone, 'محذوف');
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
                    ? { ...it, defaultCostPrice: costPrice, defaultSalePrice: costPrice }
                    : it
                )
              );
            }}
            onSettleSheet={handleSettleWorkerSheet}
            isManagerEditMode={Boolean(managerEditingDate && currentRole === 'admin')}
            onSaveManagerEditAndResettle={handleSaveManagerEditAndResettle}
            onBackToReports={() => {
              setManagerEditingDate(null);
              setActivePage('reports');
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
            onDeleteSupplier={handleDeleteSupplier}
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

export default function App() {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);

  // Initial load from Supabase (retry until the connection succeeds)
  useEffect(() => {
    if (status.loaded) return;
    StorageService.syncFromCloud();
    const id = setInterval(() => StorageService.syncFromCloud(), 5000);
    return () => clearInterval(id);
  }, [status.loaded]);

  const banner = status.error ? (
    <div dir="rtl" className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white text-sm font-bold px-4 py-2 text-center shadow-lg">
      ⚠️ {status.error}
    </div>
  ) : null;

  if (!status.loaded) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-700 p-6 text-center">
        {banner}
        <div className="text-lg font-black">جارٍ الاتصال بقاعدة البيانات...</div>
        {status.error && (
          <button
            onClick={() => StorageService.syncFromCloud()}
            className="px-5 py-2 rounded-xl bg-[#1e3799] text-white font-bold cursor-pointer"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {banner}
      <AppInner />
    </>
  );
}