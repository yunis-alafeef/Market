import React, { useState, useEffect } from 'react';
import { getEffectiveMarketDate } from '../services/storage';
import { X, Receipt, Check } from 'lucide-react';
import { Grocery, Supplier, Voucher } from '../types';

interface AddVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  groceries: Grocery[];
  suppliers: Supplier[];
  onAddVoucher: (voucher: Omit<Voucher, 'id' | 'createdAt'>) => void;
  defaultType?: 'receipt' | 'payment';
  defaultPartyId?: string;
}

export const AddVoucherModal: React.FC<AddVoucherModalProps> = ({
  isOpen,
  onClose,
  groceries,
  suppliers,
  onAddVoucher,
  defaultType = 'receipt',
  defaultPartyId,
}) => {
  const [type, setType] = useState<'receipt' | 'payment'>(defaultType);
  const [partyId, setPartyId] = useState<string>(
    defaultPartyId || (defaultType === 'receipt' ? groceries[0]?.id : suppliers[0]?.id) || ''
  );
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'check'>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(() => getEffectiveMarketDate().actualDateStr);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setPartyId(defaultPartyId || (defaultType === 'receipt' ? groceries[0]?.id : suppliers[0]?.id) || '');
      setDate(getEffectiveMarketDate().actualDateStr);
      setAmount(0);
      setReferenceNumber('');
      setNotes('');
    }
  }, [isOpen, defaultType, defaultPartyId, groceries, suppliers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    let partyName = '';
    let partyCode = '';

    if (type === 'receipt') {
      const g = groceries.find((item) => item.id === partyId);
      partyName = g?.name || 'بقالة غير محددة';
      partyCode = g?.code || '';
    } else {
      const s = suppliers.find((item) => item.id === partyId);
      partyName = s?.name || 'مورد غير محدد';
    }

    const voucherNum =
      type === 'receipt'
        ? `سند-قبض-${Math.floor(100 + Math.random() * 900)}`
        : `سند-صرف-${Math.floor(200 + Math.random() * 900)}`;

    onAddVoucher({
      voucherNumber: voucherNum,
      type,
      date,
      partyType: type === 'receipt' ? 'grocery' : 'supplier',
      partyId,
      partyName,
      partyCode,
      amount,
      paymentMethod,
      referenceNumber: referenceNumber || (paymentMethod === 'cash' ? 'نقداً بالصندوق' : 'تحويل'),
      notes: notes || (type === 'receipt' ? 'دفعة سداد من حساب البقالة' : 'سداد مستحقات توريد'),
      createdBy: 'مدير الحسابات',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0c2461] text-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#f6b93b]" />
            <h3 className="font-bold text-base md:text-lg">تسجيل سند مالي جديد</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Voucher Type Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">نوع السند</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('receipt');
                  setPartyId(groceries[0]?.id || '');
                }}
                className={`py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                  type === 'receipt'
                    ? 'bg-[#009432] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سند قبض (من بقالة)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('payment');
                  setPartyId(suppliers[0]?.id || '');
                }}
                className={`py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                  type === 'payment'
                    ? 'bg-[#0c2461] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سند صرف (لمورد)
              </button>
            </div>
          </div>

          {/* Party Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {type === 'receipt' ? 'البقالة (المسدد)' : 'المورد (المستفيد)'}
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
              required
            >
              {type === 'receipt'
                ? groceries.map((g) => (
                    <option key={g.id} value={g.id}>
                      ({g.code}) {g.name} - الرصيد الحالي: {g.balance.toLocaleString()} ر.ي
                    </option>
                  ))
                : suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - المستحق له: {s.balance.toLocaleString()} ر.ي
                    </option>
                  ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">المبلغ (ريال)</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-base font-bold font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">تاريخ السند</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-[#009432] bg-[#009432]/10 text-[#009432]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                نقداً (كاش)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'border-[#1e3799] bg-[#1e3799]/10 text-[#1e3799]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                تحويل بنكي
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('check')}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  paymentMethod === 'check'
                    ? 'border-[#f6b93b] bg-[#f6b93b]/10 text-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                شيك
              </button>
            </div>
          </div>

          {/* Reference / Check No */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">رقم الحوالة / الشيك / المرجع</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="مثال: TRX-992140 أو شيك 4012"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">البيان / ملاحظات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="وذلك عن سداد..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2 text-sm font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              حفظ وترحيل السند
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
