import React, { useState } from 'react';
import { Printer, X, FileText, CheckCircle2, QrCode, Award, Shield, Sparkles } from 'lucide-react';
import { SystemSettings, DailySheet, Grocery, Supplier, Voucher, PrintTemplateId } from '../types';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'daily_invoice' | 'statement' | 'morning_sort' | 'voucher';
  settings: SystemSettings;
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
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  settings,
  data,
}) => {
  const [template, setTemplate] = useState<PrintTemplateId>('royal_classic');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto print-modal-backdrop">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col print-modal-content">
        {/* Modal Top Control Bar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#0c2461] text-white print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f6b93b] text-[#0c2461] flex items-center justify-center font-black">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">{title}</h3>
              <p className="text-[11px] text-slate-300">اختر قالب الطباعة المفضل ثم اضغط طباعة / PDF</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 2 Luxury Templates Selector */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setTemplate('royal_classic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  template === 'royal_classic'
                    ? 'bg-[#f6b93b] text-[#0c2461] shadow-xs'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>القالب الملكي المذهب</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplate('modern_minimal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  template === 'modern_minimal'
                    ? 'bg-white text-[#0c2461] shadow-xs'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>القالب العصري الحديث</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black text-slate-900 bg-[#f6b93b] hover:bg-[#e5aa32] rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CANVAS */}
        <div className="p-6 sm:p-10 overflow-y-auto printable-area bg-white text-slate-900 flex-1">
          {/* ========================================================= */}
          {/* TEMPLATE 1: ROYAL GOLD & NAVY CLASSIC (القالب الملكي الفاخر) */}
          {/* ========================================================= */}
          {template === 'royal_classic' && (
            <div className="border-4 border-[#0c2461] p-6 rounded-2xl relative">
              {/* Outer Golden Line */}
              <div className="absolute inset-1.5 border border-[#f6b93b] rounded-xl pointer-events-none" />

              {/* Header */}
              <div className="border-b-2 border-[#0c2461] pb-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-block bg-[#0c2461] text-[#f6b93b] font-mono text-[10px] font-bold px-3 py-0.5 rounded-full mb-2">
                      مستند مالي ومحاسبي معتمد رسمياً
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0c2461] tracking-tight font-serif">
                      {settings.businessName}
                    </h1>
                    <p className="text-sm font-bold text-amber-800 mt-1">{settings.businessSubname}</p>
                    <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5 font-bold">
                      {settings.phone} · {settings.taxOrRegNumber}
                    </p>
                  </div>

                  {/* Stamp & Doc Details */}
                  <div className="text-left bg-slate-50 border-2 border-[#f6b93b] p-4 rounded-xl min-w-[200px]">
                    <div className="text-xs text-slate-500 font-medium">نوع الكشف / الفاتورة:</div>
                    <div className="text-base font-black text-[#0c2461] mt-0.5">{title}</div>
                    <div className="text-xs text-slate-500 font-medium mt-2">تاريخ الإصدار:</div>
                    <div className="text-xs font-black text-slate-800 tabular-nums">{todayStr}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">كود الوثيقة: VEG-{(Math.random() * 10000).toFixed(0)}</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Content Body */}
              {type === 'daily_invoice' && data.sheet && (
                <div>
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 mb-6 flex flex-wrap items-center justify-between text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-600 font-medium">كشف يوم:</span>{' '}
                      <span className="font-bold text-[#0c2461]">{data.sheet.dayName}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">تاريخ الكشف:</span>{' '}
                      <span className="font-bold font-mono text-slate-900">{data.sheet.date}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">الحالة:</span>{' '}
                      <span className="font-bold text-[#009432]">معتمد ومسجل دفترياً</span>
                    </div>
                  </div>

                  <table className="w-full text-right border-collapse text-xs print:text-[9.5pt]">
                    <thead>
                      <tr className="bg-[#0c2461] text-[#f6b93b]">
                        <th className="p-2 border border-slate-300 text-center w-8">م</th>
                        <th className="p-2 border border-slate-300">الصنف</th>
                        <th className="p-2 border border-slate-300 text-center w-16">الوحدة</th>
                        <th className="p-2 border border-slate-300">المورد المعتمد</th>
                        <th className="p-2 border border-slate-300 text-center w-20">إجمالي الكمية</th>
                        <th className="p-2 border border-slate-300 text-center w-24">سعر الشراء (الوحدة)</th>
                        <th className="p-2 border border-slate-300 text-center w-28">إجمالي الشراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const activeRows = data.sheet.rows.filter((r) => (Number(r.totalQuantity) || 0) > 0);
                        const rowsToDisplay = activeRows.length > 0 ? activeRows : data.sheet.rows;
                        return rowsToDisplay.map((row, idx) => (
                          <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-1.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                            <td className="p-1.5 border border-slate-200 font-bold text-slate-900">{row.itemName}</td>
                            <td className="p-1.5 border border-slate-200 text-center text-slate-600">{row.unit}</td>
                            <td className="p-1.5 border border-slate-200 text-slate-700">{row.supplierName}</td>
                            <td className="p-1.5 border border-slate-200 text-center font-mono font-bold tabular-nums">
                              {row.totalQuantity}
                            </td>
                            <td className="p-1.5 border border-slate-200 text-center font-mono tabular-nums">
                              {Number(row.costPrice).toLocaleString()} ر.س
                            </td>
                            <td className="p-1.5 border border-slate-200 text-center font-mono font-semibold tabular-nums text-slate-900">
                              {Number(row.totalCost).toLocaleString()} ر.س
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-100 font-black border-t-2 border-[#0c2461]">
                        <td colSpan={4} className="p-2 text-right">الإجمالي الكلي للمشتريات:</td>
                        <td className="p-2 text-center font-mono tabular-nums text-[#0c2461]">
                          {data.sheet.rows.reduce((s, r) => s + (Number(r.totalQuantity) || 0), 0)}
                        </td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center font-mono tabular-nums text-slate-900">
                          {data.sheet.totalCost.toLocaleString()} ر.س
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Morning Sort / Grocery Delivery Invoice Content */}
              {type === 'morning_sort' && (
                <div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 flex flex-wrap items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">العميل / البقالة:</span>{' '}
                      <span className="font-black text-[#0c2461] text-base">
                        {data.grocery?.name} ({data.grocery?.code})
                      </span>
                      {data.grocery?.ownerName && (
                        <span className="text-slate-500 font-normal">· المالك: {data.grocery.ownerName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-500 font-medium">التاريخ:</span>{' '}
                        <span className="font-bold font-mono text-slate-800">
                          {data.sheet?.date || todayStr} ({data.sheet?.dayName})
                        </span>
                      </div>
                      <div className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-xs">
                        فاتورة تسليم بضاعة معتمدة
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-right border-collapse text-xs print:text-[9.5pt]">
                    <thead>
                      <tr className="bg-[#0c2461] text-[#f6b93b]">
                        <th className="p-2 border border-slate-300 text-center w-10">م</th>
                        <th className="p-2 border border-slate-300">اسم الصنف</th>
                        <th className="p-2 border border-slate-300 text-center w-20">الوحدة</th>
                        <th className="p-2 border border-slate-300 text-center w-24">الكمية المسلمة</th>
                        <th className="p-2 border border-slate-300 text-center w-28">سعر الوحدة</th>
                        <th className="p-2 border border-slate-300 text-center w-32">إجمالي القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const gId = data.grocery?.id || '';
                        const gRows = (data.sheet?.rows || []).filter(
                          (r) => (Number(r.quantities[gId]) || 0) > 0
                        );
                        if (gRows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">
                                لا توجد أصناف مسجلة لهذه البقالة في هذا الكشف.
                              </td>
                            </tr>
                          );
                        }
                        return gRows.map((row, idx) => {
                          const q = Number(row.quantities[gId]) || 0;
                          const sp = Number(row.costPrice) || 0;
                          const lineTotal = Math.round(q * sp * 100) / 100;
                          return (
                            <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="p-1.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                              <td className="p-1.5 border border-slate-200 font-bold text-slate-900">{row.itemName}</td>
                              <td className="p-1.5 border border-slate-200 text-center text-slate-600">{row.unit}</td>
                              <td className="p-1.5 border border-slate-200 text-center font-mono font-bold text-slate-900 tabular-nums">
                                {q}
                              </td>
                              <td className="p-1.5 border border-slate-200 text-center font-mono tabular-nums text-slate-700">
                                {sp.toLocaleString()} ر.س
                              </td>
                              <td className="p-1.5 border border-slate-200 text-center font-mono font-black text-[#0c2461] tabular-nums">
                                {lineTotal.toLocaleString()} ر.س
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const gId = data.grocery?.id || '';
                        const gRows = (data.sheet?.rows || []).filter(
                          (r) => (Number(r.quantities[gId]) || 0) > 0
                        );
                        const totalUnits = gRows.reduce(
                          (sum, r) => sum + (Number(r.quantities[gId]) || 0),
                          0
                        );
                        const invoiceTotal = gRows.reduce(
                          (sum, r) =>
                            sum +
                            Math.round((Number(r.quantities[gId]) || 0) * (Number(r.costPrice) || 0) * 100) / 100,
                          0
                        );
                        const prevBal = Number(data.grocery?.balance) || 0;
                        const netTotalDue = Math.round((prevBal + invoiceTotal) * 100) / 100;

                        return (
                          <>
                            <tr className="bg-amber-100 font-black border-t-2 border-[#0c2461]">
                              <td colSpan={3} className="p-2 text-right">
                                إجمالي الفاتورة الحالية:
                              </td>
                              <td className="p-2 text-center font-mono text-[#0c2461] tabular-nums">
                                {totalUnits}
                              </td>
                              <td className="p-2 text-center">-</td>
                              <td className="p-2 text-center font-mono text-base text-[#0c2461] tabular-nums">
                                {invoiceTotal.toLocaleString()} ر.س
                              </td>
                            </tr>
                            <tr className="bg-slate-100 font-bold border-t border-slate-300 text-xs">
                              <td colSpan={5} className="p-1.5 text-right text-slate-700">
                                الرصيد السابق المستحق على العميل:
                              </td>
                              <td className="p-1.5 text-center font-mono tabular-nums text-slate-900">
                                {prevBal.toLocaleString()} ر.س
                              </td>
                            </tr>
                            <tr className="bg-emerald-50 font-black border-t-2 border-[#0c2461] text-xs sm:text-sm">
                              <td colSpan={5} className="p-2 text-right text-emerald-900">
                                الإجمالي الكلي المطلوب سداده:
                              </td>
                              <td className="p-2 text-center font-mono text-base text-[#009432] tabular-nums font-black">
                                {netTotalDue.toLocaleString()} ر.س
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Statement Content */}
              {type === 'statement' && data.statementRows && (
                <div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between text-sm">
                    <div>
                      <span className="text-slate-500 font-medium">الجهة / الحساب:</span>{' '}
                      <span className="font-black text-lg text-[#0c2461]">
                        {data.grocery ? `${data.grocery.name} (${data.grocery.code})` : data.supplier?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">الرصيد المتبقي:</span>{' '}
                      <span className="font-black font-mono text-base text-[#0c2461] bg-[#f6b93b]/30 px-3 py-1 rounded-lg">
                        {Math.abs(data.grocery?.balance || data.supplier?.balance || 0).toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-right border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#0c2461] text-[#f6b93b]">
                        <th className="p-3 border border-slate-300">التاريخ</th>
                        <th className="p-3 border border-slate-300">البيان والحركة</th>
                        <th className="p-3 border border-slate-300 text-center">مدين (مسحوبات)</th>
                        <th className="p-3 border border-slate-300 text-center">دائن (سدادات)</th>
                        <th className="p-3 border border-slate-300 text-center">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.statementRows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2.5 border border-slate-200 font-mono">{row.date}</td>
                          <td className="p-2.5 border border-slate-200 font-medium text-slate-900">{row.description}</td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums">
                            {row.debit > 0 ? `${row.debit.toLocaleString()} ر.س` : '-'}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums text-[#009432] font-bold">
                            {row.credit > 0 ? `${row.credit.toLocaleString()} ر.س` : '-'}
                          </td>
                          <td className="p-2.5 border border-slate-200 text-center font-mono font-black tabular-nums text-[#0c2461]">
                            {row.balance.toLocaleString()} ر.س
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures & Classical Seal */}
              <div className="mt-10 pt-6 border-t-2 border-[#0c2461] flex items-center justify-between">
                <div className="text-right text-xs text-slate-500 max-w-sm">
                  <p>{settings.invoiceNotes}</p>
                  <p className="font-bold text-slate-700 mt-1">{settings.invoiceFooter}</p>
                </div>

                {/* SVG Official Stamp Seal */}
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#0c2461] p-1 flex items-center justify-center text-center rotate-[-12deg] opacity-80">
                  <div className="w-full h-full rounded-full border border-[#0c2461] flex flex-col items-center justify-center text-[8px] font-black text-[#0c2461] leading-tight p-1">
                    <span>مؤسسة النخبة للخضار</span>
                    <span className="text-[10px] text-[#f6b93b] font-mono">★ معتمد ★</span>
                    <span>قسم الحسابات</span>
                  </div>
                </div>
              </div>

              {/* 3 Signatures */}
              <div className="grid grid-cols-3 gap-6 mt-8 pt-4 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-6 font-medium">الموزع الميداني</span>
                  <span className="border-t border-slate-400 pt-1 block w-28 mx-auto font-bold text-slate-800">التوقيع</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-6 font-medium">المستلم / البقالة</span>
                  <span className="border-t border-slate-400 pt-1 block w-28 mx-auto font-bold text-slate-800">التوقيع والختم</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-6 font-medium">إدارة الحسابات العامة</span>
                  <span className="border-t border-slate-400 pt-1 block w-28 mx-auto font-bold text-slate-800">الاعتماد النهائي</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TEMPLATE 2: MODERN MINIMALIST ENTERPRISE (القالب العصري الحديث) */}
          {/* ========================================================= */}
          {template === 'modern_minimal' && (
            <div className="space-y-6">
              {/* Minimal Top Brand Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                    VEG
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">{settings.businessName}</h1>
                    <p className="text-xs text-slate-500">{settings.businessSubname}</p>
                  </div>
                </div>

                <div className="text-left font-mono text-xs">
                  <div className="font-bold text-slate-900">{title}</div>
                  <div className="text-slate-400">{todayStr}</div>
                </div>
              </div>

              {/* 3 Clean Stat Pills */}
              {data.sheet && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">إجمالي المشتريات</span>
                    <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                      {data.sheet.totalCost.toLocaleString()} ر.س
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">إجمالي التوزيع للبقالات</span>
                    <span className="text-lg font-bold font-mono text-[#0c2461] tabular-nums">
                      {data.sheet.totalSale.toLocaleString()} ر.س
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                    <span className="text-[11px] text-[#006266] block">تسعير التكلفة</span>
                    <span className="text-sm font-bold font-mono text-[#006266] tabular-nums">
                      بسعر الشراء المباشر للبقالات
                    </span>
                  </div>
                </div>
              )}

              {/* Modern Flat Table for Daily Sheet */}
              {type === 'daily_invoice' && data.sheet && (
                <table className="w-full text-right border-collapse text-xs print:text-[9.5pt]">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold">
                      <th className="py-2 px-2">الصنف</th>
                      <th className="py-2 px-2">الوحدة</th>
                      <th className="py-2 px-2">المورد</th>
                      <th className="py-2 px-2 text-center">الكمية</th>
                      <th className="py-2 px-2 text-center">سعر الشراء</th>
                      <th className="py-2 px-2 text-center">إجمالي القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const activeRows = data.sheet.rows.filter((r) => (Number(r.totalQuantity) || 0) > 0);
                      const rowsToDisplay = activeRows.length > 0 ? activeRows : data.sheet.rows;
                      return rowsToDisplay.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold text-slate-900">{row.itemName}</td>
                          <td className="py-2 px-2 text-slate-500">{row.unit}</td>
                          <td className="py-2 px-2 text-slate-700">{row.supplierName}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 tabular-nums">
                            {row.totalQuantity}
                          </td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-600">
                            {Number(row.costPrice).toLocaleString()} ر.س
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 tabular-nums">
                            {Number(row.totalCost).toLocaleString()} ر.س
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-black">
                      <td colSpan={3} className="py-2.5 px-2 text-right">الإجمالي النهائي للمشتريات:</td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                        {data.sheet.rows.reduce((s, r) => s + (Number(r.totalQuantity) || 0), 0)}
                      </td>
                      <td className="py-2.5 px-2 text-center">-</td>
                      <td className="py-2.5 px-2 text-center font-mono text-base tabular-nums text-slate-900">
                        {data.sheet.totalCost.toLocaleString()} ر.س
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Modern Morning Sort Grocery Invoice */}
              {type === 'morning_sort' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">العميل:</span>{' '}
                      <span className="font-bold text-slate-900">{data.grocery?.name} ({data.grocery?.code})</span>
                    </div>
                    <div>
                      <span className="text-slate-500">التاريخ:</span>{' '}
                      <span className="font-mono font-bold">{data.sheet?.date || todayStr}</span>
                    </div>
                  </div>

                  <table className="w-full text-right border-collapse text-xs print:text-[9.5pt]">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-slate-900 font-bold">
                        <th className="py-2 px-2">م</th>
                        <th className="py-2 px-2">الصنف</th>
                        <th className="py-2 px-2 text-center">الوحدة</th>
                        <th className="py-2 px-2 text-center">الكمية المسلمة</th>
                        <th className="py-2 px-2 text-center">سعر الوحدة</th>
                        <th className="py-2 px-2 text-center">إجمالي القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const gId = data.grocery?.id || '';
                        const gRows = (data.sheet?.rows || []).filter(
                          (r) => (Number(r.quantities[gId]) || 0) > 0
                        );
                        return gRows.map((row, idx) => {
                          const q = Number(row.quantities[gId]) || 0;
                          const sp = Number(row.costPrice) || 0;
                          return (
                            <tr key={row.id} className="border-b border-slate-100">
                              <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-2 font-bold text-slate-900">{row.itemName}</td>
                              <td className="py-2 px-2 text-center text-slate-500">{row.unit}</td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-slate-900">{q}</td>
                              <td className="py-2 px-2 text-center font-mono">{sp.toLocaleString()} ر.س</td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-slate-900">
                                {(q * sp).toLocaleString()} ر.س
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Modern Statement */}
              {type === 'statement' && data.statementRows && (
                <table className="w-full text-right border-collapse text-xs print:text-[9.5pt]">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold">
                      <th className="py-2 px-2">التاريخ</th>
                      <th className="py-2 px-2">البيان والحركة</th>
                      <th className="py-2 px-2 text-center">مدين</th>
                      <th className="py-2 px-2 text-center">دائن</th>
                      <th className="py-2 px-2 text-center">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.statementRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 px-2 font-mono text-slate-500">{row.date}</td>
                        <td className="py-2 px-2 font-medium text-slate-800">{row.description}</td>
                        <td className="py-2 px-2 text-center font-mono tabular-nums">{row.debit > 0 ? `${row.debit.toLocaleString()} ر.س` : '-'}</td>
                        <td className="py-2 px-2 text-center font-mono tabular-nums text-emerald-600 font-bold">{row.credit > 0 ? `${row.credit.toLocaleString()} ر.س` : '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold tabular-nums">{row.balance.toLocaleString()} ر.س</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Minimal Clean Footer */}
              <div className="pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
                <div>
                  <div className="font-bold text-slate-800">{settings.businessName}</div>
                  <div>{settings.address} · {settings.phone}</div>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  DIGITAL AUTHENTICATION ID: #DS-{(Math.random() * 90000).toFixed(0)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
