import React, { useState } from 'react';
import { X, Plus, Package } from 'lucide-react';
import { VegetableItem } from '../types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<VegetableItem, 'id'>) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onAddItem }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('سلة');
  const [defaultCostPrice, setDefaultCostPrice] = useState<number>(0);
  const [defaultSalePrice, setDefaultSalePrice] = useState<number>(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddItem({
      name: name.trim(),
      unit,
      defaultCostPrice: Number(defaultCostPrice) || 0,
      defaultSalePrice: Number(defaultSalePrice) || 0,
    });
    setName('');
    setDefaultCostPrice(0);
    setDefaultSalePrice(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0c2461] text-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#f6b93b]" />
            <h3 className="font-bold text-base">إضافة صنف خضار جديد</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">اسم الصنف</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: طماط، بطاطس، بصل..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">الوحدة الافتراضية</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
            >
              <option value="سلة">سلة</option>
              <option value="شوال">شوال</option>
              <option value="كرتون">كرتون</option>
              <option value="كيس">كيس</option>
              <option value="صندوق">صندوق</option>
              <option value="كيلو">كيلو</option>
              <option value="حزمة">حزمة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">سعر الشراء الافتراضي (سعر التكلفة)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={defaultCostPrice === 0 ? '' : defaultCostPrice}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDefaultCostPrice(val);
                setDefaultSalePrice(val);
              }}
              placeholder="0 (يحدده العامل أثناء الشراء)"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none tabular-nums"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              * الافتراضي 0، ويقوم العامل بتحديد سعر الشراء الفعلي قبل ترحيل الكشف.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#006266] hover:bg-[#004e51] rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة الصنف للكشف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
