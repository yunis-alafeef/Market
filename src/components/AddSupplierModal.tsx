import React, { useState } from 'react';
import { X, Plus, Truck } from 'lucide-react';
import { Supplier } from '../types';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'balance' | 'active'>) => void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ isOpen, onClose, onAddSupplier }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddSupplier({
      name: name.trim(),
      phone: phone.trim(),
      specialty: specialty.trim() || 'خضروات مشكلة عامة',
    });
    setName('');
    setPhone('');
    setSpecialty('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0c2461] text-white">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#f6b93b]" />
            <h3 className="font-bold text-base">إضافة مورد جديد للقائمة</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">اسم المورد / المزرعة</label>
            <input
              type="text"
              required
              placeholder="مثال: مزارع اليمامة، مورد الخيار أبو فهد..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الهاتف / الجوال</label>
            <input
              type="tel"
              placeholder="05xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">التخصص / نوع الأصناف الموردة</label>
            <input
              type="text"
              placeholder="مثال: طماط محمي، بطاط وبصل، حمضيات..."
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3799] focus:outline-none"
            />
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
              حفظ المورد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
