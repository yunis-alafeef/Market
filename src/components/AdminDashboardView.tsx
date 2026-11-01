import React, { useState, useMemo } from 'react';
import { DailySheet, Grocery, Supplier, Voucher, SystemSettings } from '../types';
import { extractTime12 } from '../services/storage';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  Printer,
  PlusCircle,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CheckCircle,
  Calendar,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  AlertTriangle,
} from 'lucide-react';

interface AdminDashboardViewProps {
  sheets: DailySheet[];
  groceries: Grocery[];
  suppliers: Supplier[];
  vouchers: Voucher[];
  settings: SystemSettings;
  currentRole?: 'admin' | 'worker' | 'grocery';
  onOpenNewVoucher: (type?: 'receipt' | 'payment', partyId?: string) => void;
  onEditPaymentVoucher?: (
    voucherId: string,
    updates: {
      partyId: string;
      amount: number;
      date: string;
      paymentMethod: 'cash' | 'transfer' | 'check';
      referenceNumber?: string;
      notes: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  onDeletePaymentVoucher?: (
    voucherId: string
  ) => Promise<{ success: boolean; error?: string }>;
  onOpenPrintModal: (
    type: 'statement' | 'voucher',
    data: {
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
    }
  ) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  sheets,
  groceries,
  suppliers,
  vouchers,
  settings,
  currentRole = 'admin',
  onOpenNewVoucher,
  onEditPaymentVoucher,
  onDeletePaymentVoucher,
  onOpenPrintModal,
}) => {
  // Tabs: 'groceries_ledger' | 'suppliers_ledger' | 'vouchers_log'
  const [activeLedgerTab, setActiveLedgerTab] = useState<
    'groceries_ledger' | 'suppliers_ledger' | 'vouchers_log'
  >('groceries_ledger');

  const [selectedGroceryId, setSelectedGroceryId] = useState<string>(groceries[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // State for Editing a Supplier Payment Voucher (Admin Only)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [editPartyId, setEditPartyId] = useState<string>('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'transfer' | 'check'>('cash');
  const [editReferenceNumber, setEditReferenceNumber] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingVoucherEdit, setIsSavingVoucherEdit] = useState<boolean>(false);
  const [voucherActionFeedback, setVoucherActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // State for Confirming Deletion of a Supplier Payment Voucher (Admin Only)
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);
  const [isDeletingVoucher, setIsDeletingVoucher] = useState<boolean>(false);

  const handleOpenEditVoucher = (v: Voucher) => {
    if (currentRole !== 'admin') return;
    setVoucherActionFeedback(null);
    setEditingVoucher(v);
    setEditPartyId(v.partyId);
    setEditAmount(v.amount);
    setEditDate(v.date);
    setEditPaymentMethod(v.paymentMethod);
    setEditReferenceNumber(v.referenceNumber || '');
    setEditNotes(v.notes || '');
  };

  const handleSaveEditedVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher || !onEditPaymentVoucher) return;
    if (editAmount <= 0) {
      setVoucherActionFeedback({
        type: 'error',
        message: '⚠️ يرجى إدخال مبلغ صحيح أكبر من الصفر.',
      });
      return;
    }
    setIsSavingVoucherEdit(true);
    try {
      const res = await onEditPaymentVoucher(editingVoucher.id, {
        partyId: editPartyId,
        amount: editAmount,
        date: editDate,
        paymentMethod: editPaymentMethod,
        referenceNumber: editReferenceNumber,
        notes: editNotes,
      });
      if (!res.success) {
        setVoucherActionFeedback({
          type: 'error',
          message: res.error || '⚠️ تعذر حفظ التعديلات.',
        });
      } else {
        setVoucherActionFeedback({
          type: 'success',
          message: `✅ تم تحديث سند الصرف رقم (${editingVoucher.voucherNumber}) وإعادة احتساب رصيد المورد بنجاح.`,
        });
        setEditingVoucher(null);
      }
    } finally {
      setIsSavingVoucherEdit(false);
    }
  };

  const handleConfirmDeleteVoucher = async () => {
    if (!deletingVoucher || !onDeletePaymentVoucher) return;
    setIsDeletingVoucher(true);
    try {
      const res = await onDeletePaymentVoucher(deletingVoucher.id);
      if (!res.success) {
        setVoucherActionFeedback({
          type: 'error',
          message: res.error || '⚠️ تعذر حذف السند.',
        });
      } else {
        setVoucherActionFeedback({
          type: 'success',
          message: `✅ تم حذف سند الصرف رقم (${deletingVoucher.voucherNumber}) للمورد (${deletingVoucher.partyName}) بمبلغ (${deletingVoucher.amount.toLocaleString()} ر.ي) وإعادة احتساب الأرصدة بنجاح.`,
        });
        setDeletingVoucher(null);
      }
    } finally {
      setIsDeletingVoucher(false);
    }
  };

  // Top Statistics
  // Card 1: "مشتريات اليوم التقديرية" = Current active open worksheet total: sum of (required item qty today * costPrice), returns to 0 immediately upon settling
  const todaySheet = sheets.find((s) => s.status !== 'settled');
  const todayPurchases = todaySheet
    ? Math.round(
        todaySheet.rows.reduce((sum, r) => {
          const sumGQty = Object.values(r.quantities || {}).reduce((acc, q) => acc + (Number(q) || 0), 0);
          const rowQty = sumGQty > 0 ? sumGQty : Math.max(0, Number(r.totalQuantity) || 0);
          const unitCost = Math.max(0, Number(r.costPrice) || 0);
          return sum + Math.round(rowQty * unitCost * 100) / 100;
        }, 0) * 100
      ) / 100
    : 0;
  const todaySales = todayPurchases;

  // Dynamic ledger totals from settled sheets and vouchers (guarantees 100% mathematical precision and prevents stale/inverted sign balances)
  const { groceryBalancesMap, supplierBalancesMap, totalGroceryDebt, totalSupplierDebt, netBalance } = useMemo(() => {
    const gMap: Record<string, number> = {};
    const sMap: Record<string, number> = {};

    groceries.forEach((g) => {
      gMap[g.id] = 0;
    });
    suppliers.forEach((s) => {
      sMap[s.id] = 0;
    });

    // 1. Add settled sheets:
    // - Grocery balance += (grocery qty * costPrice)
    // - Supplier balance += (total item qty * costPrice)
    sheets.forEach((s) => {
      if (s.status === 'settled') {
        s.rows.forEach((r) => {
          const unitCost = Math.max(0, Number(r.costPrice) || 0);
          let sumGroceryQty = 0;
          Object.entries(r.quantities || {}).forEach(([gId, qVal]) => {
            const q = Math.max(0, Number(qVal) || 0);
            if (q > 0) {
              sumGroceryQty += q;
              if (unitCost > 0) {
                const lineAmount = Math.round(q * unitCost * 100) / 100;
                gMap[gId] = Math.round(((gMap[gId] || 0) + lineAmount) * 100) / 100;
              }
            }
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
            sMap[matchedSupplierId] = Math.round(((sMap[matchedSupplierId] || 0) + lineCost) * 100) / 100;
          }
        });
      }
    });

    // 2. Subtract vouchers:
    // - Grocery receipt voucher reduces grocery debt: gMap[gId] -= amount
    // - Supplier payment voucher reduces supplier debt: sMap[sId] -= amount
    vouchers.forEach((v) => {
      const amt = Math.max(0, Number(v.amount) || 0);
      if (v.partyType === 'grocery' && v.type === 'receipt') {
        gMap[v.partyId] = Math.round(((gMap[v.partyId] || 0) - amt) * 100) / 100;
      } else if (v.partyType === 'supplier' && v.type === 'payment') {
        sMap[v.partyId] = Math.round(((sMap[v.partyId] || 0) - amt) * 100) / 100;
      }
    });

    const totGrocery = Math.round(
      groceries.reduce((sum, g) => sum + (gMap[g.id] ?? 0), 0) * 100
    ) / 100;
    const totSupplier = Math.round(
      suppliers.reduce((sum, s) => sum + (sMap[s.id] ?? 0), 0) * 100
    ) / 100;
    const net = Math.round((totGrocery - totSupplier) * 100) / 100;

    return {
      groceryBalancesMap: gMap,
      supplierBalancesMap: sMap,
      totalGroceryDebt: totGrocery,
      totalSupplierDebt: totSupplier,
      netBalance: net,
    };
  }, [sheets, vouchers, groceries, suppliers]);

  // Generate detailed statement rows for a grocery
  const getGroceryStatement = (groceryId: string) => {
    const g = groceries.find((item) => item.id === groceryId);
    if (!g) return [];

    const rows: {
      date: string;
      time?: string | null;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    // Opening balance starts at 0.00 (no phantom hardcoded opening balance)
    let runningBalance = 0;

    // Add daily purchases from settled sheets
    const sortedSettled = [...sheets]
      .filter((s) => s.status === 'settled')
      .sort((a, b) => a.date.localeCompare(b.date));

    sortedSettled.forEach((sheet) => {
      const items = sheet.rows.filter((r) => (Number(r.quantities[groceryId]) || 0) > 0);
      const totalAmount = Math.round(
        items.reduce(
          (sum, r) => sum + Math.round((Number(r.quantities[groceryId]) || 0) * (Number(r.costPrice) || 0) * 100) / 100,
          0
        ) * 100
      ) / 100;

      if (totalAmount > 0) {
        rows.push({
          date: sheet.date,
          time: extractTime12(sheet.updatedAt, sheet.createdAt),
          description: `مسحوبات خضروات كشف ${sheet.dayName} (${items.length} أصناف)`,
          debit: totalAmount,
          credit: 0,
          balance: 0,
        });
      }
    });

    // Add receipt vouchers
    const groceryVouchers = vouchers.filter(
      (v) => v.partyId === groceryId && v.type === 'receipt'
    );
    groceryVouchers.forEach((v) => {
      rows.push({
        date: v.date,
        time: extractTime12(v.createdAt),
        description: `سند قبض رقم ${v.voucherNumber} (${v.notes}) - ${v.paymentMethod === 'cash' ? 'نقداً' : 'تحويل'}`,
        debit: 0,
        credit: Number(v.amount) || 0,
        balance: 0,
      });
    });

    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.map((r) => {
      runningBalance = Math.round((runningBalance + r.debit - r.credit) * 100) / 100;
      return { ...r, balance: runningBalance };
    });
  };

  // Generate statement rows for a supplier
  const getSupplierStatement = (supplierId: string) => {
    const s = suppliers.find((item) => item.id === supplierId);
    if (!s) return [];

    const rows: {
      date: string;
      time?: string | null;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    let runningBalance = 0;

    // Add purchases from settled sheets
    const sortedSettled = [...sheets]
      .filter((s) => s.status === 'settled')
      .sort((a, b) => a.date.localeCompare(b.date));

    sortedSettled.forEach((sheet) => {
      const items = sheet.rows.filter((r) => {
        const cleanSupplierName = (r.supplierName || '').replace(' (مورد إضافي)', '').trim();
        return (
          r.supplierId === supplierId ||
          (!r.supplierId && (r.supplierName === s.name || cleanSupplierName === s.name))
        );
      });
      const totalCost = Math.round(
        items.reduce((sum, r) => {
          const sumGQty = Object.values(r.quantities || {}).reduce((acc, q) => acc + (Number(q) || 0), 0);
          const rowQty = (Number(r.totalQuantity) || 0) > 0 ? Number(r.totalQuantity) : sumGQty;
          const unitCost = Number(r.costPrice) || 0;
          return sum + Math.round(rowQty * unitCost * 100) / 100;
        }, 0) * 100
      ) / 100;

      if (totalCost > 0) {
        rows.push({
          date: sheet.date,
          time: extractTime12(sheet.updatedAt, sheet.createdAt),
          description: `توريد خضار كشف ${sheet.dayName} (${items.map((i) => i.itemName).join('، ')})`,
          debit: totalCost,
          credit: 0,
          balance: 0,
        });
      }
    });

    // Add payment vouchers to this supplier
    const supplierVouchers = vouchers.filter(
      (v) => v.partyId === supplierId && v.type === 'payment'
    );
    supplierVouchers.forEach((v) => {
      rows.push({
        date: v.date,
        time: extractTime12(v.createdAt),
        description: `سند صرف رقم ${v.voucherNumber} (${v.notes})`,
        debit: 0,
        credit: Number(v.amount) || 0,
        balance: 0,
      });
    });

    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.map((r) => {
      runningBalance = Math.round((runningBalance + r.debit - r.credit) * 100) / 100;
      return { ...r, balance: runningBalance };
    });
  };

  const selectedGrocery = groceries.find((g) => g.id === selectedGroceryId) || groceries[0];
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  const currentGroceryStatement = selectedGrocery ? getGroceryStatement(selectedGrocery.id) : [];
  const currentSupplierStatement = selectedSupplier ? getSupplierStatement(selectedSupplier.id) : [];

  // Date Filter State for Statements (Requirement 5)
  const [statementStartDate, setStatementStartDate] = useState<string>('');
  const [statementEndDate, setStatementEndDate] = useState<string>('');
  const [appliedStatementFilter, setAppliedStatementFilter] = useState<{ start: string; end: string } | null>(null);

  const handleApplyStatementFilter = () => {
    if (!statementStartDate && !statementEndDate) {
      setAppliedStatementFilter(null);
      return;
    }
    setAppliedStatementFilter({
      start: statementStartDate,
      end: statementEndDate,
    });
  };

  const handleClearStatementFilter = () => {
    setStatementStartDate('');
    setStatementEndDate('');
    setAppliedStatementFilter(null);
  };

  const displayedGroceryStatement = useMemo(() => {
    if (!appliedStatementFilter) return currentGroceryStatement;
    return currentGroceryStatement.filter((row) => {
      if (appliedStatementFilter.start && row.date < appliedStatementFilter.start) return false;
      if (appliedStatementFilter.end && row.date > appliedStatementFilter.end) return false;
      return true;
    });
  }, [currentGroceryStatement, appliedStatementFilter]);

  const displayedSupplierStatement = useMemo(() => {
    if (!appliedStatementFilter) return currentSupplierStatement;
    return currentSupplierStatement.filter((row) => {
      if (appliedStatementFilter.start && row.date < appliedStatementFilter.start) return false;
      if (appliedStatementFilter.end && row.date > appliedStatementFilter.end) return false;
      return true;
    });
  }, [currentSupplierStatement, appliedStatementFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">لوحة تحكم المدير المالية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            التقارير المحاسبية، ديون الموردين والبقالات، كشوفات الحساب وسندات القبض والصرف.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenNewVoucher('receipt')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#009432] hover:bg-[#007b29] rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            + سند قبض (من بقالة)
          </button>
          <button
            onClick={() => onOpenNewVoucher('payment')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            + سند صرف (لمورد)
          </button>
        </div>
      </div>

      {/* 4 Core Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">مشتريات اليوم التقديرية</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e3799] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#0c2461] tabular-nums">
            {todayPurchases.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>إجمالي تكلفة المشتريات للبقالات</span>
            <span className="text-[#006266] font-semibold">بسعر الشراء المباشر</span>
          </div>
        </div>

        {/* Card 2: Supplier Debts (Payables) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">مستحقات الموردين (ديون علينا)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 tabular-nums">
            {totalSupplierDebt.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            مستحقة لـ <span className="font-bold text-slate-700">{suppliers.length} موردين معتمدين</span>
          </div>
        </div>

        {/* Card 3: Grocery Debts (Receivables) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">ذمم البقالات (مستحقات لنا)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009432] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#009432] tabular-nums">
            {totalGroceryDebt.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            موزعة على <span className="font-bold text-slate-700">{groceries.length} بقالات شريكة</span>
          </div>
        </div>

        {/* Card 4: Net Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">صافي الموقف المالي</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#0c2461] tabular-nums bg-[#f6b93b]/20 px-2 py-0.5 rounded-lg inline-block">
            {netBalance >= 0 ? `+${netBalance.toLocaleString()}` : netBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-800">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            فائض المستحقات مقابل التزامات الموردين
          </div>
        </div>
      </div>

      {/* Tabs Row for Ledgers and Vouchers */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Navigation Bar inside panel */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveLedgerTab('groceries_ledger')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeLedgerTab === 'groceries_ledger'
                  ? 'bg-white text-[#0c2461] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كشوفات حساب البقالات
            </button>
            <button
              onClick={() => setActiveLedgerTab('suppliers_ledger')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeLedgerTab === 'suppliers_ledger'
                  ? 'bg-white text-[#0c2461] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كشوفات حساب الموردين
            </button>
            <button
              onClick={() => setActiveLedgerTab('vouchers_log')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeLedgerTab === 'vouchers_log'
                  ? 'bg-white text-[#0c2461] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سجل السندات المالية ({vouchers.length})
            </button>
          </div>
        </div>

        {/* TAB 1: GROCERY LEDGER */}
        {activeLedgerTab === 'groceries_ledger' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">اختر البقالة:</span>
                <select
                  value={selectedGroceryId}
                  onChange={(e) => setSelectedGroceryId(e.target.value)}
                  className="px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none"
                >
                  {groceries.map((g) => {
                    const actualBal = groceryBalancesMap[g.id] ?? 0;
                    return (
                      <option key={g.id} value={g.id}>
                        ({g.code}) {g.name} - الرصيد: {actualBal.toLocaleString()} ر.ي
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedGrocery && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenNewVoucher('receipt', selectedGrocery.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#009432] rounded-xl hover:bg-[#007b29] transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    تسجيل سند قبض
                  </button>

                  <button
                    onClick={() =>
                      onOpenPrintModal('statement', {
                        grocery: { ...selectedGrocery, balance: groceryBalancesMap[selectedGrocery.id] ?? 0 },
                        statementRows: displayedGroceryStatement,
                      })
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    طباعة كشف الحساب
                  </button>
                </div>
              )}
            </div>

            {/* Date Range Filter Strip (Requirement 5) */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <label className="font-bold text-slate-700">من تاريخ:</label>
                  <input
                    type="date"
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <label className="font-bold text-slate-700">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyStatementFilter}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>🔍 عرض الكشف</span>
                </button>

                {appliedStatementFilter && (
                  <button
                    type="button"
                    onClick={handleClearStatementFilter}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    إلغاء الفلترة
                  </button>
                )}
              </div>

              {appliedStatementFilter && (
                <div className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-xl">
                  عرض {displayedGroceryStatement.length} حركة بين {appliedStatementFilter.start || 'البداية'} و {appliedStatementFilter.end || 'الآن'}
                </div>
              )}
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 w-28 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">البيان والحركة</th>
                    <th className="p-3 text-center font-bold w-32">مدين (مسحوبات)</th>
                    <th className="p-3 text-center font-bold w-32">دائن (سدادات)</th>
                    <th className="p-3 text-center font-bold w-32 bg-[#1e3799]">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedGroceryStatement.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-baseline gap-1.5">
                          <span>{row.date}</span>
                          {row.time && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {row.time}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">{row.description}</td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-slate-800">
                        {row.debit > 0 ? `${row.debit.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-[#009432] font-bold">
                        {row.credit > 0 ? `${row.credit.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#0c2461] bg-slate-100/70">
                        {row.balance.toLocaleString()} ر.ي
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUPPLIERS LEDGER */}
        {activeLedgerTab === 'suppliers_ledger' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">اختر المورد:</span>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none"
                >
                  {suppliers.map((s) => {
                    const actualBal = supplierBalancesMap[s.id] ?? 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} - المستحق له: {actualBal.toLocaleString()} ر.ي
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedSupplier && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenNewVoucher('payment', selectedSupplier.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0c2461] rounded-xl hover:bg-[#1e3799] transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    تسجيل سند صرف
                  </button>

                  <button
                    onClick={() =>
                      onOpenPrintModal('statement', {
                        supplier: { ...selectedSupplier, balance: supplierBalancesMap[selectedSupplier.id] ?? 0 },
                        statementRows: displayedSupplierStatement,
                      })
                    }
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    طباعة كشف الحساب
                  </button>
                </div>
              )}
            </div>

            {/* Date Range Filter Strip (Requirement 5) */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <label className="font-bold text-slate-700">من تاريخ:</label>
                  <input
                    type="date"
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <label className="font-bold text-slate-700">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyStatementFilter}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>🔍 عرض الكشف</span>
                </button>

                {appliedStatementFilter && (
                  <button
                    type="button"
                    onClick={handleClearStatementFilter}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  >
                    إلغاء الفلترة
                  </button>
                )}
              </div>

              {appliedStatementFilter && (
                <div className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-xl">
                  عرض {displayedSupplierStatement.length} حركة بين {appliedStatementFilter.start || 'البداية'} و {appliedStatementFilter.end || 'الآن'}
                </div>
              )}
            </div>

            {/* Supplier Statement Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 w-28 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">البيان والحركة</th>
                    <th className="p-3 text-center font-bold w-32">استحقاق (توريدات)</th>
                    <th className="p-3 text-center font-bold w-32">مسدد (سندات صرف)</th>
                    <th className="p-3 text-center font-bold w-32 bg-[#1e3799]">الرصيد المتبقي له</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSupplierStatement.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-baseline gap-1.5">
                          <span>{row.date}</span>
                          {row.time && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {row.time}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">{row.description}</td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-slate-800">
                        {row.debit > 0 ? `${row.debit.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-[#009432] font-bold">
                        {row.credit > 0 ? `${row.credit.toLocaleString()} ر.ي` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#0c2461] bg-slate-100/70">
                        {row.balance.toLocaleString()} ر.ي
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: VOUCHERS LOG */}
        {activeLedgerTab === 'vouchers_log' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <span className="text-xs font-bold text-slate-600">
                جميع سندات القبض والصرف الموثقة في النظام
              </span>
              <input
                type="text"
                placeholder="بحث برقم السند أو اسم الجهة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
              />
            </div>

            {voucherActionFeedback && (
              <div
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl text-xs font-bold border ${
                  voucherActionFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span>{voucherActionFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setVoucherActionFeedback(null)}
                  className="px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 font-bold">رقم السند</th>
                    <th className="p-3 font-bold">النوع</th>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">الجهة</th>
                    <th className="p-3 text-center font-bold">المبلغ</th>
                    <th className="p-3 text-center font-bold">طريقة الدفع</th>
                    <th className="p-3 font-bold">البيان والملاحظات</th>
                    <th className="p-3 text-center font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers
                    .filter(
                      (v) =>
                        v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        v.partyName.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((voucher) => {
                      const isSupplierPayment =
                        voucher.type === 'payment' && voucher.partyType === 'supplier';
                      const canManagePaymentVoucher =
                        isSupplierPayment && currentRole === 'admin';

                      return (
                        <tr key={voucher.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-[#0c2461]">
                            {voucher.voucherNumber}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                voucher.type === 'receipt'
                                  ? 'bg-[#009432]/10 text-[#009432]'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {voucher.type === 'receipt' ? 'سند قبض' : 'سند صرف'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                            <span className="inline-flex items-baseline gap-1.5">
                              <span>{voucher.date}</span>
                              {extractTime12(voucher.createdAt) && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {extractTime12(voucher.createdAt)}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{voucher.partyName}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-sm text-[#0c2461] tabular-nums">
                            {voucher.amount.toLocaleString()} ر.ي
                          </td>
                          <td className="p-2.5 text-center text-slate-700">
                            {voucher.paymentMethod === 'cash'
                              ? 'نقداً'
                              : voucher.paymentMethod === 'transfer'
                              ? 'تحويل'
                              : 'شيك'}
                          </td>
                          <td className="p-2.5 text-slate-600 max-w-xs truncate">{voucher.notes}</td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              {/* 1. طباعة */}
                              <button
                                type="button"
                                onClick={() => onOpenPrintModal('voucher', { voucher })}
                                className="p-1.5 text-slate-500 hover:text-[#0c2461] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="طباعة السند"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* 2. تعديل (✏️) - لسندات صرف الموردين وللمدير فقط */}
                              {canManagePaymentVoucher && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditVoucher(voucher)}
                                  className="p-1.5 text-[#0c2461] hover:bg-[#0c2461]/10 rounded-lg transition-colors cursor-pointer"
                                  title="تعديل سند الصرف ✏️"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}

                              {/* 3. حذف (🗑) - لسندات صرف الموردين وللمدير فقط */}
                              {canManagePaymentVoucher && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoucherActionFeedback(null);
                                    setDeletingVoucher(voucher);
                                  }}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف سند الصرف 🗑"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Supplier Payment Voucher Modal (Admin Only) */}
      {editingVoucher && currentRole === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0c2461] text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#f6b93b]" />
                <div>
                  <h3 className="font-bold text-base">
                    تعديل سند صرف مورد ({editingVoucher.voucherNumber})
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    سيتم استبدال الأثر المحاسبي القديم للسند بالأثر الجديد وإعادة احتساب رصيد المورد تلقائياً.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedVoucher} className="p-6 space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  اسم المورد (المستفيد)
                </label>
                <select
                  value={editPartyId}
                  onChange={(e) => setEditPartyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
                  required
                >
                  {suppliers.map((s) => {
                    const actualBal = supplierBalancesMap[s.id] ?? 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} - الرصيد الحالي: {actualBal.toLocaleString()} ر.ي
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    المبلغ (ر.ي)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={editAmount || ''}
                    onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-bold font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('cash')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      editPaymentMethod === 'cash'
                        ? 'border-[#009432] bg-[#009432]/10 text-[#009432]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('transfer')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      editPaymentMethod === 'transfer'
                        ? 'border-[#1e3799] bg-[#1e3799]/10 text-[#1e3799]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    تحويل بنكي
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('check')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      editPaymentMethod === 'check'
                        ? 'border-[#f6b93b] bg-[#f6b93b]/10 text-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    شيك
                  </button>
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  رقم الحوالة / الشيك / المرجع
                </label>
                <input
                  type="text"
                  value={editReferenceNumber}
                  onChange={(e) => setEditReferenceNumber(e.target.value)}
                  placeholder="مثال: نقداً بالصندوق أو رقم الحوالة"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  البيان والملاحظات
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="بيان السند وملاحظات الصرف..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingVoucherEdit}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingVoucherEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Supplier Payment Voucher (Admin Only) */}
      {deletingVoucher && currentRole === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base">تأكيد حذف وإلغاء سند صرف</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingVoucher(null)}
                className="p-1.5 text-rose-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف سند الصرف التالي وإلغاء أثره المحاسبي؟
              </p>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">رقم السند:</span>
                  <span className="font-mono font-black text-[#0c2461]">
                    {deletingVoucher.voucherNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">اسم المورد:</span>
                  <span className="font-black text-slate-900">{deletingVoucher.partyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">المبلغ المراد حذفه:</span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {deletingVoucher.amount.toLocaleString()} ر.ي
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">التاريخ:</span>
                  <span className="font-mono text-slate-700">{deletingVoucher.date}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                عند التأكيد، سيتم إلغاء أثر هذا السند وإعادة احتساب رصيد المورد وكشف حسابه ومستحقات الموردين وصافي الموقف المالي من القيود الفعلية فوراً، مع حفظ العملية في سجل التدقيق.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeletingVoucher(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  تراجع / إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeletingVoucher}
                  onClick={handleConfirmDeleteVoucher}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingVoucher ? 'جارٍ الحذف...' : 'تأكيد حذف السند'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
