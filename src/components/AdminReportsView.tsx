import React, { useState } from 'react';
import { DailySheet, SystemSettings, Grocery } from '../types';
import {
  Calendar,
  Edit3,
  Printer,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Package,
  Layers,
} from 'lucide-react';

interface AdminReportsViewProps {
  dailySheets: DailySheet[];
  groceries: Grocery[];
  settings: SystemSettings;
  onEditDayComprehensive: (sheet: DailySheet) => void;
  onOpenPrintModal: (type: 'daily_invoice', sheet: DailySheet) => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  dailySheets,
  groceries,
  settings,
  onEditDayComprehensive,
  onOpenPrintModal,
}) => {
  // Sort sheets descending by date
  const sortedSheets = [...dailySheets].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const [selectedDate, setSelectedDate] = useState<string>(sortedSheets[0]?.date || '');
  const [filterQuery, setFilterQuery] = useState<string>('');

  const currentSheet =
    dailySheets.find((s) => s.date === selectedDate) || sortedSheets[0] || dailySheets[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1e3799]/10 text-[#1e3799] flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">تقارير الأيام والتعديل الشامل للمدير</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مراجعة سجلات الأيام السابقة مع ميزة التعديل الشامل لليومية السابقة والاحتفاظ بتاريخها الأصلي.
            </p>
          </div>
        </div>

        {currentSheet && (
          <div className="flex items-center gap-3">
            {/* The CRITICAL required feature: Comprehensive Day Edit button */}
            <button
              onClick={() => onEditDayComprehensive(currentSheet)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              title="فتح هذا اليوم في شاشة الكشف اليومي للتعديل مع الاحتفاظ بنفس التاريخ القديم"
            >
              <Edit3 className="w-4 h-4 text-[#f6b93b]" />
              <span>تعديل شامل لليوم ({currentSheet.dayName})</span>
            </button>

            <button
              onClick={() => onOpenPrintModal('daily_invoice', currentSheet)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة كشف اليوم</span>
            </button>
          </div>
        )}
      </div>

      {/* Week Day Cards Row (Scrollable or Grid) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600">اختر اليوم من الكروت السريعة:</span>
          <span className="text-xs text-slate-400">إجمالي الأيام المسجلة: {dailySheets.length}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {sortedSheets.map((sheet) => {
            const isSelected = sheet.date === currentSheet?.date;
            return (
              <button
                key={sheet.id}
                onClick={() => setSelectedDate(sheet.date)}
                className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#0c2461] text-white border-[#0c2461] shadow-md ring-2 ring-[#f6b93b]/50'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-bold ${
                      isSelected ? 'text-[#f6b93b]' : 'text-[#0c2461]'
                    }`}
                  >
                    {sheet.dayName}
                  </span>
                  {sheet.status === 'settled' ? (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-[#009432]'}`}
                    />
                  ) : (
                    <Clock
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`}
                    />
                  )}
                </div>
                <div
                  className={`text-xs font-mono mb-2 tabular-nums ${
                    isSelected ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {sheet.date}
                </div>
                <div className="border-t border-slate-200/20 pt-1.5 flex items-center justify-between text-xs font-mono">
                  <span className={isSelected ? 'text-slate-300 text-[10px]' : 'text-slate-400 text-[10px]'}>
                    المبيعات:
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isSelected ? 'text-white' : 'text-[#0c2461]'
                    }`}
                  >
                    {sheet.totalSale.toLocaleString()} ر.س
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Deep Dive Panel */}
      {currentSheet && (
        <div className="space-y-4">
          {/* Day Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block mb-1">إجمالي مشتريات اليوم</span>
              <span className="text-2xl font-bold font-mono text-[#0c2461] tabular-nums">
                {currentSheet.totalCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block mb-1">إجمالي توزيع البقالات</span>
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {currentSheet.totalSale.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block mb-1">هامش الربح والعمولة</span>
              <span className="text-2xl font-bold font-mono text-[#009432] tabular-nums">
                +{currentSheet.totalProfit.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">ر.س</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block mb-1">حالة الإقفال والتاريخ</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-bold text-slate-800">
                  {currentSheet.status === 'settled' ? 'مقفل ومعتمد' : 'مفتوح للمراجعة'}
                </span>
                <span className="text-xs text-slate-400 font-mono">({currentSheet.rows.length} سطر)</span>
              </div>
            </div>
          </div>

          {/* Details Table of that Day */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0c2461]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  تفاصيل أصناف كشف {currentSheet.dayName} ({currentSheet.date})
                </h3>
              </div>

              {/* Search filter for rows */}
              <input
                type="text"
                placeholder="بحث عن صنف أو مورد..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[850px]">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 text-center w-12 font-bold">#</th>
                    <th className="p-3 font-bold">الصنف</th>
                    <th className="p-3 font-bold">المورد</th>
                    <th className="p-3 text-center font-bold">إجمالي الكمية</th>
                    <th className="p-3 text-center font-bold">سعر الشراء</th>
                    <th className="p-3 text-center font-bold">إجمالي الشراء</th>
                    <th className="p-3 text-center font-bold">سعر البيع</th>
                    <th className="p-3 text-center font-bold">إجمالي المبيعات</th>
                    <th className="p-3 text-center font-bold">الربح</th>
                    <th className="p-3 text-center font-bold">حالة الشراء</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSheet.rows
                    .filter(
                      (r) =>
                        r.itemName.toLowerCase().includes(filterQuery.toLowerCase()) ||
                        r.supplierName.toLowerCase().includes(filterQuery.toLowerCase())
                    )
                    .map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                        }`}
                      >
                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {row.itemName}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">({row.unit})</span>
                        </td>
                        <td className="p-2.5 text-slate-700">{row.supplierName}</td>
                        <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#006266]">
                          {row.totalQuantity}
                        </td>
                        <td className="p-2.5 text-center font-mono tabular-nums text-slate-700">
                          {row.costPrice.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold tabular-nums text-slate-900">
                          {row.totalCost.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 text-center font-mono tabular-nums text-slate-700">
                          {row.salePrice.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#0c2461]">
                          {row.totalSale.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold tabular-nums text-[#009432]">
                          +{row.profit.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              row.status === 'purchased'
                                ? 'bg-[#009432]/10 text-[#009432]'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.status === 'purchased' ? 'تم الشراء ✅' : 'قيد الشراء ⏳'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-[#0c2461] text-xs">
                    <td colSpan={3} className="p-3 text-right">
                      المجموع العام:
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-[#006266] tabular-nums">
                      {currentSheet.rows.reduce((s, r) => s + r.totalQuantity, 0)}
                    </td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center font-mono font-bold text-slate-900 tabular-nums">
                      {currentSheet.totalCost.toLocaleString()} ر.س
                    </td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center font-mono font-bold text-[#0c2461] tabular-nums bg-[#f6b93b]/20">
                      {currentSheet.totalSale.toLocaleString()} ر.س
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-[#009432] tabular-nums">
                      +{currentSheet.totalProfit.toLocaleString()} ر.س
                    </td>
                    <td className="p-2 text-center text-slate-500">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
