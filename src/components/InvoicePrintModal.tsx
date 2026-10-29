import React from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { SystemSettings, DailySheet, Grocery, Supplier, Voucher } from '../types';

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
      debit: number; // مدين (عليه)
      credit: number; // دائن (له)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0c2461] text-white print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#f6b93b]" />
            <h3 className="font-bold text-lg">{title} - معاينة وتصدير PDF</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-900 bg-[#f6b93b] hover:bg-[#e5aa32] rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              طباعة / حفظ PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 overflow-y-auto printable-area bg-white text-slate-900 flex-1">
          {/* Header */}
          <div className="border-b-2 border-[#0c2461] pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#0c2461] tracking-tight">{settings.businessName}</h1>
                <p className="text-sm font-medium text-slate-600 mt-1">{settings.businessSubname}</p>
                <p className="text-xs text-slate-500 mt-1">{settings.address}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{settings.phone} · {settings.taxOrRegNumber}</p>
              </div>
              <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[200px]">
                <div className="text-xs text-slate-500 font-medium">نوع المستند:</div>
                <div className="text-base font-bold text-[#0c2461] mt-0.5">{title}</div>
                <div className="text-xs text-slate-500 font-medium mt-2">التاريخ:</div>
                <div className="text-xs font-semibold text-slate-800 tabular-nums">{todayStr}</div>
              </div>
            </div>
          </div>

          {/* Conditional Content by Document Type */}
          {type === 'daily_invoice' && data.sheet && (
            <div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div>
                  <span className="text-slate-500 font-medium">كشف يوم:</span>{' '}
                  <span className="font-bold text-[#0c2461]">{data.sheet.dayName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">تاريخ الكشف:</span>{' '}
                  <span className="font-bold font-mono text-slate-800">{data.sheet.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">الحالة:</span>{' '}
                  <span className="font-semibold text-[#009432]">
                    {data.sheet.status === 'settled' ? 'مقفل ومرحل' : 'معتمد'}
                  </span>
                </div>
              </div>

              <table className="w-full text-right border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 border border-slate-300">م</th>
                    <th className="p-3 border border-slate-300">الصنف</th>
                    <th className="p-3 border border-slate-300">الوحدة</th>
                    <th className="p-3 border border-slate-300">المورد</th>
                    <th className="p-3 border border-slate-300 text-center">الكمية الإجمالية</th>
                    <th className="p-3 border border-slate-300 text-center">سعر الشراء</th>
                    <th className="p-3 border border-slate-300 text-center">إجمالي الشراء</th>
                    <th className="p-3 border border-slate-300 text-center">سعر البيع</th>
                    <th className="p-3 border border-slate-300 text-center">إجمالي البيع</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sheet.rows.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2.5 border border-slate-200 font-bold text-slate-900">{row.itemName}</td>
                      <td className="p-2.5 border border-slate-200 text-slate-600">{row.unit}</td>
                      <td className="p-2.5 border border-slate-200 text-slate-700">{row.supplierName}</td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono font-bold tabular-nums">
                        {row.totalQuantity}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums">
                        {row.costPrice.toLocaleString()} ر.س
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono font-semibold tabular-nums text-slate-900">
                        {row.totalCost.toLocaleString()} ر.س
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums">
                        {row.salePrice.toLocaleString()} ر.س
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono font-bold tabular-nums text-[#0c2461]">
                        {row.totalSale.toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-[#0c2461]">
                    <td colSpan={4} className="p-3 text-right">الإجماليات الكلية</td>
                    <td className="p-3 text-center font-mono tabular-nums text-[#0c2461]">
                      {data.sheet.rows.reduce((s, r) => s + r.totalQuantity, 0)}
                    </td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center font-mono tabular-nums text-slate-900">
                      {data.sheet.totalCost.toLocaleString()} ر.س
                    </td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center font-mono tabular-nums text-[#0c2461] bg-[#f6b93b]/20">
                      {data.sheet.totalSale.toLocaleString()} ر.س
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Statement of Account (كشف حساب بقالة أو مورد) */}
          {type === 'statement' && (data.grocery || data.supplier) && data.statementRows && (
            <div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div>
                  <span className="text-slate-500 font-medium">الجهة / الحساب:</span>{' '}
                  <span className="font-bold text-lg text-[#0c2461]">
                    {data.grocery ? `${data.grocery.name} (${data.grocery.code})` : data.supplier?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">رقم الجوال:</span>{' '}
                  <span className="font-mono text-slate-800">{data.grocery?.phone || data.supplier?.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">الرصيد الصافي الحالي:</span>{' '}
                  <span className="font-bold font-mono text-base text-[#0c2461] bg-[#f6b93b]/20 px-3 py-1 rounded-lg">
                    {Math.abs(data.grocery?.balance || data.supplier?.balance || 0).toLocaleString()} ر.س{' '}
                    {(data.grocery?.balance || 0) > 0 ? '(مستحق علينا/مدين)' : ''}
                  </span>
                </div>
              </div>

              <table className="w-full text-right border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 border border-slate-300">التاريخ</th>
                    <th className="p-3 border border-slate-300">البيان والحركة</th>
                    <th className="p-3 border border-slate-300 text-center">مدين (مسحوبات / مشتريات)</th>
                    <th className="p-3 border border-slate-300 text-center">دائن (مدفوعات وسندات)</th>
                    <th className="p-3 border border-slate-300 text-center">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.statementRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2.5 border border-slate-200 font-mono text-slate-700">{row.date}</td>
                      <td className="p-2.5 border border-slate-200 font-medium text-slate-900">{row.description}</td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums text-slate-800">
                        {row.debit > 0 ? `${row.debit.toLocaleString()} ر.س` : '-'}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums text-[#009432] font-semibold">
                        {row.credit > 0 ? `${row.credit.toLocaleString()} ر.س` : '-'}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono font-bold tabular-nums text-[#0c2461]">
                        {row.balance.toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Morning Sort Sheet (فرز الصباح المستقل لبقالة أو عام) */}
          {type === 'morning_sort' && data.sheet && (
            <div>
              <div className="bg-[#006266]/10 p-4 rounded-xl border border-[#006266]/20 mb-6 flex items-center justify-between text-sm">
                <div>
                  <span className="text-[#006266] font-bold">جدول فرز وتوزيع الصباح:</span>{' '}
                  <span className="font-bold text-[#0c2461]">{data.grocery?.name || 'كشف التوزيع العام'}</span>
                </div>
                <div className="font-mono text-slate-700">تاريخ التوزيع: {data.sheet.date}</div>
              </div>

              <table className="w-full text-right border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-[#006266] text-white">
                    <th className="p-3 border border-slate-300">م</th>
                    <th className="p-3 border border-slate-300">الصنف</th>
                    <th className="p-3 border border-slate-300">الوحدة</th>
                    <th className="p-3 border border-slate-300 text-center">الكمية المقررة</th>
                    <th className="p-3 border border-slate-300 text-center">سعر الوحدة</th>
                    <th className="p-3 border border-slate-300 text-center">الإجمالي</th>
                    <th className="p-3 border border-slate-300 text-center">حالة الاستلام والتسليم</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sheet.rows.map((row, idx) => {
                    const gQty = data.grocery ? (row.quantities[data.grocery.id] || 0) : row.totalQuantity;
                    if (gQty <= 0) return null;
                    const rowTotal = gQty * row.salePrice;

                    return (
                      <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-2.5 border border-slate-200 font-bold text-slate-900">{row.itemName}</td>
                        <td className="p-2.5 border border-slate-200 text-slate-600">{row.unit}</td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-lg tabular-nums text-[#006266]">
                          {gQty}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums">
                          {row.salePrice.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono font-bold tabular-nums text-[#0c2461]">
                          {rowTotal.toLocaleString()} ر.س
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-medium">
                          <span className="inline-flex items-center gap-1 text-[#009432]">
                            <CheckCircle2 className="w-4 h-4" />
                            تم التسليم ومطابق
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Voucher Print */}
          {type === 'voucher' && data.voucher && (
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div>
                  <span className="text-xs text-slate-500 font-medium">رقم السند:</span>
                  <div className="text-xl font-bold font-mono text-[#0c2461]">{data.voucher.voucherNumber}</div>
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-500 font-medium">التاريخ:</span>
                  <div className="text-sm font-semibold font-mono text-slate-800">{data.voucher.date}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                <div>
                  <span className="text-slate-500 block mb-1">
                    {data.voucher.type === 'receipt' ? 'استلمنا من السيد / البقالة:' : 'صرفنا إلى السيد / المورد:'}
                  </span>
                  <span className="font-bold text-base text-[#0c2461]">{data.voucher.partyName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">المبلغ والقدر:</span>
                  <span className="font-bold text-lg font-mono text-[#009432] bg-[#009432]/10 px-3 py-1 rounded-lg">
                    {data.voucher.amount.toLocaleString()} ر.س
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">طريقة السداد:</span>
                  <span className="font-semibold text-slate-800">
                    {data.voucher.paymentMethod === 'cash' ? 'نقداً (كاش)' : data.voucher.paymentMethod === 'transfer' ? 'تحويل بنكي / صرافة' : 'شيك مصرفي'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">المرجع / رقم الإيداع:</span>
                  <span className="font-mono text-slate-800">{data.voucher.referenceNumber || 'سداد مباشر'}</span>
                </div>
              </div>

              <div className="mb-6 p-3 bg-white rounded-xl border border-slate-200 text-sm">
                <span className="text-slate-500 block text-xs mb-1">وذلك عن (البيان):</span>
                <span className="font-medium text-slate-800">{data.voucher.notes || 'تسوية حساب دورية'}</span>
              </div>
            </div>
          )}

          {/* Footer Notes and Signatures */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 leading-relaxed">{settings.invoiceNotes}</p>
            <p className="text-xs font-semibold text-slate-600 mt-2">{settings.invoiceFooter}</p>

            <div className="grid grid-cols-3 gap-6 mt-10 pt-6 text-center text-xs">
              <div>
                <span className="text-slate-500 font-medium block mb-8">أمين المستودع / الموزع الميداني</span>
                <span className="border-t border-slate-400 pt-2 block w-32 mx-auto text-slate-700 font-semibold">التوقيع والختم</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-8">المستلم / صاحب البقالة</span>
                <span className="border-t border-slate-400 pt-2 block w-32 mx-auto text-slate-700 font-semibold">التوقيع والختم</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-8">إدارة الحسابات والمالية</span>
                <span className="border-t border-slate-400 pt-2 block w-32 mx-auto text-slate-700 font-semibold">التوقيع والختم</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
