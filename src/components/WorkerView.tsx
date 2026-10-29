import React, { useState } from 'react';
import {
  DailySheet,
  DailyOrderRow,
  Grocery,
  Supplier,
  VegetableItem,
  SystemSettings,
} from '../types';
import {
  Save,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Truck,
  ArrowRightLeft,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WorkerViewProps {
  sheet: DailySheet;
  groceries: Grocery[];
  suppliers: Supplier[];
  items: VegetableItem[];
  settings: SystemSettings;
  currentRole: 'worker' | 'admin' | 'grocery';
  onUpdateSheet: (updated: DailySheet) => void;
  onOpenAddItem: () => void;
  onOpenAddSupplier: () => void;
  onOpenPrintModal: (type: 'daily_invoice' | 'morning_sort') => void;
  onAddAuditLog: (action: string, target: string, oldVal?: string, newVal?: string, details?: string) => void;
}

export const WorkerView: React.FC<WorkerViewProps> = ({
  sheet,
  groceries,
  suppliers,
  items,
  settings,
  currentRole,
  onUpdateSheet,
  onOpenAddItem,
  onOpenAddSupplier,
  onOpenPrintModal,
  onAddAuditLog,
}) => {
  // Tabs: 'night_orders' (طلبات الليل والشراء) vs 'morning_sort' (فرز وتوزيع الصباح)
  const [activeTab, setActiveTab] = useState<'night_orders' | 'morning_sort'>('night_orders');
  // Selected grocery filter for morning sort view
  const [selectedSortGrocery, setSelectedSortGrocery] = useState<string>('all');
  // Active row being quick-edited with fractions pad
  const [activeCell, setActiveCell] = useState<{ rowId: string; groceryId: string } | null>(null);

  const isLocked = settings.permissions.lockDailySheetAfterSave && sheet.nightOrdersSaved && currentRole === 'worker';

  // Quick fraction adder helper
  const handleFractionAdd = (rowId: string, groceryId: string, delta: number, isAbsolute = false) => {
    if (isLocked) return;
    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const current = row.quantities[groceryId] || 0;
      const nextVal = isAbsolute ? delta : Math.max(0, Math.round((current + delta) * 100) / 100);

      const newQuantities = { ...row.quantities, [groceryId]: nextVal };
      const totalQty = Object.values(newQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
      const totalCost = totalQty * row.costPrice;
      const totalSale = totalQty * row.salePrice;

      return {
        ...row,
        quantities: newQuantities,
        totalQuantity: totalQty,
        totalCost,
        totalSale,
        profit: totalSale - totalCost,
      };
    });

    recalculateAndSave(updatedRows);
  };

  // Direct quantity input change
  const handleQuantityChange = (rowId: string, groceryId: string, val: string) => {
    if (isLocked) return;
    const num = parseFloat(val) || 0;
    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const newQuantities = { ...row.quantities, [groceryId]: num };
      const totalQty = Object.values(newQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
      const totalCost = totalQty * row.costPrice;
      const totalSale = totalQty * row.salePrice;

      return {
        ...row,
        quantities: newQuantities,
        totalQuantity: totalQty,
        totalCost,
        totalSale,
        profit: totalSale - totalCost,
      };
    });

    recalculateAndSave(updatedRows);
  };

  // Supplier change
  const handleSupplierChange = (rowId: string, newSupplierId: string) => {
    const s = suppliers.find((item) => item.id === newSupplierId);
    if (!s) return;

    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        supplierId: s.id,
        supplierName: s.name,
      };
    });

    onAddAuditLog('تغيير مورد الصنف', sheet.rows.find((r) => r.id === rowId)?.itemName || '', '', s.name);
    recalculateAndSave(updatedRows);
  };

  // Price changes (if permitted)
  const handlePriceChange = (rowId: string, field: 'costPrice' | 'salePrice', val: number) => {
    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const costPrice = field === 'costPrice' ? Math.max(0, val) : row.costPrice;
      const salePrice = field === 'salePrice' ? Math.max(0, val) : row.salePrice;
      const totalCost = row.totalQuantity * costPrice;
      const totalSale = row.totalQuantity * salePrice;

      return {
        ...row,
        costPrice,
        salePrice,
        totalCost,
        totalSale,
        profit: totalSale - totalCost,
      };
    });

    recalculateAndSave(updatedRows);
  };

  // Purchase Status Toggle
  const togglePurchaseStatus = (rowId: string) => {
    const row = sheet.rows.find((r) => r.id === rowId);
    if (!row) return;

    const nextStatus: 'pending' | 'purchased' = row.status === 'purchased' ? 'pending' : 'purchased';
    const updatedRows: DailyOrderRow[] = sheet.rows.map((r) =>
      r.id === rowId ? { ...r, status: nextStatus } : r
    );

    onAddAuditLog(
      'تحديث حالة الشراء',
      `${row.itemName} (${row.supplierName})`,
      row.status === 'purchased' ? 'تم الشراء ✅' : 'قيد الشراء ⏳',
      nextStatus === 'purchased' ? 'تم الشراء ✅' : 'قيد الشراء ⏳'
    );

    recalculateAndSave(updatedRows);
  };

  // Duplicate Line (+) to buy from another supplier or different price
  const handleDuplicateRow = (rowId: string) => {
    const target = sheet.rows.find((r) => r.id === rowId);
    if (!target) return;

    const duplicated: DailyOrderRow = {
      ...target,
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      supplierName: `${target.supplierName} (مورد إضافي)`,
      status: 'pending',
      // Start with empty quantities or split
      quantities: groceries.reduce((acc, g) => {
        acc[g.id] = 0;
        return acc;
      }, {} as Record<string, number>),
      totalQuantity: 0,
      totalCost: 0,
      totalSale: 0,
      profit: 0,
    };

    const index = sheet.rows.findIndex((r) => r.id === rowId);
    const newRows = [...sheet.rows];
    newRows.splice(index + 1, 0, duplicated);

    onAddAuditLog('تكرار سطر صنف لمورد آخر', target.itemName, '', 'سطر جديد للشراء بسعر مختلف');
    recalculateAndSave(newRows);
  };

  // Remove Row
  const handleDeleteRow = (rowId: string) => {
    const target = sheet.rows.find((r) => r.id === rowId);
    if (!target) return;

    if (window.confirm(`هل أنت متأكد من حذف سطر (${target.itemName})؟`)) {
      const newRows = sheet.rows.filter((r) => r.id !== rowId);
      onAddAuditLog('حذف سطر صنف', target.itemName, `${target.totalQuantity} ${target.unit}`, 'محذوف');
      recalculateAndSave(newRows);
    }
  };

  // Recalculate sheet totals and dispatch update
  const recalculateAndSave = (newRows: DailyOrderRow[]) => {
    const totalCost = newRows.reduce((sum, r) => sum + r.totalCost, 0);
    const totalSale = newRows.reduce((sum, r) => sum + r.totalSale, 0);
    const totalProfit = totalSale - totalCost;

    onUpdateSheet({
      ...sheet,
      rows: newRows,
      totalCost,
      totalSale,
      totalProfit,
      updatedAt: new Date().toLocaleTimeString('ar-SA'),
    });
  };

  // Save Night Orders & Auto Generate Morning Sort Sheet
  const handleSaveNightOrders = () => {
    const totalQty = sheet.rows.reduce((sum, r) => sum + r.totalQuantity, 0);

    // Build morning sorted structure
    const updatedRows = sheet.rows.map((row) => {
      const morningSorted = { ...row.morningSorted };
      groceries.forEach((g) => {
        const q = row.quantities[g.id] || 0;
        if (!morningSorted[g.id]) {
          morningSorted[g.id] = { deliveredQty: q, confirmed: false };
        } else {
          morningSorted[g.id].deliveredQty = q;
        }
      });
      return { ...row, morningSorted };
    });

    const updatedSheet: DailySheet = {
      ...sheet,
      rows: updatedRows,
      nightOrdersSaved: true,
      morningSortGenerated: true,
      status: 'saved_night',
      updatedAt: new Date().toLocaleTimeString('ar-SA'),
    };

    onUpdateSheet(updatedSheet);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    onAddAuditLog(
      'حفظ طلبات الليل وتوليد فرز الصباح',
      `كشف ${sheet.dayName} ${sheet.date}`,
      '',
      `تم تثبيت ${sheet.rows.length} صنف بإجمالي ${totalQty} وحدة وتوليد جداول الفرز الصباحي`
    );

    alert('✅ تم حفظ وتثبيت طلبات الليل وتوليد جداول فرز الصباح المستقلة لكل بقالة تلقائياً!');
  };

  // Morning Sort Delivery Toggle
  const toggleDeliveryConfirm = (rowId: string, groceryId: string) => {
    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const currentSort = row.morningSorted?.[groceryId] || {
        deliveredQty: row.quantities[groceryId] || 0,
        confirmed: false,
      };
      const nextSort = {
        ...currentSort,
        confirmed: !currentSort.confirmed,
      };

      return {
        ...row,
        morningSorted: {
          ...row.morningSorted,
          [groceryId]: nextSort,
        },
      };
    });

    recalculateAndSave(updatedRows);
  };

  const totalUnits = sheet.rows.reduce((sum, r) => sum + r.totalQuantity, 0);
  const purchasedRowsCount = sheet.rows.filter((r) => r.status === 'purchased').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Date & Mode Strip */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#006266]/10 text-[#006266] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                كشف اليومية الميداني: {sheet.dayName}
              </h2>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                {sheet.date}
              </span>
              {sheet.nightOrdersSaved ? (
                <span className="text-xs bg-[#009432]/10 text-[#009432] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم اعتماد طلبات الليل
                </span>
              ) : (
                <span className="text-xs bg-[#f6b93b]/20 text-amber-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  مسودة مشتريات جارية
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              إدخال الكميات بالأصناف والبقالات الخمس مع أزرار الكسور السريعة وحسابات الشراء المباشرة.
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation between Night Orders & Morning Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Action Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('night_orders')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'night_orders'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              طلبات الليل والشراء ({sheet.rows.length})
            </button>
            <button
              onClick={() => setActiveTab('morning_sort')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'morning_sort'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فرز الصباح والتسليم
            </button>
          </div>

          {/* Quick Print Button */}
          <button
            onClick={() => onOpenPrintModal(activeTab === 'night_orders' ? 'daily_invoice' : 'morning_sort')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            title="معاينة الطباعة وتصدير PDF"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">طباعة / PDF</span>
          </button>
        </div>
      </div>

      {/* Main KPI Bar for Field Worker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">إجمالي الكميات المطلوبة</span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#006266]">
            {totalUnits.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">وحدة/عبوة</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">حالة الشراء بالسوق</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#009432]">
              {purchasedRowsCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {sheet.rows.length} تم شراؤها</span>
          </div>
        </div>

        {settings.permissions.workerCanViewPurchaseCost && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">تكلفة الشراء التقديرية</span>
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0c2461]">
              {sheet.totalCost.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">ر.س</span>
            </span>
          </div>
        )}

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">إجمالي المبيعات المقدرة</span>
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0c2461] bg-[#f6b93b]/20 px-2 py-0.5 rounded-lg inline-block">
            {sheet.totalSale.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-800">ر.س</span>
          </span>
        </div>
      </div>

      {/* Quick Fractions Helper Bar for Touch / Mobile */}
      {activeTab === 'night_orders' && !isLocked && (
        <div className="bg-[#006266]/5 border border-[#006266]/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-[#006266] font-bold">
            <Sparkles className="w-4 h-4 text-[#f6b93b]" />
            <span>لوحة الكسور السريعة (المس الخانة ثم اضغط):</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '¼', val: 0.25, abs: false },
              { label: '½', val: 0.5, abs: false },
              { label: '¾', val: 0.75, abs: false },
              { label: '1', val: 1.0, abs: true },
              { label: '1.5', val: 1.5, abs: true },
              { label: '2', val: 2.0, abs: true },
              { label: '+1', val: 1.0, abs: false },
              { label: 'مسح (0)', val: 0, abs: true },
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (activeCell) {
                    handleFractionAdd(activeCell.rowId, activeCell.groceryId, btn.val, btn.abs);
                  } else {
                    alert('يرجى أولاً النقر على خانة كمية البقالة لتطبيق الكسر عليها مباشرة');
                  }
                }}
                className="px-2.5 py-1 font-bold text-xs bg-white hover:bg-[#006266] hover:text-white border border-[#006266]/30 text-[#006266] rounded-lg transition-colors shadow-2xs active:scale-95 cursor-pointer tabular-nums"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lock Notice if locked */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>تم قفل كشف اليومية بعد حفظ طلبات الليل لمنع التعديل الميداني غير المصرح به.</span>
          </div>
        </div>
      )}

      {/* TAB 1: NIGHT ORDERS WORKSHEET (الكشف الميداني لطلبات الليل) */}
      {activeTab === 'night_orders' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Action buttons above the table */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Add item button */}
              {(currentRole === 'admin' || settings.permissions.workerCanAddItem) && (
                <button
                  onClick={onOpenAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#006266] hover:bg-[#004e51] rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  + إضافة صنف جديد
                </button>
              )}

              {/* Add supplier button */}
              {(currentRole === 'admin' || settings.permissions.workerCanAddSupplier) && (
                <button
                  onClick={onOpenAddSupplier}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-slate-500" />
                  + مورد جديد
                </button>
              )}
            </div>

            {/* Save Night Orders Button */}
            <button
              onClick={handleSaveNightOrders}
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#009432] hover:bg-[#007b29] rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              حفظ طلبات الليل وتوليد فرز الصباح
            </button>
          </div>

          {/* Table Container with Horizontal Scroll */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[950px]">
              <thead>
                <tr className="bg-[#0c2461] text-white select-none">
                  <th className="p-3 w-10 text-center font-bold">#</th>
                  <th className="p-3 font-bold sticky right-0 bg-[#0c2461] z-10 min-w-[130px]">
                    الصنف (الوحدة)
                  </th>
                  <th className="p-3 font-bold min-w-[170px]">المورد</th>
                  {/* Grocery Columns */}
                  {groceries.map((g) => (
                    <th
                      key={g.id}
                      className="p-3 text-center border-r border-[#1e3799] font-bold min-w-[65px] bg-[#0c2461]/90"
                      title={g.name}
                    >
                      <div className="text-sm font-black text-[#f6b93b]">{g.code}</div>
                      <div className="text-[10px] text-slate-300 font-normal truncate max-w-[60px] mx-auto">
                        {g.name.replace('بقالة', '').replace('سوبرماركت', '')}
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-center font-bold bg-[#1e3799]/80 min-w-[70px]">
                    المجموع
                  </th>
                  {settings.permissions.workerCanViewPurchaseCost && (
                    <th className="p-3 text-center font-bold min-w-[80px]">سعر الشراء</th>
                  )}
                  <th className="p-3 text-center font-bold min-w-[80px]">سعر البيع</th>
                  <th className="p-3 text-center font-bold min-w-[110px]">حالة الشراء</th>
                  <th className="p-3 text-center font-bold w-20">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, index) => {
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-200 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      } ${row.status === 'purchased' ? 'bg-emerald-50/40' : ''}`}
                    >
                      {/* Row Index */}
                      <td className="p-2.5 text-center font-mono text-slate-400 text-xs">
                        {index + 1}
                      </td>

                      {/* Item Name & Unit (Sticky Right for easy horizontal browsing) */}
                      <td className="p-2.5 font-bold text-slate-900 sticky right-0 bg-inherit z-10 shadow-xs border-l border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base text-slate-900">{row.itemName}</span>
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                            {row.unit}
                          </span>
                        </div>
                      </td>

                      {/* Supplier Selection */}
                      <td className="p-2">
                        <select
                          disabled={isLocked}
                          value={row.supplierId}
                          onChange={(e) => handleSupplierChange(row.id, e.target.value)}
                          className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#006266] focus:outline-none truncate"
                        >
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Grocery Quantities (5 columns + dynamic ones) */}
                      {groceries.map((g) => {
                        const qty = row.quantities[g.id] ?? 0;
                        const isFocused =
                          activeCell?.rowId === row.id && activeCell?.groceryId === g.id;

                        return (
                          <td
                            key={g.id}
                            className={`p-1.5 text-center border-r border-slate-100 ${
                              isFocused ? 'bg-[#006266]/10' : ''
                            }`}
                          >
                            <input
                              type="number"
                              step="any"
                              disabled={isLocked}
                              value={qty === 0 ? '' : qty}
                              placeholder="-"
                              onFocus={() => setActiveCell({ rowId: row.id, groceryId: g.id })}
                              onChange={(e) => handleQuantityChange(row.id, g.id, e.target.value)}
                              className={`w-14 text-center py-1 px-1 text-sm font-mono font-bold rounded-lg border tabular-nums transition-all ${
                                qty > 0
                                  ? 'bg-amber-50/80 border-amber-300 text-slate-900'
                                  : 'bg-white border-slate-200 text-slate-400'
                              } focus:ring-2 focus:ring-[#006266] focus:bg-white focus:outline-none`}
                            />
                          </td>
                        );
                      })}

                      {/* Total Quantity */}
                      <td className="p-2.5 text-center font-mono font-bold text-sm bg-slate-100/60 text-[#006266] tabular-nums">
                        {row.totalQuantity}
                      </td>

                      {/* Purchase Cost Price */}
                      {settings.permissions.workerCanViewPurchaseCost && (
                        <td className="p-2 text-center">
                          {settings.permissions.workerCanEditPrices || currentRole === 'admin' ? (
                            <input
                              type="number"
                              disabled={isLocked}
                              value={row.costPrice || ''}
                              onChange={(e) =>
                                handlePriceChange(row.id, 'costPrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 text-center py-1 text-xs font-mono font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none tabular-nums"
                            />
                          ) : (
                            <span className="font-mono text-xs text-slate-700 tabular-nums">
                              {row.costPrice} ر.س
                            </span>
                          )}
                        </td>
                      )}

                      {/* Sale Price */}
                      <td className="p-2 text-center">
                        {settings.permissions.workerCanEditPrices || currentRole === 'admin' ? (
                          <input
                            type="number"
                            disabled={isLocked}
                            value={row.salePrice || ''}
                            onChange={(e) =>
                              handlePriceChange(row.id, 'salePrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 text-center py-1 text-xs font-mono font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none tabular-nums text-[#0c2461]"
                          />
                        ) : (
                          <span className="font-mono text-xs text-[#0c2461] font-semibold tabular-nums">
                            {row.salePrice} ر.س
                          </span>
                        )}
                      </td>

                      {/* Purchase Status Toggle Button */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => togglePurchaseStatus(row.id)}
                          className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            row.status === 'purchased'
                              ? 'bg-[#009432] text-white shadow-2xs hover:bg-[#007b29]'
                              : 'bg-amber-100/90 text-amber-900 border border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {row.status === 'purchased' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تم الشراء
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              قيد الشراء
                            </>
                          )}
                        </button>
                      </td>

                      {/* Row Actions: Duplicate (+) and Delete */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            className="p-1.5 text-slate-600 hover:text-white hover:bg-[#006266] rounded-lg transition-colors cursor-pointer"
                            title="تكرار السطر لشراء نفس الصنف من مورد آخر بسعر مختلف (+)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {sheet.rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف هذا السطر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Column totals for each grocery */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-[#0c2461] text-xs">
                  <td colSpan={3} className="p-3 text-right sticky right-0 bg-slate-100 z-10">
                    مجموع كميات البقالات:
                  </td>
                  {groceries.map((g) => {
                    const colTotal = sheet.rows.reduce(
                      (sum, r) => sum + (Number(r.quantities[g.id]) || 0),
                      0
                    );
                    return (
                      <td
                        key={g.id}
                        className="p-2 text-center font-mono text-sm text-[#0c2461] tabular-nums border-r border-slate-200"
                      >
                        {colTotal}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-mono font-black text-sm text-[#006266] bg-[#006266]/10 tabular-nums">
                    {totalUnits}
                  </td>
                  {settings.permissions.workerCanViewPurchaseCost && (
                    <td className="p-2 text-center font-mono text-xs tabular-nums">
                      {sheet.totalCost.toLocaleString()} ر.س
                    </td>
                  )}
                  <td className="p-2 text-center font-mono text-xs tabular-nums text-[#0c2461]">
                    {sheet.totalSale.toLocaleString()} ر.س
                  </td>
                  <td colSpan={2} className="p-2 text-center text-slate-500">
                    -
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MORNING SORT & DISTRIBUTION (جدول فرز الصباح المستقل لكل بقالة) */}
      {activeTab === 'morning_sort' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#006266]" />
                جدول فرز وتوزيع الصباح المستقل لكل بقالة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد آلي لمسحوبات كل بقالة على حدة لتسهيل التحميل الصباحي في سيارات التوزيع وتوثيق الاستلام.
              </p>
            </div>

            {/* Grocery Filter Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">عرض فرز بقالة:</span>
              <select
                value={selectedSortGrocery}
                onChange={(e) => setSelectedSortGrocery(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
              >
                <option value="all">كافة البقالات مجتمعة</option>
                {groceries.map((g) => (
                  <option key={g.id} value={g.id}>
                    ({g.code}) {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grids of Sort Sheets per Grocery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groceries
              .filter((g) => selectedSortGrocery === 'all' || selectedSortGrocery === g.id)
              .map((grocery) => {
                // Calculate this grocery's items
                const groceryItems = sheet.rows.filter((r) => (r.quantities[grocery.id] || 0) > 0);
                const groceryTotalQty = groceryItems.reduce(
                  (sum, r) => sum + (r.quantities[grocery.id] || 0),
                  0
                );
                const groceryTotalAmount = groceryItems.reduce(
                  (sum, r) => sum + (r.quantities[grocery.id] || 0) * r.salePrice,
                  0
                );

                return (
                  <div
                    key={grocery.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="bg-[#0c2461] text-white p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#f6b93b] text-[#0c2461] font-black text-sm flex items-center justify-center">
                            {grocery.code}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-white">{grocery.name}</h4>
                            <span className="text-[11px] text-slate-300">{grocery.ownerName}</span>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <span className="text-xs text-slate-300 block">فاتورة التوزيع</span>
                          <span className="text-sm font-bold text-[#f6b93b] tabular-nums">
                            {groceryTotalAmount.toLocaleString()} ر.س
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="p-3">
                        {groceryItems.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">
                            لا توجد طلبات مسجلة لهذه البقالة اليوم.
                          </div>
                        ) : (
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="pb-2">الصنف</th>
                                <th className="pb-2 text-center">الكمية المقررة</th>
                                <th className="pb-2 text-center">سعر الوحدة</th>
                                <th className="pb-2 text-center">الإجمالي</th>
                                <th className="pb-2 text-center">الاستلام</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groceryItems.map((r) => {
                                const q = r.quantities[grocery.id] || 0;
                                const isDelivered = r.morningSorted?.[grocery.id]?.confirmed;

                                return (
                                  <tr
                                    key={r.id}
                                    className={`border-b border-slate-200/60 ${
                                      isDelivered ? 'bg-emerald-50/50' : ''
                                    }`}
                                  >
                                    <td className="py-2 font-bold text-slate-800">
                                      {r.itemName}{' '}
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        ({r.unit})
                                      </span>
                                    </td>
                                    <td className="py-2 text-center font-mono font-bold text-slate-900 tabular-nums">
                                      {q}
                                    </td>
                                    <td className="py-2 text-center font-mono text-slate-600 tabular-nums">
                                      {r.salePrice}
                                    </td>
                                    <td className="py-2 text-center font-mono font-bold text-[#0c2461] tabular-nums">
                                      {(q * r.salePrice).toLocaleString()}
                                    </td>
                                    <td className="py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleDeliveryConfirm(r.id, grocery.id)}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                                          isDelivered
                                            ? 'bg-[#009432] text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                      >
                                        {isDelivered ? 'تم التسليم' : 'لم يُسلم'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Footer summary per grocery */}
                    <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <div className="text-slate-600">
                        إجمالي العبوات:{' '}
                        <span className="font-bold font-mono text-[#006266]">{groceryTotalQty}</span>
                      </div>
                      <div className="text-slate-600">
                        الرصيد السابق:{' '}
                        <span className="font-bold font-mono text-slate-800 tabular-nums">
                          {grocery.balance.toLocaleString()} ر.س
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
