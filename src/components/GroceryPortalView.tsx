import React, { useState } from 'react';
import { Grocery, DailySheet, Voucher, SystemSettings } from '../types';
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
} from 'lucide-react';

interface GroceryPortalViewProps {
  groceries: Grocery[];
  sheets: DailySheet[];
  vouchers: Voucher[];
  settings: SystemSettings;
  onOpenPrintModal: (
    type: 'statement' | 'morning_sort',
    data: {
      grocery?: Grocery;
      sheet?: DailySheet;
      statementRows?: {
        date: string;
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
  onOpenPrintModal,
}) => {
  const [selectedGroceryId, setSelectedGroceryId] = useState<string>(groceries[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'today_delivery' | 'statement'>('today_delivery');

  const selectedGrocery =
    groceries.find((g) => g.id === selectedGroceryId) || groceries[0];
  const todaySheet = sheets[0] || sheets[sheets.length - 1];

  // Calculate today's delivery items for this grocery
  const todayItems = todaySheet
    ? todaySheet.rows.filter((r) => (r.quantities[selectedGrocery.id] || 0) > 0)
    : [];

  const todayTotalQty = todayItems.reduce(
    (sum, r) => sum + (r.quantities[selectedGrocery.id] || 0),
    0
  );
  const todayTotalCost = todayItems.reduce(
    (sum, r) => sum + (r.quantities[selectedGrocery.id] || 0) * r.salePrice,
    0
  );

  // Statement rows calculation
  const getStatementRows = () => {
    if (!selectedGrocery) return [];

    const rows: {
      date: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    let running = selectedGrocery.balance * 0.4;
    rows.push({
      date: '2026-10-20',
      description: 'رصيد سابق مرحل',
      debit: running,
      credit: 0,
      balance: running,
    });

    sheets.forEach((sheet) => {
      const items = sheet.rows.filter((r) => (r.quantities[selectedGrocery.id] || 0) > 0);
      const sumAmount = items.reduce(
        (sum, r) => sum + (r.quantities[selectedGrocery.id] || 0) * r.salePrice,
        0
      );

      if (sumAmount > 0) {
        running += sumAmount;
        rows.push({
          date: sheet.date,
          description: `فاتورة خضروات كشف ${sheet.dayName} (${items.length} أصناف)`,
          debit: sumAmount,
          credit: 0,
          balance: running,
        });
      }
    });

    const gVouchers = vouchers.filter(
      (v) => v.partyId === selectedGrocery.id && v.type === 'receipt'
    );
    gVouchers.forEach((v) => {
      running -= v.amount;
      rows.push({
        date: v.date,
        description: `سند سداد رقم ${v.voucherNumber} (${v.paymentMethod === 'cash' ? 'نقداً' : 'تحويل'})`,
        debit: 0,
        credit: v.amount,
        balance: running,
      });
    });

    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const statementRows = getStatementRows();

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

        {/* Grocery Switcher for Testing/Portal */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">تبديل حساب البقالة:</span>
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
      </div>

      {/* Grocery Financial Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Balance Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">الرصيد الحالي المستحق عليك</span>
          <div className="text-2xl font-black font-mono text-[#0c2461] tabular-nums">
            {selectedGrocery.balance.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-600">ر.س</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            الحد الائتماني المعتمد: {selectedGrocery.creditLimit.toLocaleString()} ر.س
          </div>
        </div>

        {/* Today's Order Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">فاتورة تسليم اليوم الصباحية</span>
          <div className="text-2xl font-black font-mono text-[#006266] tabular-nums">
            {todayTotalCost.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-600">ر.س</span>
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
              نسبة الائتمان: {Math.min(100, Math.round((selectedGrocery.balance / selectedGrocery.creditLimit) * 100))}%
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
                    grocery: selectedGrocery,
                    sheet: todaySheet,
                  });
                } else {
                  onOpenPrintModal('statement', {
                    grocery: selectedGrocery,
                    statementRows,
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
              <span>
                تاريخ الكشف: <span className="font-mono font-bold text-slate-800">{todaySheet?.date}</span> ({todaySheet?.dayName})
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
                      const lineTotal = q * r.salePrice;

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
                            {r.salePrice.toLocaleString()} ر.س
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#0c2461]">
                            {lineTotal.toLocaleString()} ر.س
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
                        {todayTotalCost.toLocaleString()} ر.س
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
                  {statementRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="p-2.5 font-mono text-slate-600">{row.date}</td>
                      <td className="p-2.5 font-medium text-slate-900">{row.description}</td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-slate-800">
                        {row.debit > 0 ? `${row.debit.toLocaleString()} ر.س` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono tabular-nums text-[#009432] font-bold">
                        {row.credit > 0 ? `${row.credit.toLocaleString()} ر.س` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#0c2461] bg-slate-100/70">
                        {row.balance.toLocaleString()} ر.س
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
