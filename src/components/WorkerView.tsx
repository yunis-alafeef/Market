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
  Minus,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  ShoppingBag,
  Truck,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
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
  onUpdateItemPrice?: (itemId: string, costPrice: number, salePrice: number) => void;
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
  onUpdateItemPrice,
}) => {
  // Tabs: 'night_orders' (طلبات الليل والشراء) vs 'morning_sort' (فرز وتوزيع الصباح)
  const [activeTab, setActiveTab] = useState<'night_orders' | 'morning_sort'>('night_orders');
  // View mode for night orders: 'table' (Default Matrix Grid) vs 'cards' (Secondary Touch Cards)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  // Selected grocery for the mobile cards stepper
  const [activeCardGroceryId, setActiveCardGroceryId] = useState<string>(groceries[0]?.id || '');
  // Selected grocery filter for morning sort view
  const [selectedSortGrocery, setSelectedSortGrocery] = useState<string>('all');
  // Active row being quick-edited with fractions pad
  const [activeCell, setActiveCell] = useState<{ rowId: string; groceryId: string } | null>(null);

  const isLocked = settings.permissions.lockDailySheetAfterSave && sheet.nightOrdersSaved && currentRole === 'worker';

  // Incremental stepper helper (+ / -)
  const handleStepQuantity = (rowId: string, groceryId: string, delta: number) => {
    if (isLocked) return;
    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const current = row.quantities[groceryId] || 0;
      const nextVal = Math.max(0, Math.round((current + delta) * 100) / 100);

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

  // Direct fraction or absolute setter
  const handleSetQuantity = (rowId: string, groceryId: string, val: number, isDelta = false) => {
    if (isLocked) return;
    const updatedRows = sheet.rows.map((row) => {
      if (row.id !== rowId) return row;
      const current = row.quantities[groceryId] || 0;
      const nextVal = isDelta
        ? Math.max(0, Math.round((current + val) * 100) / 100)
        : Math.max(0, val);

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

  // Price changes directly from the table or cards
  const handlePriceChange = (rowId: string, field: 'costPrice' | 'salePrice', val: number) => {
    const targetRow = sheet.rows.find((r) => r.id === rowId);
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

    if (targetRow && onUpdateItemPrice) {
      const newCost = field === 'costPrice' ? Math.max(0, val) : targetRow.costPrice;
      const newSale = field === 'salePrice' ? Math.max(0, val) : targetRow.salePrice;
      onUpdateItemPrice(targetRow.itemId, newCost, newSale);
    }

    recalculateAndSave(updatedRows);
  };

  // Add existing product from catalog to current sheet
  const handleAddProductToSheet = (itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (!item) return;

    const existingRow = sheet.rows.find((r) => r.itemId === item.id || r.itemName === item.name);
    if (existingRow) {
      alert(`الصنف "${item.name}" مضاف بالفعل في كشف اليومية! يمكنك تعديل كمياته وسعره مباشرة.`);
      return;
    }

    const newRow: DailyOrderRow = {
      id: `row_${sheet.date}_${item.id}_${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || 'مورد عام',
      costPrice: item.defaultCostPrice,
      salePrice: item.defaultSalePrice,
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

    recalculateAndSave([...sheet.rows, newRow]);
    onAddAuditLog('إضافة منتج للكشف', item.name, '', `سعر البيع الافتراضي: ${item.defaultSalePrice} ر.س`);
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

  // Delete Row
  const handleDeleteRow = (rowId: string) => {
    const target = sheet.rows.find((r) => r.id === rowId);
    if (!target) return;

    if (window.confirm(`هل أنت متأكد من حذف صنف (${target.itemName}) من الكشف؟`)) {
      const newRows = sheet.rows.filter((r) => r.id !== rowId);
      onAddAuditLog('حذف سطر صنف', target.itemName, `${target.totalQuantity} ${target.unit}`, 'محذوف');
      recalculateAndSave(newRows);
    }
  };

  // Recalculate sheet totals
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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    onAddAuditLog(
      'حفظ طلبات الليل وتوليد فرز الصباح',
      `كشف ${sheet.dayName} ${sheet.date}`,
      '',
      `تم تثبيت ${sheet.rows.length} صنف بإجمالي ${totalQty} وحدة وتوليد جداول فرز الصباح`
    );

    alert('✅ تم حفظ طلبات الليل وتوليد جداول فرز الصباح المستقلة لكل بقالة بنجاح!');
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

  // Available master products not yet present in today's sheet
  const availableItemsToAdd = items.filter(
    (item) => !sheet.rows.some((r) => r.itemId === item.id || r.itemName === item.name)
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20">
      {/* Top Banner / Date & Mode Strip */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#006266]/10 text-[#006266] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 whitespace-nowrap">
                كشف اليومية: {sheet.dayName}
              </h2>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                {sheet.date}
              </span>
              {sheet.nightOrdersSaved ? (
                <span className="text-xs bg-emerald-50 text-[#009432] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  معتمد للفرز
                </span>
              ) : (
                <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  مسودة مشتريات
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              إدخال الكميات بالكسور وأزرار الرفع والإنقاص السريعة دون الحاجة للكتابة اليدوية.
            </p>
          </div>
        </div>

        {/* View Switchers & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Display Mode: Table (Default) vs Cards (Secondary) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#006266] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض الجدول الميداني الشامل (الافتراضي)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>الجدول (الافتراضي)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#006266] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض بطاقات لمس مخصصة لشاشة الجوال (ثانوي)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>البطاقات (ثانوي)</span>
            </button>
          </div>

          {/* Tab Switcher: Night Orders vs Morning Sort */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('night_orders')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'night_orders'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              طلبات الليل ({sheet.rows.length})
            </button>
            <button
              onClick={() => setActiveTab('morning_sort')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'morning_sort'
                  ? 'bg-[#006266] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فرز الصباح
            </button>
          </div>

          {/* Quick Print Button */}
          <button
            onClick={() => onOpenPrintModal(activeTab === 'night_orders' ? 'daily_invoice' : 'morning_sort')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">طباعة / PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block whitespace-nowrap">الكميات المطلوبة</span>
          <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#006266]">
            {totalUnits.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">وحدة</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block whitespace-nowrap">تم شراؤها بالسوق</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#009432]">
              {purchasedRowsCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {sheet.rows.length}</span>
          </div>
        </div>

        {settings.permissions.workerCanViewPurchaseCost && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block whitespace-nowrap">تكلفة الشراء</span>
            <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#0c2461]">
              {sheet.totalCost.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">ر.س</span>
            </span>
          </div>
        )}

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block whitespace-nowrap">إجمالي المبيعات</span>
          <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-[#0c2461] bg-[#f6b93b]/20 px-2 py-0.5 rounded-lg inline-block">
            {sheet.totalSale.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-800">ر.س</span>
          </span>
        </div>
      </div>

      {/* Lock Notice if locked */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>كشف اليومية مقفل حالياً بعد حفظ طلبات الليل. تواصل مع المدير للتعديل.</span>
          </div>
        </div>
      )}

      {/* Action Buttons Strip */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Always accessible Add Product Button for Worker */}
          <button
            onClick={onOpenAddItem}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[#006266] hover:bg-[#004e51] rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
            title="إضافة صنف أو منتج جديد إلى النظام وكشف اليومية"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة منتج جديد</span>
          </button>

          {/* Quick select from available master products */}
          {availableItemsToAdd.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-600 font-bold whitespace-nowrap hidden sm:inline">
                أصناف مسجلة:
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProductToSheet(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="text-xs bg-white border border-slate-300 font-bold text-slate-800 py-1 px-2 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#006266]"
              >
                <option value="" disabled>
                  + اختر منتج لإضافته للكشف ({availableItemsToAdd.length})
                </option>
                {availableItemsToAdd.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.unit}) - بيع: {it.defaultSalePrice} ر.س
                  </option>
                ))}
              </select>
            </div>
          )}

          {(currentRole === 'admin' || settings.permissions.workerCanAddSupplier) && (
            <button
              onClick={onOpenAddSupplier}
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Truck className="w-4 h-4 text-slate-500" />
              <span>+ مورد جديد</span>
            </button>
          )}
        </div>

        <button
          onClick={handleSaveNightOrders}
          className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-black text-white bg-[#009432] hover:bg-[#007b29] rounded-xl transition-all shadow-md cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <Save className="w-4 h-4" />
          <span>حفظ طلبات الليل وتوليد فرز الصباح</span>
        </button>
      </div>

      {/* TAB 1: NIGHT ORDERS (CARDS OR TABLE) */}
      {activeTab === 'night_orders' && (
        <>
          {/* MODE A: MOBILE TOUCH CARDS (Designed specifically for Mobile Ergonomics!) */}
          {viewMode === 'cards' ? (
            <div className="space-y-4">
              {/* Grocery Selector Strip for Cards View */}
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>اختر البقالة لضبط كمياتها عبر أزرار الرفع والإنقاص:</span>
                  <span className="text-[#006266] font-mono">
                    {sheet.rows.reduce(
                      (sum, r) => sum + (r.quantities[activeCardGroceryId] || 0),
                      0
                    )}{' '}
                    وحدة للبقالة المحددة
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                  {groceries.map((g) => {
                    const isSelected = activeCardGroceryId === g.id;
                    const totalForG = sheet.rows.reduce(
                      (sum, r) => sum + (r.quantities[g.id] || 0),
                      0
                    );

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveCardGroceryId(g.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-[#006266] text-white shadow-md ring-2 ring-[#f6b93b]/60'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#f6b93b] text-[#0c2461]'
                              : 'bg-white text-slate-800 border border-slate-200'
                          }`}
                        >
                          {g.code}
                        </span>
                        <span>{g.name.replace('بقالة', '').replace('سوبرماركت', '')}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {totalForG}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sheet.rows.map((row, index) => {
                  const currentQty = row.quantities[activeCardGroceryId] || 0;
                  const activeGrocery = groceries.find((g) => g.id === activeCardGroceryId) || groceries[0];

                  return (
                    <div
                      key={row.id}
                      className={`bg-white rounded-3xl border transition-all p-4 shadow-xs relative flex flex-col justify-between ${
                        row.status === 'purchased'
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Top Card Bar: Item Name & Purchase Status */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-mono text-xs flex items-center justify-center font-bold">
                              {index + 1}
                            </span>
                            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                              <h3 className="font-black text-lg text-slate-900">{row.itemName}</h3>
                              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {row.unit}
                              </span>
                            </div>
                          </div>

                          {/* Purchase Status Toggle */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => togglePurchaseStatus(row.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                              row.status === 'purchased'
                                ? 'bg-[#009432] text-white shadow-xs'
                                : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                            }`}
                          >
                            {row.status === 'purchased' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تم الشراء</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-700" />
                                <span>قيد الشراء</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Supplier Selector Row (Single Line) */}
                        <div className="flex items-center justify-between gap-2 text-xs mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 font-medium whitespace-nowrap shrink-0">
                            المورد:
                          </span>
                          <select
                            disabled={isLocked}
                            value={row.supplierId}
                            onChange={(e) => handleSupplierChange(row.id, e.target.value)}
                            className="bg-transparent font-bold text-slate-800 focus:outline-none text-xs truncate max-w-[200px]"
                          >
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Total Quantity for All Groceries Badge */}
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-3 px-1">
                          <span className="whitespace-nowrap">
                            إجمالي كافة البقالات: <strong className="font-mono text-[#006266] text-sm">{row.totalQuantity} {row.unit}</strong>
                          </span>
                          {settings.permissions.workerCanViewPurchaseCost && (
                            <span className="whitespace-nowrap font-mono text-slate-700">
                              سعر الشراء: <strong>{row.costPrice} ر.س</strong>
                            </span>
                          )}
                        </div>

                        {/* THE STEPPER BOX FOR ACTIVE GROCERY (Huge, thumb-friendly buttons) */}
                        <div className="bg-[#006266]/5 border border-[#006266]/20 rounded-2xl p-3.5 mb-3">
                          <div className="flex items-center justify-between text-xs font-bold text-[#006266] mb-2">
                            <span className="whitespace-nowrap">
                              كمية ({activeGrocery?.name.replace('بقالة', '')}):
                            </span>
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-amber-300">
                              <span className="font-bold text-[11px] text-slate-600">سعر البيع:</span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                disabled={isLocked}
                                value={row.salePrice === 0 ? '' : row.salePrice}
                                onChange={(e) =>
                                  handlePriceChange(row.id, 'salePrice', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 text-center font-mono font-black text-xs py-0.5 bg-transparent text-[#0c2461] focus:outline-none"
                                title="تحديد سعر البيع"
                              />
                              <span className="text-[10px] text-slate-500">ر.س</span>
                            </div>
                          </div>

                          {/* Stepper with Huge Buttons */}
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              disabled={isLocked || currentQty <= 0}
                              onClick={() => handleStepQuantity(row.id, activeCardGroceryId, -1)}
                              className="w-13 h-13 rounded-2xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 flex items-center justify-center font-black text-xl shadow-xs active:scale-90 transition-transform cursor-pointer shrink-0 disabled:opacity-40"
                              title="إنقاص واحد (-1)"
                            >
                              <Minus className="w-6 h-6 text-slate-700" />
                            </button>

                            {/* Center Value */}
                            <div className="flex-1 text-center bg-white rounded-2xl py-2 px-2 border border-[#006266]/30 shadow-2xs">
                              <span className="text-3xl font-black font-mono text-[#006266] tabular-nums block">
                                {currentQty}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold block">
                                {row.unit}
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleStepQuantity(row.id, activeCardGroceryId, 1)}
                              className="w-13 h-13 rounded-2xl bg-[#006266] text-white hover:bg-[#004e51] flex items-center justify-center font-black text-xl shadow-xs active:scale-90 transition-transform cursor-pointer shrink-0"
                              title="زيادة واحد (+1)"
                            >
                              <Plus className="w-6 h-6 text-white" />
                            </button>
                          </div>

                          {/* Quick Increment Chips (½, ¼, +1, +2, +5, تصفير) */}
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-3 pt-2.5 border-t border-[#006266]/15">
                            {[
                              { label: '+¼', delta: 0.25, isDelta: true },
                              { label: '+½', delta: 0.5, isDelta: true },
                              { label: '+1', delta: 1.0, isDelta: true },
                              { label: '+2', delta: 2.0, isDelta: true },
                              { label: '+5', delta: 5.0, isDelta: true },
                              { label: 'تصفير', delta: 0, isDelta: false },
                            ].map((chip, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                disabled={isLocked}
                                onClick={() =>
                                  handleSetQuantity(row.id, activeCardGroceryId, chip.delta, chip.isDelta)
                                }
                                className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center font-mono tabular-nums active:scale-95 ${
                                  chip.label === 'تصفير'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 col-span-2 sm:col-span-1'
                                    : 'bg-white hover:bg-[#006266] hover:text-white text-[#006266] border border-[#006266]/25 shadow-2xs'
                                }`}
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Breakdown for other groceries in this card (compact horizontal row) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1 mb-2">
                          {groceries.map((g) => {
                            const q = row.quantities[g.id] || 0;
                            const isCur = g.id === activeCardGroceryId;
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => setActiveCardGroceryId(g.id)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors ${
                                  isCur
                                    ? 'bg-[#006266] text-white'
                                    : q > 0
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <span>{g.code}:</span>
                                <span className="font-mono">{q}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Footer Actions: Duplicate (+) and Delete */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(row.id)}
                          className="flex items-center gap-1 text-[#006266] hover:text-[#004e51] font-bold py-1 px-2 rounded-lg hover:bg-[#006266]/10 cursor-pointer"
                          title="شراء نفس الصنف من مورد آخر بسعر مختلف"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>تكرار لمورد آخر (+)</span>
                        </button>

                        {sheet.rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MODE B: TRADITIONAL FULL MATRIX TABLE (with Steppers in Cells & Horizontal Scroll) */
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-right border-collapse text-xs sm:text-sm min-w-[950px]">
                  <thead>
                    <tr className="bg-[#0c2461] text-white select-none">
                      <th className="p-3 w-10 text-center font-bold">#</th>
                      <th className="p-3 font-bold sticky right-0 bg-[#0c2461] z-10 min-w-[130px] whitespace-nowrap">
                        الصنف (الوحدة)
                      </th>
                      <th className="p-3 font-bold min-w-[160px] whitespace-nowrap">المورد</th>
                      {/* Grocery Columns */}
                      {groceries.map((g) => (
                        <th
                          key={g.id}
                          className="p-2 text-center border-r border-[#1e3799] font-bold min-w-[95px] bg-[#0c2461]/90"
                        >
                          <div className="text-sm font-black text-[#f6b93b] whitespace-nowrap">
                            {g.code}
                          </div>
                          <div className="text-[10px] text-slate-300 font-normal truncate max-w-[80px] mx-auto whitespace-nowrap">
                            {g.name.replace('بقالة', '').replace('سوبرماركت', '')}
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold bg-[#1e3799]/80 min-w-[70px] whitespace-nowrap">
                        المجموع
                      </th>
                      {settings.permissions.workerCanViewPurchaseCost && (
                        <th className="p-3 text-center font-bold min-w-[95px] whitespace-nowrap">
                          سعر الشراء
                        </th>
                      )}
                      <th className="p-3 text-center font-bold min-w-[125px] whitespace-nowrap bg-[#1e3799]">
                        <div className="text-[#f6b93b] font-black">
                          سعر البيع (تحديد السعر)
                        </div>
                      </th>
                      <th className="p-3 text-center font-bold min-w-[110px] whitespace-nowrap">
                        حالة الشراء
                      </th>
                      <th className="p-3 text-center font-bold w-16 whitespace-nowrap">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                        } ${row.status === 'purchased' ? 'bg-emerald-50/30' : ''}`}
                      >
                        <td className="p-2 text-center font-mono text-slate-400 text-xs">
                          {index + 1}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 sticky right-0 bg-inherit z-10 shadow-xs border-l border-slate-200 whitespace-nowrap">
                          <span className="text-base text-slate-900">{row.itemName}</span>{' '}
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                            {row.unit}
                          </span>
                        </td>
                        <td className="p-2">
                          <select
                            disabled={isLocked}
                            value={row.supplierId}
                            onChange={(e) => handleSupplierChange(row.id, e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none truncate"
                          >
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Cell with Stepper for every grocery */}
                        {groceries.map((g) => {
                          const qty = row.quantities[g.id] ?? 0;
                          return (
                            <td key={g.id} className="p-1.5 text-center border-r border-slate-100">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={isLocked || qty <= 0}
                                  onClick={() => handleStepQuantity(row.id, g.id, -0.5)}
                                  className="w-6 h-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-black text-xs cursor-pointer disabled:opacity-30 shrink-0"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-sm text-slate-900 min-w-[28px] tabular-nums">
                                  {qty === 0 ? '-' : qty}
                                </span>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleStepQuantity(row.id, g.id, 0.5)}
                                  className="w-6 h-6 rounded bg-[#006266]/15 text-[#006266] hover:bg-[#006266] hover:text-white flex items-center justify-center font-black text-xs cursor-pointer shrink-0"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          );
                        })}

                        <td className="p-2.5 text-center font-mono font-bold text-sm bg-slate-100/60 text-[#006266] tabular-nums whitespace-nowrap">
                          {row.totalQuantity}
                        </td>

                        {settings.permissions.workerCanViewPurchaseCost && (
                          <td className="p-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="50"
                                disabled={isLocked}
                                value={row.costPrice === 0 ? '' : row.costPrice}
                                onChange={(e) =>
                                  handlePriceChange(
                                    row.id,
                                    'costPrice',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                                className="w-20 text-center font-mono text-xs py-1 px-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006266]/40 text-slate-700 shadow-2xs font-bold"
                                title="تحديد سعر الشراء مباشرة من الجدول"
                              />
                              <span className="text-[10px] text-slate-500 font-bold">ر.س</span>
                            </div>
                          </td>
                        )}

                        <td className="p-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="50"
                              disabled={isLocked}
                              value={row.salePrice === 0 ? '' : row.salePrice}
                              onChange={(e) =>
                                handlePriceChange(
                                  row.id,
                                  'salePrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="w-22 text-center font-mono text-xs py-1 px-1.5 bg-amber-50 hover:bg-amber-100/50 border border-amber-400 focus:border-[#006266] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006266]/40 text-[#0c2461] font-black shadow-2xs"
                              title="تحديد سعر بيع الصنف للبقالات مباشرة من الجدول"
                            />
                            <span className="text-[10px] text-slate-600 font-bold">ر.س</span>
                          </div>
                        </td>

                        <td className="p-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => togglePurchaseStatus(row.id)}
                            className={`w-full py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              row.status === 'purchased'
                                ? 'bg-[#009432] text-white'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {row.status === 'purchased' ? 'تم الشراء ✅' : 'قيد الشراء ⏳'}
                          </button>
                        </td>

                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(row.id)}
                              className="p-1 text-slate-600 hover:text-white hover:bg-[#006266] rounded cursor-pointer"
                              title="تكرار السطر"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td
                        colSpan={groceries.length + (settings.permissions.workerCanViewPurchaseCost ? 6 : 5)}
                        className="p-3 text-right"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={onOpenAddItem}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[#006266] hover:bg-[#004e51] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            <span>+ إضافة صنف / منتج جديد للكشف</span>
                          </button>

                          {availableItemsToAdd.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-bold">
                                أصناف متوفرة للإضافة السريعة:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {availableItemsToAdd.slice(0, 6).map((it) => (
                                  <button
                                    key={it.id}
                                    type="button"
                                    onClick={() => handleAddProductToSheet(it.id)}
                                    className="px-2.5 py-1 text-xs font-bold text-[#006266] bg-white border border-[#006266]/30 hover:bg-[#006266] hover:text-white rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                    title={`إضافة ${it.name} بسعر ${it.defaultSalePrice} ر.س`}
                                  >
                                    + {it.name} ({it.unit})
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: MORNING SORT & DISTRIBUTION */}
      {activeTab === 'morning_sort' && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                <Truck className="w-5 h-5 text-[#006266]" />
                جدول فرز وتوزيع الصباح المستقل لكل بقالة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد آلي لمسحوبات كل بقالة على حدة لتسهيل التحميل الصباحي في سيارات التوزيع وتوثيق الاستلام.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                عرض فرز بقالة:
              </span>
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
                      <div className="bg-[#0c2461] text-white p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-[#f6b93b] text-[#0c2461] font-black text-sm flex items-center justify-center">
                            {grocery.code}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-white whitespace-nowrap">
                              {grocery.name}
                            </h4>
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

                      <div className="p-3">
                        {groceryItems.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">
                            لا توجد طلبات مسجلة لهذه البقالة اليوم.
                          </div>
                        ) : (
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="pb-2 whitespace-nowrap">الصنف</th>
                                <th className="pb-2 text-center whitespace-nowrap">الكمية المقررة</th>
                                <th className="pb-2 text-center whitespace-nowrap">سعر الوحدة</th>
                                <th className="pb-2 text-center whitespace-nowrap">الإجمالي</th>
                                <th className="pb-2 text-center whitespace-nowrap">الاستلام</th>
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
                                    <td className="py-2 font-bold text-slate-800 whitespace-nowrap">
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
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
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

                    <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <div className="text-slate-600 whitespace-nowrap">
                        إجمالي العبوات:{' '}
                        <span className="font-bold font-mono text-[#006266]">{groceryTotalQty}</span>
                      </div>
                      <div className="text-slate-600 whitespace-nowrap">
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
