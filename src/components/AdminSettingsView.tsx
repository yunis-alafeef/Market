import React, { useState } from 'react';
import {
  SystemSettings,
  Grocery,
  Supplier,
  AuditLog,
} from '../types';
import {
  Settings,
  Shield,
  Store,
  Truck,
  FileText,
  Clock,
  Plus,
  Trash2,
  Check,
  Edit2,
  Save,
  RotateCcw,
  Search,
  Sliders,
} from 'lucide-react';

interface AdminSettingsViewProps {
  settings: SystemSettings;
  groceries: Grocery[];
  suppliers: Supplier[];
  auditLogs: AuditLog[];
  onUpdateSettings: (settings: SystemSettings) => void;
  onAddGrocery: (grocery: Omit<Grocery, 'id' | 'balance' | 'active'>) => void;
  onUpdateGrocery: (grocery: Grocery) => void;
  onDeleteGrocery: (id: string) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'balance' | 'active'>) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onResetData: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  groceries,
  suppliers,
  auditLogs,
  onUpdateSettings,
  onAddGrocery,
  onUpdateGrocery,
  onDeleteGrocery,
  onAddSupplier,
  onUpdateSupplier,
  onResetData,
}) => {
  // Tabs: 'permissions' | 'groceries' | 'suppliers' | 'invoice_header' | 'audit_log'
  const [activeTab, setActiveTab] = useState<
    'permissions' | 'groceries' | 'suppliers' | 'invoice_header' | 'audit_log'
  >('permissions');

  // Form states for new grocery
  const [newGCode, setNewGCode] = useState('');
  const [newGName, setNewGName] = useState('');
  const [newGPhone, setNewGPhone] = useState('');
  const [newGOwner, setNewGOwner] = useState('');
  const [newGLimit, setNewGLimit] = useState(5000);
  const [showAddGBulk, setShowAddGBulk] = useState(false);

  // Form states for header & branding
  const [brandForm, setBrandForm] = useState(settings);

  // Search in audit logs
  const [auditSearch, setAuditSearch] = useState('');

  // Permission Toggle Helper
  const handleTogglePermission = (key: keyof SystemSettings['permissions']) => {
    const updated: SystemSettings = {
      ...settings,
      permissions: {
        ...settings.permissions,
        [key]: !settings.permissions[key],
      },
    };
    onUpdateSettings(updated);
  };

  // Submit New Grocery
  const handleCreateGrocery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGCode.trim() || !newGName.trim()) return;

    onAddGrocery({
      code: newGCode.trim(),
      name: newGName.trim(),
      phone: newGPhone.trim() || '0500000000',
      ownerName: newGOwner.trim() || 'مالك البقالة',
      creditLimit: Number(newGLimit) || 5000,
      pin: `${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setNewGCode('');
    setNewGName('');
    setNewGPhone('');
    setNewGOwner('');
    setShowAddGBulk(false);
  };

  // Save Branding Header
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(brandForm);
    alert('✅ تم حفظ إعدادات وترويسة الفاتورة الرسمية بنجاح!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0c2461]/10 text-[#0c2461] flex items-center justify-center shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">إعدادات النظام والرقابة المتقدمة</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مفاتيح صلاحيات العامل الميداني، إدارة البقالات والأعمدة التلقائية، ترويسة الفواتير وسجل التدقيق الزمني.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm('هل تود استعادة البيانات الافتراضية للتطبيق والتجربة؟')) {
              onResetData();
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة البيانات الافتراضية</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-1 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Shield className="w-4 h-4 text-[#f6b93b]" />
            صلاحيات العامل
          </button>

          <button
            onClick={() => setActiveTab('groceries')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'groceries'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Store className="w-4 h-4 text-[#f6b93b]" />
            إدارة البقالات ({groceries.length})
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Truck className="w-4 h-4 text-[#f6b93b]" />
            إدارة الموردين ({suppliers.length})
          </button>

          <button
            onClick={() => setActiveTab('invoice_header')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'invoice_header'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4 text-[#f6b93b]" />
            ترويسة الفواتير وPDF
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'audit_log'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-4 h-4 text-[#f6b93b]" />
            سجل التدقيق (Audit Log)
          </button>
        </div>

        {/* TAB 1: WORKER PERMISSION TOGGLES */}
        {activeTab === 'permissions' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                مفاتيح التبديل الفورية لصلاحيات العامل الميداني
              </h3>
              <p className="text-xs text-slate-500">
                التحكم بالصلاحيات التشغيلية للعامل الميداني في شاشة إدخال اليومية والطلبات.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle 1: Add Supplier */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    السماح للعامل بإضافة مورد جديد
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    إظهار زر (+ مورد جديد) في كشف اليومية لتمكين العامل من تسجيل مورد طارئ بالسوق.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePermission('workerCanAddSupplier')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.permissions.workerCanAddSupplier ? 'bg-[#009432]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.permissions.workerCanAddSupplier ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Add Item */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    السماح للعامل بإضافة صنف خضار جديد
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    تمكين العامل من إضافة أصناف إضافية غير العشرة الأساسية مثل الورقيات والفاكهة.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePermission('workerCanAddItem')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.permissions.workerCanAddItem ? 'bg-[#009432]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.permissions.workerCanAddItem ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Edit Prices */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    السماح للعامل بتعديل أسعار الشراء والبيع
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    عند التفعيل، يمكن للعامل كتابة سعر الشراء الفعلي وسعر البيع للبقالة في كل سطر.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePermission('workerCanEditPrices')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.permissions.workerCanEditPrices ? 'bg-[#009432]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.permissions.workerCanEditPrices ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: View Cost Price */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    إظهار أسعار وتكلفة الشراء للعامل الميداني
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    إلغاء التفعيل يحجب عمود سعر الشراء والتكلفة الإجمالية عن العامل لحفظ سرية التكاليف.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePermission('workerCanViewPurchaseCost')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.permissions.workerCanViewPurchaseCost ? 'bg-[#009432]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.permissions.workerCanViewPurchaseCost ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 5: Lock after Save */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 md:col-span-2">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    قفل تعديل اليومية فور النقر على "حفظ طلبات الليل"
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    تجميد الكشف ومنع أي تعديل لاحق على الكميات إلا عبر شاشة "التعديل الشامل للمدير".
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePermission('lockDailySheetAfterSave')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    settings.permissions.lockDailySheetAfterSave ? 'bg-[#009432]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.permissions.lockDailySheetAfterSave ? '-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GROCERIES MANAGEMENT (إدارة البقالات وتوليد الأعمدة) */}
        {activeTab === 'groceries' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  إدارة البقالات الشريكة (توليد الأعمدة التلقائي)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أي بقالة تضاف هنا ستولد عمود كمية جديداً تلقائياً في شاشة العامل، وتضاف إلى جداول فرز الصباح!
                </p>
              </div>

              <button
                onClick={() => setShowAddGBulk(!showAddGBulk)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                + إضافة بقالة جديدة (عمود جديد)
              </button>
            </div>

            {/* Add Grocery Box */}
            {showAddGBulk && (
              <form
                onSubmit={handleCreateGrocery}
                className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-4"
              >
                <div className="text-xs font-bold text-[#0c2461]">
                  بيانات البقالة الجديدة (ستولد عمود إدخال فوري في الكشف):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      رمز العمود (حرف واحد أو اثنين) *
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      required
                      placeholder="مثال: ن، ف، د"
                      value={newGCode}
                      onChange={(e) => setNewGCode(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-bold text-center bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      اسم البقالة الكامل *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تموينات النور الحديثة"
                      value={newGName}
                      onChange={(e) => setNewGName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">اسم المالك</label>
                    <input
                      type="text"
                      placeholder="الاسم"
                      value={newGOwner}
                      onChange={(e) => setNewGOwner(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">رقم الجوال</label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={newGPhone}
                      onChange={(e) => setNewGPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGBulk(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#009432] hover:bg-[#007b29] rounded-lg shadow-xs"
                  >
                    حفظ وتوليد العمود
                  </button>
                </div>
              </form>
            )}

            {/* Groceries Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 text-center w-16">الرمز</th>
                    <th className="p-3">اسم البقالة</th>
                    <th className="p-3">صاحب البقالة</th>
                    <th className="p-3">رقم التواصل</th>
                    <th className="p-3 text-center">الرصيد الحالي</th>
                    <th className="p-3 text-center">رمز الدخول (PIN)</th>
                    <th className="p-3 text-center w-20">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {groceries.map((g) => (
                    <tr key={g.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 text-center">
                        <span className="w-8 h-8 rounded-lg bg-[#f6b93b] text-[#0c2461] font-black text-sm inline-flex items-center justify-center">
                          {g.code}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{g.name}</td>
                      <td className="p-2.5 text-slate-700">{g.ownerName}</td>
                      <td className="p-2.5 font-mono text-slate-600">{g.phone}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-[#0c2461] tabular-nums">
                        {g.balance.toLocaleString()} ر.س
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500 bg-slate-100/60 rounded">
                        {g.pin}
                      </td>
                      <td className="p-2.5 text-center">
                        {groceries.length > 2 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف بقالة (${g.name})؟`)) {
                                onDeleteGrocery(g.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف البقالة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SUPPLIERS MANAGEMENT */}
        {activeTab === 'suppliers' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  إدارة الموردين والمزارع المعتمدة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  قائمة الموردين المعتمدين للشراء اليومي بالسوق مع تتبع مستحقاتهم وأرقام التواصل.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">اسم المورد / المزرعة</th>
                    <th className="p-3">التخصص والمنتجات</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3 text-center">المستحقات (له)</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                      <td className="p-2.5 text-slate-600">{s.specialty}</td>
                      <td className="p-2.5 font-mono text-slate-600">{s.phone}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-600 tabular-nums">
                        {s.balance.toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INVOICE BRANDING & HEADER */}
        {activeTab === 'invoice_header' && (
          <form onSubmit={handleSaveBranding} className="p-6 space-y-4 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                تخصيص ترويسة وتذييل الفواتير وكشوف الحساب (PDF)
              </h3>
              <p className="text-xs text-slate-500">
                هذه البيانات ستظهر تلقائياً في الترويسة الرسمية لكافة الفواتير وسندات القبض وكشوفات الفرز عند الطباعة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المؤسسة / المتجر</label>
                <input
                  type="text"
                  value={brandForm.businessName}
                  onChange={(e) => setBrandForm({ ...brandForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف الفرعي / السجل</label>
                <input
                  type="text"
                  value={brandForm.businessSubname}
                  onChange={(e) => setBrandForm({ ...brandForm, businessSubname: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">أرقام التواصل والهاتف</label>
                <input
                  type="text"
                  value={brandForm.phone}
                  onChange={(e) => setBrandForm({ ...brandForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">السجل التجاري والضريبي</label>
                <input
                  type="text"
                  value={brandForm.taxOrRegNumber}
                  onChange={(e) => setBrandForm({ ...brandForm, taxOrRegNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان والموقع</label>
                <input
                  type="text"
                  value={brandForm.address}
                  onChange={(e) => setBrandForm({ ...brandForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">شروط وملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  value={brandForm.invoiceNotes}
                  onChange={(e) => setBrandForm({ ...brandForm, invoiceNotes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">تذييل الفاتورة</label>
                <input
                  type="text"
                  value={brandForm.invoiceFooter}
                  onChange={(e) => setBrandForm({ ...brandForm, invoiceFooter: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                حفظ تعديلات الترويسة والفاتورة
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: AUDIT LOG (سجل التدقيق الزمني) */}
        {activeTab === 'audit_log' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  سجل التدقيق والرقابة الشامل (Audit Trail)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تسجيل زمني دقيق لكل حركة مع التاريخ والساعة والدقيقة واسم المستخدم والقيم السابقة والجديدة.
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في الحركات..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 w-36 font-bold">التوقيت والوقت</th>
                    <th className="p-3 font-bold">المستخدم والصفة</th>
                    <th className="p-3 font-bold">نوع العملية</th>
                    <th className="p-3 font-bold">الهدف / الحقل</th>
                    <th className="p-3 font-bold">القيمة السابقة</th>
                    <th className="p-3 font-bold">القيمة الجديدة</th>
                    <th className="p-3 font-bold">التفاصيل والبيان</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs
                    .filter(
                      (log) =>
                        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        log.user.toLowerCase().includes(auditSearch.toLowerCase())
                    )
                    .map((log) => (
                      <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">{log.user}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-[#0c2461]">{log.action}</span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-700">{log.target}</td>
                        <td className="p-2.5 font-mono text-xs text-rose-600 line-through">
                          {log.oldValue || '-'}
                        </td>
                        <td className="p-2.5 font-mono text-xs text-[#009432] font-semibold">
                          {log.newValue || '-'}
                        </td>
                        <td className="p-2.5 text-xs text-slate-500 max-w-xs">{log.details || '-'}</td>
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
