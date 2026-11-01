import React, { useState, useMemo } from 'react';
import { DailySheet, SystemSettings, Grocery, Supplier } from '../types';
import { extractTime12 } from '../services/storage';
import {
  Calendar,
  Edit3,
  Printer,
  TrendingUp,
  CheckCircle2,
  Clock,
  Filter,
  Package,
  X,
  FileText,
  Store,
  Truck,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface AdminReportsViewProps {
  dailySheets: DailySheet[];
  groceries: Grocery[];
  suppliers?: Supplier[];
  settings: SystemSettings;
  onEditDayComprehensive: (sheet: DailySheet) => void;
  onOpenPrintModal: (type: 'daily_invoice', sheet: DailySheet) => void;
}

type PeriodPreset = 'all' | 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  dailySheets,
  groceries,
  suppliers = [],
  settings,
  onEditDayComprehensive,
  onOpenPrintModal,
}) => {
  // Sort sheets descending by date (preserve all settled sheets with data, and never let an empty open sheet shadow a settled sheet)
  const sortedSheets = useMemo(() => {
    const settledWithData = dailySheets.filter(
      (s) => s.status === 'settled' && ((Number(s.totalCost) || 0) > 0 || s.rows.some((r) => (Number(r.totalQuantity) || 0) > 0))
    );
    const settledDates = new Set(settledWithData.map((s) => s.date));

    const openOrDraftByDate = new Map<string, DailySheet>();
    for (const s of dailySheets) {
      if (settledDates.has(s.date)) continue;
      const existing = openOrDraftByDate.get(s.date);
      if (!existing || (Number(s.totalCost) || 0) > (Number(existing.totalCost) || 0)) {
        openOrDraftByDate.set(s.date, s);
      }
    }

    const combined = [...settledWithData, ...Array.from(openOrDraftByDate.values())];
    if (combined.length === 0) return [...dailySheets].sort((a, b) => b.date.localeCompare(a.date));
    return combined.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  }, [dailySheets]);

  // Current selected sheet (by ID or date) for detailed single-day inspection
  const [selectedDate, setSelectedDate] = useState<string>(sortedSheets[0]?.id || sortedSheets[0]?.date || '');
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Search single day by date
  const [searchDayDate, setSearchDayDate] = useState<string>('');
  const [searchDayNotice, setSearchDayNotice] = useState<string>('');

  const handleSearchDay = () => {
    if (!searchDayDate) {
      setSearchDayNotice('يرجى اختيار تاريخ للبحث');
      return;
    }
    const found =
      sortedSheets.find((s) => s.date === searchDayDate) ||
      dailySheets.find((s) => s.date === searchDayDate && s.status === 'settled') ||
      dailySheets.find((s) => s.date === searchDayDate);
    if (found) {
      setSelectedDate(found.id);
      setSearchDayNotice(`✅ تم إظهار كشف ${found.dayName} (${found.date}) بنجاح`);
    } else {
      setSearchDayNotice(`⚠️ لا يوجد كشف مسجل بتاريخ ${searchDayDate}`);
    }
  };

  // Period filtering state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal popup for period report
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [modalActiveTab, setModalActiveTab] = useState<'groceries' | 'days' | 'suppliers' | 'items'>('groceries');

  // Handle preset selection
  const handleApplyPreset = (preset: PeriodPreset, autoOpenModal = false) => {
    setPeriodPreset(preset);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const now = new Date();
      const latestSheetDate = sortedSheets[0]?.date ? new Date(sortedSheets[0].date + 'T12:00:00') : now;
      const refDate = latestSheetDate;

      const formatIso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

      if (preset === 'today') {
        const todayStr = formatIso(refDate);
        setStartDate(todayStr);
        setEndDate(todayStr);
      } else if (preset === 'yesterday') {
        const y = new Date(refDate);
        y.setDate(y.getDate() - 1);
        const yStr = formatIso(y);
        setStartDate(yStr);
        setEndDate(yStr);
      } else if (preset === 'last7') {
        const past7 = new Date(refDate);
        past7.setDate(past7.getDate() - 6);
        setStartDate(formatIso(past7));
        setEndDate(formatIso(refDate));
      } else if (preset === 'thisMonth') {
        const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        setStartDate(formatIso(firstDay));
        setEndDate(formatIso(refDate));
      } else if (preset === 'lastMonth') {
        const past30 = new Date(refDate);
        past30.setDate(past30.getDate() - 30);
        setStartDate(formatIso(past30));
        setEndDate(formatIso(refDate));
      }
    }

    if (autoOpenModal) {
      setIsPeriodModalOpen(true);
    }
  };

  // Filter sheets based on date range
  const filteredPeriodSheets = useMemo(() => {
    if (!startDate && !endDate) return sortedSheets;

    return sortedSheets.filter((s) => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    });
  }, [sortedSheets, startDate, endDate]);

  // Aggregate metrics across the selected period
  const periodMetrics = useMemo(() => {
    let totalSale = 0;
    let totalCost = 0;
    let totalUnits = 0;
    const groceryMap: Record<string, { qty: number; amount: number }> = {};
    const supplierMap: Record<string, { qty: number; cost: number; itemsCount: number }> = {};
    const itemMap: Record<string, { name: string; unit: string; totalQty: number; totalSale: number; totalCost: number }> = {};

    groceries.forEach((g) => {
      groceryMap[g.id] = { qty: 0, amount: 0 };
    });

    filteredPeriodSheets.forEach((sheet) => {
      totalSale += sheet.totalSale;
      totalCost += sheet.totalCost;

      sheet.rows.forEach((row) => {
        totalUnits += row.totalQuantity;

        // Grocery breakdown
        groceries.forEach((g) => {
          const q = Number(row.quantities[g.id]) || 0;
          if (q > 0) {
            if (!groceryMap[g.id]) groceryMap[g.id] = { qty: 0, amount: 0 };
            groceryMap[g.id].qty += q;
            groceryMap[g.id].amount += q * row.costPrice;
          }
        });

        // Supplier breakdown
        const sName = row.supplierName || 'غير محدد';
        if (!supplierMap[sName]) {
          supplierMap[sName] = { qty: 0, cost: 0, itemsCount: 0 };
        }
        supplierMap[sName].qty += row.totalQuantity;
        supplierMap[sName].cost += row.totalCost;
        supplierMap[sName].itemsCount += 1;

        // Top items breakdown
        const key = row.itemName;
        if (!itemMap[key]) {
          itemMap[key] = {
            name: row.itemName,
            unit: row.unit,
            totalQty: 0,
            totalSale: 0,
            totalCost: 0,
          };
        }
        itemMap[key].totalQty += row.totalQuantity;
        itemMap[key].totalSale += row.totalSale;
        itemMap[key].totalCost += row.totalCost;
      });
    });

    const totalProfit = totalSale - totalCost;
    const margin = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;
    const daysCount = filteredPeriodSheets.length;
    const avgDailySale = daysCount > 0 ? Math.round(totalSale / daysCount) : 0;

    const groceryBreakdown = groceries.map((g) => {
      const stats = groceryMap[g.id] || { qty: 0, amount: 0 };
      const share = totalSale > 0 ? (stats.amount / totalSale) * 100 : 0;
      return {
        grocery: g,
        qty: Math.round(stats.qty * 100) / 100,
        amount: Math.round(stats.amount * 100) / 100,
        share: Math.round(share * 10) / 10,
      };
    }).sort((a, b) => b.amount - a.amount);

    const supplierBreakdown = Object.entries(supplierMap).map(([name, data]) => {
      const share = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
      return {
        supplierName: name,
        qty: Math.round(data.qty * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        itemsCount: data.itemsCount,
        share: Math.round(share * 10) / 10,
      };
    }).sort((a, b) => b.cost - a.cost);

    const topItems = Object.values(itemMap).sort((a, b) => b.totalSale - a.totalSale);

    return {
      daysCount,
      totalSale,
      totalCost,
      totalProfit,
      margin: Math.round(margin * 10) / 10,
      totalUnits: Math.round(totalUnits * 100) / 100,
      avgDailySale,
      groceryBreakdown,
      supplierBreakdown,
      topItems,
    };
  }, [filteredPeriodSheets, groceries]);

  // Selected single sheet (prefer exact ID match or settled sheet from sortedSheets so an empty open sheet never shadows a settled day)
  const currentSheet =
    sortedSheets.find((s) => s.id === selectedDate || s.date === selectedDate) ||
    dailySheets.find((s) => s.id === selectedDate) ||
    dailySheets.find((s) => s.date === selectedDate && s.status === 'settled') ||
    dailySheets.find((s) => s.date === selectedDate) ||
    filteredPeriodSheets[0] ||
    sortedSheets[0] ||
    dailySheets[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0c2461]/10 text-[#0c2461] flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-[#0c2461]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">تقارير المبيعات والأرباح والتعديل الشامل</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد فترات مخصصة، تقارير سريعة بنوافذ منبثقة، وتعديل شامل لأي يوم سابق مع حفظ التاريخ.
            </p>
          </div>
        </div>

        {/* Action Buttons: Open Period Report Modal & Day Comprehensive Edit */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPeriodModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#006266] to-[#0c2461] hover:from-[#004e51] hover:to-[#081b48] rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
            title="فتح نافذة منبثقة تعرض تقرير تحليلي شامل للفترة المحددة"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>عرض تقرير الفترة المنبثق ({periodMetrics.daysCount} أيام)</span>
          </button>

          {currentSheet && (
            <button
              onClick={() => onEditDayComprehensive(currentSheet)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="تعديل هذا اليوم في شاشة الكشف اليومي مع الاحتفاظ بنفس التاريخ"
            >
              <Edit3 className="w-4 h-4 text-[#f6b93b]" />
              <span>تعديل اليوم/الكشف ({currentSheet.dayName})</span>
            </button>
          )}
        </div>
      </div>

      {/* Specific Day Search Bar - Requirement 4 */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-100 rounded-2xl p-4 border border-purple-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs sm:text-sm font-black text-purple-950 flex items-center gap-1.5">
            <span>📅</span>
            <span>ابحث عن تقرير يوم محدد بالتاريخ:</span>
          </span>
          <input
            type="date"
            value={searchDayDate}
            onChange={(e) => setSearchDayDate(e.target.value)}
            className="bg-white border-2 border-purple-300 focus:border-purple-600 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none shadow-xs"
          />
          <button
            type="button"
            onClick={handleSearchDay}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
          >
            <span>🔍 إظهار اليوم وتقريره</span>
          </button>
        </div>

        {searchDayNotice && (
          <span className="text-xs font-bold text-purple-800 bg-purple-200/60 px-3 py-1 rounded-lg">
            {searchDayNotice}
          </span>
        )}
      </div>

      {/* Period Filter Panel: Quick Filters & Date Pickers */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#006266]" />
            <span>فلترة الفترة الزمنية للتقارير:</span>
          </div>

          {/* Quick Preset Buttons (User requested: تقرير اخر شهر، تقرير اخر يوم، بنوافذ منبثقة) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPreset('today', true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'today'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="عرض تقرير اليوم / آخر يوم بنفذة منبثقة"
            >
              📄 تقرير آخر يوم
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'yesterday'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              تقرير أمس
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('last7')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'last7'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              آخر 7 أيام
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('thisMonth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'thisMonth'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              هذا الشهر
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('lastMonth', true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'lastMonth'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              }`}
              title="عرض تقرير آخر شهر بنفذة منبثقة"
            >
              📅 تقرير آخر شهر
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === 'all'
                  ? 'bg-[#0c2461] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              كل الفترات
            </button>
          </div>
        </div>

        {/* Date From - To Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label className="font-bold text-slate-700">من تاريخ:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#006266]"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label className="font-bold text-slate-700">إلى تاريخ:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset('custom');
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#006266]"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
              >
                إلغاء التحديد
              </button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-500">
            الأيام المشمولة في الفترة: <strong className="text-[#006266] font-mono text-sm">{filteredPeriodSheets.length}</strong> يوم
          </div>
        </div>

        {/* Period Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">إجمالي مبيعات الفترة</span>
            <div className="text-lg sm:text-xl font-black font-mono text-[#0c2461] tabular-nums">
              {periodMetrics.totalSale.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.ي</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">إجمالي مشتريات الفترة</span>
            <div className="text-lg sm:text-xl font-black font-mono text-slate-800 tabular-nums">
              {periodMetrics.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.ي</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-xs text-emerald-800 font-bold block mb-1">تسعير البقالات</span>
            <div className="text-lg sm:text-xl font-black font-mono text-[#006266] tabular-nums">
              بسعر الشراء المباشر
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
              لا توجد هوامش ربح (نفس المالك)
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">إجمالي الكميات الموزعة</span>
            <div className="text-lg sm:text-xl font-black font-mono text-[#006266] tabular-nums">
              {periodMetrics.totalUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">وحدة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week Day Cards Row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">
            سجل أيام الفترة (انقر على اليوم لعرض تفاصيله بالأسفل):
          </span>
          <span className="text-xs text-slate-400">
            معروض {filteredPeriodSheets.length} من {dailySheets.length} يوم
          </span>
        </div>

        {filteredPeriodSheets.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-sm">
            لا توجد كشوفات مسجلة ضمن الفترة المحددة. اختر فترة زمنية أخرى.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {filteredPeriodSheets.map((sheet) => {
              const isSelected = sheet.id === currentSheet?.id;
              return (
                <button
                  key={sheet.id}
                  onClick={() => setSelectedDate(sheet.id)}
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
                    className={`text-xs font-mono mb-2 tabular-nums inline-flex items-baseline gap-1.5 whitespace-nowrap ${
                      isSelected ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    <span>{sheet.date}</span>
                    {extractTime12(sheet.updatedAt, sheet.createdAt) && (
                      <span
                        className={`text-[10px] font-normal ${
                          isSelected ? 'text-slate-300/80' : 'text-slate-400'
                        }`}
                      >
                        {extractTime12(sheet.updatedAt, sheet.createdAt)}
                      </span>
                    )}
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
                      {sheet.totalSale.toLocaleString()} ر.ي
                    </span>
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDayComprehensive(sheet);
                    }}
                    className={`mt-2 py-1 px-2 rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-1 transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-700 hover:text-white'
                    }`}
                    title="تعديل كشف هذا اليوم في شاشة الكشف اليومي"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل هذا الكشف</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Day Deep Dive Panel */}
      {currentSheet && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                {currentSheet.dayName.substring(0, 2)}
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base inline-flex items-baseline gap-1.5 flex-wrap">
                  <span>كشف يوم {currentSheet.dayName} ({currentSheet.date})</span>
                  {extractTime12(currentSheet.updatedAt, currentSheet.createdAt) && (
                    <span className="text-[11px] font-mono text-slate-400 font-normal">
                      {extractTime12(currentSheet.updatedAt, currentSheet.createdAt)}
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-500">
                  {currentSheet.rows.length} أصناف مسجلة • مبيعات {currentSheet.totalSale.toLocaleString()} ر.ي
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditDayComprehensive(currentSheet)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-all cursor-pointer shadow-xs"
                title="تعديل هذا اليوم في كشف اليومية مع الاحتفاظ بنفس التاريخ القديم"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                <span>تعديل اليوم/الكشف</span>
              </button>

              <button
                onClick={() => onOpenPrintModal('daily_invoice', currentSheet)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Details Table of that Day */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0c2461]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  أصناف كشف {currentSheet.dayName} ({currentSheet.date})
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
                          {row.costPrice.toLocaleString()} ر.ي
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold tabular-nums text-slate-900">
                          {row.totalCost.toLocaleString()} ر.ي
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
                      {currentSheet.totalCost.toLocaleString()} ر.ي
                    </td>
                    <td className="p-2 text-center text-slate-500">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          THE PERIOD REPORT POPUP MODAL (النافذة المنبثقة لتقرير الفترة الاحترافي)
          ========================================================================= */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full my-auto overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0c2461] to-[#006266] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center font-black">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black">
                    تقرير الأداء والتوزيع المالي للفترة
                  </h2>
                  <p className="text-xs text-slate-200 mt-0.5">
                    {startDate && endDate
                      ? `من تاريخ ${startDate} إلى ${endDate} (${periodMetrics.daysCount} أيام تشغيل)`
                      : `تقرير شامل لكافة الفترات المسجلة (${periodMetrics.daysCount} يوم)`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="طباعة التقرير"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة التقرير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Quick KPI Cards */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-1">إجمالي المبيعات للفترة</span>
                <div className="text-xl font-black font-mono text-[#0c2461] tabular-nums">
                  {periodMetrics.totalSale.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  متوسط يومي: {periodMetrics.avgDailySale.toLocaleString()} ر.ي
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-1">تكلفة المشتريات للفترة</span>
                <div className="text-xl font-black font-mono text-slate-800 tabular-nums">
                  {periodMetrics.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.ي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  من السوق المركزي والموردين
                </div>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
                <span className="text-[11px] text-emerald-800 font-bold block mb-1">تسعير البقالات</span>
                <div className="text-lg font-black font-mono text-[#006266] tabular-nums">
                  بسعر التكلفة المباشر
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  لا توجد هوامش ربحية
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block mb-1">إجمالي الوحدات الموزعة</span>
                <div className="text-xl font-black font-mono text-[#006266] tabular-nums">
                  {periodMetrics.totalUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">وحدة</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  عبر {groceries.length} بقالات
                </div>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-thin">
              <button
                type="button"
                onClick={() => setModalActiveTab('groceries')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  modalActiveTab === 'groceries'
                    ? 'border-[#006266] text-[#006266]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>توزيع البقالات والمبيعات ({groceries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('days')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  modalActiveTab === 'days'
                    ? 'border-[#006266] text-[#006266]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>سجل الأيام التفصيلي ({periodMetrics.daysCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('suppliers')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  modalActiveTab === 'suppliers'
                    ? 'border-[#006266] text-[#006266]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>مشتريات الموردين ({periodMetrics.supplierBreakdown.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('items')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  modalActiveTab === 'items'
                    ? 'border-[#006266] text-[#006266]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>أكثر الأصناف طلباً ومبيعاً ({periodMetrics.topItems.length})</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {/* TAB 1: GROCERY BREAKDOWN */}
              {modalActiveTab === 'groceries' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>إحصائية توزيع ومبيعات كل بقالة خلال الفترة المحددة:</span>
                    <span className="font-mono">إجمالي المبيعات: {periodMetrics.totalSale.toLocaleString()} ر.ي</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#0c2461] text-white">
                          <th className="p-3 w-12 text-center font-bold">#</th>
                          <th className="p-3 font-bold">رمز البقالة</th>
                          <th className="p-3 font-bold">اسم البقالة</th>
                          <th className="p-3 text-center font-bold">إجمالي الكميات</th>
                          <th className="p-3 text-center font-bold">إجمالي المبيعات</th>
                          <th className="p-3 text-center font-bold">نسبة من الإجمالي</th>
                          <th className="p-3 text-center font-bold">مؤشر المساهمة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodMetrics.groceryBreakdown.map((item, idx) => (
                          <tr
                            key={item.grocery.id}
                            className={`border-b border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                            }`}
                          >
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-mono font-black text-[#0c2461]">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                                {item.grocery.code}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-900">{item.grocery.name}</td>
                            <td className="p-3 text-center font-mono font-bold text-[#006266] tabular-nums">
                              {item.qty.toLocaleString()} وحدة
                            </td>
                            <td className="p-3 text-center font-mono font-black text-[#0c2461] tabular-nums bg-amber-50/50">
                              {item.amount.toLocaleString()} ر.ي
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700 tabular-nums">
                              %{item.share}
                            </td>
                            <td className="p-3">
                              <div className="w-24 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-[#006266] h-full rounded-full"
                                  style={{ width: `${Math.min(100, item.share * 2)}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-[#0c2461] text-xs">
                          <td colSpan={3} className="p-3 text-right">المجموع العام:</td>
                          <td className="p-3 text-center font-mono font-bold text-[#006266] tabular-nums">
                            {periodMetrics.totalUnits.toLocaleString()} وحدة
                          </td>
                          <td className="p-3 text-center font-mono font-black text-[#0c2461] tabular-nums bg-amber-100/60">
                            {periodMetrics.totalSale.toLocaleString()} ر.ي
                          </td>
                          <td className="p-3 text-center font-mono font-bold">100%</td>
                          <td className="p-3 text-center">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: DAYS BREAKDOWN */}
              {modalActiveTab === 'days' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>قائمة الأيام المشمولة ضمن الفترة:</span>
                    <span className="font-mono">{periodMetrics.daysCount} أيام</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#0c2461] text-white">
                          <th className="p-3 w-12 text-center font-bold">#</th>
                          <th className="p-3 font-bold">اليوم والتاريخ</th>
                          <th className="p-3 text-center font-bold">عدد الأصناف</th>
                          <th className="p-3 text-center font-bold">إجمالي تكلفة المشتريات</th>
                          <th className="p-3 text-center font-bold">الحالة</th>
                          <th className="p-3 text-center font-bold w-24">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPeriodSheets.map((sheet, idx) => (
                          <tr
                            key={sheet.id}
                            className={`border-b border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                            }`}
                          >
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                              <span className="inline-flex items-baseline gap-1.5">
                                <span>{sheet.dayName}</span>
                                <span className="text-xs font-mono text-slate-500 font-normal">({sheet.date})</span>
                                {extractTime12(sheet.updatedAt, sheet.createdAt) && (
                                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                                    {extractTime12(sheet.updatedAt, sheet.createdAt)}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-700">
                              {sheet.rows.length} صنف
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-[#006266] tabular-nums">
                              {sheet.totalCost.toLocaleString()} ر.ي
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  sheet.status === 'settled'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sheet.status === 'settled' ? 'مقفل ومعتمد' : 'مفتوح'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsPeriodModalOpen(false);
                                  onEditDayComprehensive(sheet);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap mx-auto"
                                title="تعديل هذا اليوم في شاشة الكشف اليومي"
                              >
                                <Edit3 className="w-3 h-3 text-amber-300" />
                                <span>تعديل</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SUPPLIERS BREAKDOWN */}
              {modalActiveTab === 'suppliers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>مشتريات السوق المركزي والموردين في الفترة:</span>
                    <span className="font-mono">إجمالي الشراء: {periodMetrics.totalCost.toLocaleString()} ر.ي</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#0c2461] text-white">
                          <th className="p-3 w-12 text-center font-bold">#</th>
                          <th className="p-3 font-bold">اسم المورد</th>
                          <th className="p-3 text-center font-bold">عدد بنود التوريد</th>
                          <th className="p-3 text-center font-bold">إجمالي الكميات</th>
                          <th className="p-3 text-center font-bold">إجمالي الشراء</th>
                          <th className="p-3 text-center font-bold">نسبة من المشتريات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodMetrics.supplierBreakdown.map((item, idx) => (
                          <tr
                            key={item.supplierName}
                            className={`border-b border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                            }`}
                          >
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{item.supplierName}</td>
                            <td className="p-3 text-center font-mono text-slate-700">
                              {item.itemsCount} بند
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-[#006266] tabular-nums">
                              {item.qty.toLocaleString()} وحدة
                            </td>
                            <td className="p-3 text-center font-mono font-black text-slate-900 tabular-nums">
                              {item.cost.toLocaleString()} ر.ي
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-700 tabular-nums">
                              %{item.share}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TOP ITEMS */}
              {modalActiveTab === 'items' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>أعلى الأصناف طلباً ومبيعاً خلال الفترة المحددة:</span>
                    <span className="font-mono">{periodMetrics.topItems.length} صنف</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#0c2461] text-white">
                          <th className="p-3 w-12 text-center font-bold">#</th>
                          <th className="p-3 font-bold">الصنف</th>
                          <th className="p-3 text-center font-bold">الوحدة</th>
                          <th className="p-3 text-center font-bold">إجمالي الكميات</th>
                          <th className="p-3 text-center font-bold">تكلفة الشراء الإجمالية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodMetrics.topItems.slice(0, 25).map((it, idx) => (
                          <tr
                            key={it.name}
                            className={`border-b border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                            }`}
                          >
                            <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{it.name}</td>
                            <td className="p-3 text-center text-slate-500 text-xs">{it.unit}</td>
                            <td className="p-3 text-center font-mono font-bold text-[#006266] tabular-nums">
                              {it.totalQty.toLocaleString()}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800 tabular-nums">
                              {it.totalCost.toLocaleString()} ر.ي
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                نظام إدارة سوق الخضار والفواكه المركزي • تقرير تدقيق معتمد
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة رسمية للتقرير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
