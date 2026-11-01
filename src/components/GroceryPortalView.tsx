import React, { useState, useMemo } from 'react';
import { Grocery, DailySheet, Voucher, SystemSettings } from '../types';
import { extractTime12 } from '../services/storage';
import {
  Store,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Package,
  Calendar,
  Lock,
  Search,
} from 'lucide-react';

interface GroceryPortalViewProps {
  groceries: Grocery[];
  sheets: DailySheet[];
  vouchers: Voucher[];
  settings: SystemSettings;
  currentUser?: { role: 'admin' | 'worker' | 'grocery'; groceryId?: string } | null;
  onOpenPrintModal: (
    type: 'statement' | 'morning_sort',
    data: {
      grocery?: Grocery;
      sheet?: DailySheet;
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

export const GroceryPortalView: React.FC<GroceryPortalViewProps> = ({
  groceries,
  sheets,
  vouchers,
  settings,
  currentUser,
  onOpenPrintModal,
}) => {
  // If grocery user, lock to their groceryId
  const defaultGId =
    currentUser?.role === 'grocery' && currentUser.groceryId
      ? currentUser.groceryId
      : groceries[0]?.id || '';

  const [selectedGroceryId, setSelectedGroceryId] = useState<string>(defaultGId);
  const [activeTab, setActiveTab] = useState<'today_delivery' | 'statement'>('today_delivery');

  const selectedGrocery =
    (currentUser?.role === 'grocery' && currentUser.groceryId
      ? groceries.find((g) => g.id === currentUser.groceryId)
      : groceries.find((g) => g.id === selectedGroceryId)) || groceries[0];
  const todaySheet =
    sheets.find(
      (s) =>
        s.status === 'settled' &&
        s.rows.some((r) => (Number(r.quantities[selectedGrocery?.id]) || 0) > 0)
    ) ||
    sheets.find((s) => s.status === 'settled' && (Number(s.totalCost) || 0) > 0) ||
    sheets[0] ||
    sheets[sheets.length - 1];

  // Calculate today's delivery items for this grocery
  const todayItems = todaySheet
    ? todaySheet.rows.filter((r) => (r.quantities[selectedGrocery.id] || 0) > 0)
    : [];

  const todayTotalQty = todayItems.reduce(
    (sum, r) => sum + (r.quantities[selectedGrocery.id] || 0),
    0
  );
  const todayTotalCost = todayItems.reduce(
    (sum, r) => sum + (r.quantities[selectedGrocery.id] || 0) * r.costPrice,
    0
  );

  // Statement rows calculation
  const getStatementRows = () => {
    if (!selectedGrocery) return [];

    const rows: {
      date: string;
      time?: string | null;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    let running = 0;

    const sortedSettled = [...sheets]
      .filter((s) => s.status === 'settled')
      .sort((a, b) => a.date.localeCompare(b.date));

    sortedSettled.forEach((sheet) => {
      const items = sheet.rows.filter((r) => (Number(r.quantities[selectedGrocery.id]) || 0) > 0);
      const sumAmount = Math.round(
        items.reduce(
          (sum, r) => sum + Math.round((Number(r.quantities[selectedGrocery.id]) || 0) * (Number(r.costPrice) || 0) * 100) / 100,
          0
        ) * 100
      ) / 100;

      if (sumAmount > 0) {
        rows.push({
          date: sheet.date,
          time: extractTime12(sheet.updatedAt, sheet.createdAt),
          description: `فاتورة خضروات كشف ${sheet.dayName} (${items.length} أصناف)`,
          debit: sumAmount,
          credit: 0,
          balance: 0,
        });
      }
    });

    const gVouchers = vouchers.filter(
      (v) => v.partyId === selectedGrocery.id && v.type === 'receipt'
    );
    gVouchers.forEach((v) => {
      rows.push({
        date: v.date,
        time: extractTime12(v.createdAt),
        description: `سند سداد رقم ${v.voucherNumber} (${v.paymentMethod === 'cash' ? 'نقداً' : 'تحويل'})`,
        debit: 0,
        credit: Number(v.amount) || 0,
        balance: 0,
      });
    });

    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows.map((r) => {
      running = Math.round((running + r.debit - r.credit) * 100) / 100;
      return { ...r, balance: running };
    });
  };

  const statementRows = getStatementRows();
  const actualBalance = statementRows.length > 0 ? statementRows[statementRows.length - 1].balance : 0;

  // Date Filter State for Grocery Statement (Requirement 5)
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

  const displayedStatementRows = useMemo(() => {
    if (!appliedStatementFilter) return statementRows;
    return statementRows.filter((row) => {
      if (appliedStatementFilter.start && row.date < appliedStatementFilter.start) return false;
      if (appliedStatementFilter.end && row.date > appliedStatementFilter.end) return false;
      return true;
    });
  }, [statementRows, appliedStatementFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#f6b93b]/20 text-[#0c2461] flex items-center justify-center shrink-0 font-bold text-xl">
            {selectedGrocery?.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{selectedGrocery?.name}</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                PIN: {selectedGrocery?.pin}
              </span>
              <span className="text-xs bg-emerald-50 text-[#009432] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                صلاحية قراءة فقط (Read-Only)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              بوابة العميل المخصصة لمتابعة الاستلامات الصباحية اليومية ومراجعة كشف الحساب والمدفوعات.
            </p>
          </div>
        </div>

        {/* Grocery Switcher for Admin Only */}
        {currentUser?.role === 'admin' ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">تبديل حساب البقالة (معاينة المدير):</span>
            <select
              value={selectedGroceryId}
              onChange={(e) => setSelectedGroceryId(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
            >
              {groceries.map((g) => (
                <option key={g.id} value={g.id}>
                  ({g.code}) {g.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-emerald-50 text-[#009432] border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>حساب موثق: {selectedGrocery?.name}</span>
          </div>
        )}
      </div>

      {/* Grocery Financial Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Balance Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">الرصيد الحالي المستحق عليك</span>
          <div className="text-2xl font-black font-mono text-[#0c2461] tabular-nums">
            {actualBalance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-600">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            الحد الائتماني المعتمد: {selectedGrocery.creditLimit.toLocaleString()} ر.ي
          </div>
        </div>

        {/* Today's Order Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">فاتورة تسليم اليوم الصباحية</span>
          <div className="text-2xl font-black font-mono text-[#006266] tabular-nums">
            {todayTotalCost.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-600">ر.ي</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            إجمالي {todayTotalQty} وحدة مقسمة على {todayItems.length} أصناف
          </div>
        </div>

        {/* Credit Utilization */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">حالة الحساب والائتمان</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-bold text-[#009432]">نشط وموثق</span>
            <span className="text-xs bg-[#f6b93b]/20 text-[#0c2461] font-bold px-2 py-0.5 rounded-full">
              نسبة الائتمان: {Math.max(0, Math.min(100, Math.round((actualBalance / (selectedGrocery.creditLimit || 1)) * 100)))}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            صاحب الحساب: {selectedGrocery.ownerName} ({selectedGrocery.phone})
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('today_delivery')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'today_delivery'
                  ? 'bg-white text-[#0c2461] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كشف فرز واستلام الصباح اليوم
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'statement'
                  ? 'bg-white text-[#0c2461] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كشف الحساب التراكمي
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'today_delivery' && todaySheet) {
                  onOpenPrintModal('morning_sort', {
                    grocery: { ...selectedGrocery, balance: actualBalance },
                    sheet: todaySheet,
                  });
                } else {
                  onOpenPrintModal('statement', {
                    grocery: { ...selectedGrocery, balance: actualBalance },
                    statementRows: displayedStatementRows,
                  });
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-[#f6b93b] hover:bg-[#e5aa32] rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              طباعة / حفظ PDF
            </button>
          </div>
        </div>

        {/* TAB 1: TODAY DELIVERY (فرز الصباح) */}
        {activeTab === 'today_delivery' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500">
              <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                <span>تاريخ الكشف:</span>
                <span className="font-mono font-bold text-slate-800">{todaySheet?.date}</span>
                {todaySheet && extractTime12(todaySheet.updatedAt, todaySheet.createdAt) && (
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    {extractTime12(todaySheet.updatedAt, todaySheet.createdAt)}
                  </span>
                )}
                <span>({todaySheet?.dayName})</span>
              </span>
              <span className="text-[#009432] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                تم التوريد والمعاينة
              </span>
            </div>

            {todayItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                لا توجد طلبيات مسجلة لهذه البقالة اليوم.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#006266] text-white">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">الصنف المستلم</th>
                      <th className="p-3">العبوة</th>
                      <th className="p-3 text-center">الكمية المسلمة</th>
                      <th className="p-3 text-center">سعر الوحدة</th>
                      <th className="p-3 text-center">إجمالي القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayItems.map((r, idx) => {
                      const q = r.quantities[selectedGrocery.id] || 0;
                      const lineTotal = q * r.costPrice;

                      return (
                        <tr
                          key={r.id}
                          className={`border-b border-slate-200 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                          }`}
                        >
                          <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{r.itemName}</td>
                          <td className="p-2.5 text-slate-600">{r.unit}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-base text-[#006266] tabular-nums">
                            {q}
                          </td>
                          <td className="p-2.5 text-center font-mono tabular-nums text-slate-700">
                            {r.costPrice.toLocaleString()} ر.ي
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#0c2461]">
                            {lineTotal.toLocaleString()} ر.ي
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-[#006266]">
                      <td colSpan={3} className="p-3 text-right">
                        إجمالي فاتورة اليوم:
                      </td>
                      <td className="p-3 text-center font-mono text-base text-[#006266] tabular-nums">
                        {todayTotalQty}
                      </td>
                      <td className="p-3 text-center">-</td>
                      <td className="p-3 text-center font-mono text-base text-[#0c2461] bg-[#f6b93b]/20 tabular-nums">
                        {todayTotalCost.toLocaleString()} ر.ي
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED STATEMENT (كشف الحساب) */}
        {activeTab === 'statement' && (
          <div className="p-4 sm:p-6 space-y-4">
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
                  عرض {displayedStatementRows.length} حركة بين {appliedStatementFilter.start || 'البداية'} و {appliedStatementFilter.end || 'الآن'}
                </div>
              )}
            </div>

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
                  {displayedStatementRows.map((row, idx) => (
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
      </div>
    </div>
  );
};
