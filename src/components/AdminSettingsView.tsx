import React, { useState, useEffect } from 'react';
import {
  SystemSettings,
  Grocery,
  Supplier,
  AuditLog,
  UserAccount,
  ThemeId,
} from '../types';
import { AuthService } from '../services/auth';
import { extractTime12 } from '../services/storage';
import { THEMES } from './ThemeSwitcher';
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
  Save,
  RotateCcw,
  Search,
  Sliders,
  Users,
  Smartphone,
  Key,
  Database,
  ExternalLink,
  Copy,
  Palette,
  Sparkles,
  Edit3,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminSettingsViewProps {
  settings: SystemSettings;
  groceries: Grocery[];
  suppliers: Supplier[];
  auditLogs: AuditLog[];
  currentUser?: UserAccount | null;
  onSessionUserUpdated?: (updatedUser: UserAccount) => void;
  onAddAuditLog?: (
    action: string,
    target: string,
    oldValue?: string,
    newValue?: string,
    details?: string
  ) => void;
  currentTheme?: ThemeId;
  onThemeChange?: (theme: ThemeId) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onAddGrocery: (grocery: Omit<Grocery, 'id' | 'balance' | 'active'>) => void;
  onUpdateGrocery: (grocery: Grocery) => void;
  onDeleteGrocery: (id: string) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'balance' | 'active'>) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onResetData: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  groceries,
  suppliers,
  auditLogs,
  currentUser,
  onSessionUserUpdated,
  onAddAuditLog,
  currentTheme = 'royal_navy',
  onThemeChange,
  onUpdateSettings,
  onAddGrocery,
  onUpdateGrocery,
  onDeleteGrocery,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onResetData,
}) => {
  // Tabs: 'users' | 'permissions' | 'groceries' | 'suppliers' | 'invoice_header' | 'themes' | 'audit_log' | 'supabase'
  const [activeTab, setActiveTab] = useState<
    'users' | 'permissions' | 'groceries' | 'suppliers' | 'invoice_header' | 'themes' | 'audit_log' | 'supabase'
  >('users');

  // User Accounts State
  const effectiveAdmin = currentUser || AuthService.getCurrentSession()?.user || null;
  const [usersList, setUsersList] = useState<UserAccount[]>(() => AuthService.getUsers());
  useEffect(() => {
    AuthService.pullUsersFromCloud().then(setUsersList).catch(() => {});
  }, []);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'worker' | 'grocery'>('worker');
  const [newUserGroceryId, setNewUserGroceryId] = useState<string>(groceries[0]?.id || '');
  const [newUserPin, setNewUserPin] = useState('');

  // Edit User Credentials & Role State (Admin-only)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<'admin' | 'worker' | 'grocery'>('worker');
  const [editGroceryId, setEditGroceryId] = useState<string>('');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);
  const [userMgmtSuccessMsg, setUserMgmtSuccessMsg] = useState<string | null>(null);
  const [userMgmtErrorMsg, setUserMgmtErrorMsg] = useState<string | null>(null);

  // Form states for new grocery
  const [newGCode, setNewGCode] = useState('');
  const [newGName, setNewGName] = useState('');
  const [newGPhone, setNewGPhone] = useState('');
  const [newGOwner, setNewGOwner] = useState('');
  const [newGLimit, setNewGLimit] = useState(500000);
  const [showAddGBulk, setShowAddGBulk] = useState(false);

  // Form states for new supplier
  const [newSName, setNewSName] = useState('');
  const [newSPhone, setNewSPhone] = useState('');
  const [newSSpecialty, setNewSSpecialty] = useState('');
  const [showAddSBulk, setShowAddSBulk] = useState(false);

  // Form states for header & branding
  const [brandForm, setBrandForm] = useState(settings);

  // Search in audit logs
  const [auditSearch, setAuditSearch] = useState('');

  const getRoleLabelAr = (r: 'admin' | 'worker' | 'grocery') =>
    r === 'admin'
      ? 'مدير النظام (Admin)'
      : r === 'worker'
      ? 'العامل الميداني (Worker)'
      : 'صاحب البقالة (Store Owner)';

  // Select user to edit credentials & role (never pre-fills old password)
  const handleSelectUserToEdit = (u: UserAccount) => {
    setUserMgmtErrorMsg(null);
    setUserMgmtSuccessMsg(null);
    setEditingUser(u);
    const displayOrUsername =
      u.username && u.username !== u.phone ? u.username : u.name;
    setEditUsername(displayOrUsername);
    setEditUserId(u.phone || u.id);
    setEditPassword('');
    setShowEditPassword(false);
    setEditRole(u.role);
    setEditGroceryId(u.groceryId || groceries[0]?.id || '');
    setEditActive(u.active);
  };

  // Generate a temporary password in the edit form and reveal it for the Admin to review
  const handleGenerateTempPassword = () => {
    const tempPass = AuthService.generateTemporaryPassword();
    setEditPassword(tempPass);
    setShowEditPassword(true);
  };

  // Save edited user credentials & role (Admin-only)
  const handleSaveUserCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserMgmtErrorMsg(null);
    setUserMgmtSuccessMsg(null);

    if (editRole === 'grocery' && !editGroceryId.trim()) {
      setUserMgmtErrorMsg(
        '⚠️ لا يمكن حفظ حساب بصلاحية "صاحب البقالة" دون تحديد البقالة المرتبطة به.'
      );
      return;
    }

    setIsSavingUserEdit(true);

    try {
      const res = await AuthService.updateUserCredentials({
        actorUser: effectiveAdmin,
        targetOriginalId: editingUser.id,
        newUsername: editUsername,
        newUserId: editUserId,
        newPassword: editPassword,
        newDisplayName: editUsername,
        newRole: editRole,
        newGroceryId: editRole === 'grocery' ? editGroceryId : editingUser.groceryId,
        newActive: editActive,
      });

      if (!res.success || !res.user) {
        setUserMgmtErrorMsg(res.error || '⚠️ حدث خطأ أثناء حفظ تعديلات المستخدم.');
        setIsSavingUserEdit(false);
        return;
      }

      const refreshed = AuthService.getUsers();
      setUsersList(refreshed);

      if (
        onSessionUserUpdated &&
        effectiveAdmin &&
        (effectiveAdmin.id === editingUser.id || effectiveAdmin.id === res.user.id)
      ) {
        onSessionUserUpdated(res.user);
      }

      const linkedGName =
        res.user.role === 'grocery'
          ? groceries.find((g) => g.id === res.user?.groceryId)?.name || res.user.groceryId
          : '-';

      if (onAddAuditLog) {
        onAddAuditLog(
          'تعديل بيانات وصلاحيات حساب مستخدم',
          `المستخدم: ${res.user.name}`,
          `الاسم: ${editingUser.name} | الرقم: ${editingUser.phone} | الصلاحية: ${getRoleLabelAr(editingUser.role)} | الحالة: ${editingUser.active ? 'نشط' : 'غير نشط'}`,
          `الاسم: ${res.user.name} | الرقم: ${res.user.phone} | الصلاحية: ${getRoleLabelAr(res.user.role)}${res.user.role === 'grocery' ? ` (${linkedGName})` : ''} | الحالة: ${res.user.active ? 'نشط' : 'غير نشط'}${editPassword.trim() ? ' | تم تعيين كلمة مرور جديدة مشفرة' : ''}`,
          `قام المدير (${effectiveAdmin?.name || 'مدير النظام'}) بتحديث بيانات وصلاحيات الحساب (${res.user.id}).`
        );
      }

      const assignedPassNotice = editPassword.trim()
        ? ` | كلمة المرور الجديدة التي قمت بتعيينها: [${editPassword.trim()}] (تم تشفيرها وحفظ بصمتها الآمنة)`
        : '';

      setUserMgmtSuccessMsg(
        `✅ تم حفظ تعديلات المستخدم بنجاح! (اسم المستخدم: ${res.user.name} | رقم المستخدم: ${res.user.phone} | الصلاحية: ${getRoleLabelAr(res.user.role)}${res.user.role === 'grocery' ? ` - ${linkedGName}` : ''} | الحالة: ${res.user.active ? 'نشط' : 'غير نشط'}${assignedPassNotice})`
      );
      setEditingUser(null);
      setEditPassword('');
    } catch (err) {
      setUserMgmtErrorMsg((err as any)?.message || '⚠️ حدث خطأ غير متوقع أثناء الحفظ.');
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  // Handle Add New User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserMgmtErrorMsg(null);
    setUserMgmtSuccessMsg(null);

    if (!newUserName.trim() || !newUserPhone.trim()) {
      setUserMgmtErrorMsg('⚠️ يرجى إدخال اسم المستخدم ورقم المستخدم / الهاتف.');
      return;
    }

    const cleanName = newUserName.trim();
    const cleanPhone = newUserPhone.trim().replace(/\s+/g, '').replace(/^0+/, '');
    const effectivePin = newUserPin.trim() || cleanPhone;

    // Validate duplicate username or phone/ID
    const existingUsers = AuthService.getUsers();
    const duplicateName = existingUsers.find(
      (u) =>
        u.name.trim().toLowerCase() === cleanName.toLowerCase() ||
        u.username.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      setUserMgmtErrorMsg(
        `⚠️ رفض الإضافة: اسم المستخدم "${cleanName}" موجود مسبقاً في النظام.`
      );
      return;
    }

    const duplicatePhone = existingUsers.find(
      (u) =>
        u.phone.replace(/\s+/g, '').replace(/^0+/, '').toLowerCase() === cleanPhone.toLowerCase() ||
        u.id.trim().toLowerCase() === cleanPhone.toLowerCase()
    );
    if (duplicatePhone) {
      setUserMgmtErrorMsg(
        `⚠️ رفض الإضافة: رقم المستخدم "${cleanPhone}" مسجل مسبقاً لحساب آخر (${duplicatePhone.name}).`
      );
      return;
    }

    try {
      const created = AuthService.addUser(
        {
          name: cleanName,
          phone: cleanPhone,
          countryCode: '+967',
          username: cleanName,
          role: newUserRole,
          pin: effectivePin,
          groceryId: newUserRole === 'grocery' ? newUserGroceryId : undefined,
          avatarBadge: cleanName.charAt(0),
          active: true,
        },
        effectiveAdmin
      );

      setUsersList(AuthService.getUsers());
      setNewUserName('');
      setNewUserPhone('');
      setNewUserPin('');
      setShowAddUserModal(false);
      setUserMgmtSuccessMsg(
        `✅ تم إنشاء حساب جديد بنجاح: ${created.name} (رقم المستخدم: ${created.phone})`
      );
    } catch (err) {
      setUserMgmtErrorMsg((err as any)?.message || '⚠️ فشل إنشاء الحساب');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === 'usr_admin_younis' || userId === 'usr_admin_mohannad') {
      setUserMgmtErrorMsg('⚠️ لا يمكن حذف حسابات مدراء النظام الرئيسيين!');
      return;
    }
    if (window.confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      AuthService.deleteUser(userId, effectiveAdmin);
      setUsersList(AuthService.getUsers());
      if (editingUser?.id === userId) {
        setEditingUser(null);
      }
      setUserMgmtSuccessMsg('✅ تم حذف الحساب بنجاح.');
    }
  };

  const handleToggleUserStatus = (user: UserAccount) => {
    if (user.id === 'usr_admin_younis') return;
    try {
      const updated = { ...user, active: !user.active };
      AuthService.updateUser(updated, effectiveAdmin);
      setUsersList(AuthService.getUsers());
    } catch (err) {
      setUserMgmtErrorMsg((err as any)?.message || '⚠️ غير مصرح');
    }
  };

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
      phone: newGPhone.trim() || '770000000',
      ownerName: newGOwner.trim() || 'مالك البقالة',
      creditLimit: Number(newGLimit) || 500000,
      pin: `${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setNewGCode('');
    setNewGName('');
    setNewGPhone('');
    setNewGOwner('');
    setShowAddGBulk(false);
  };

  // Submit New Supplier
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSName.trim()) return;
    onAddSupplier({
      name: newSName.trim(),
      phone: newSPhone.trim() || '770000000',
      specialty: newSSpecialty.trim() || 'خضروات وفواكه عامة',
    });
    setNewSName('');
    setNewSPhone('');
    setNewSSpecialty('');
    setShowAddSBulk(false);
  };

  // Save Branding Header
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(brandForm);
    alert('✅ تم حفظ ترويسة وبيانات المؤسسة بنجاح!');
  };

  // Strict Admin Access Protection
  if (!effectiveAdmin || effectiveAdmin.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-center space-y-3">
        <Lock className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-lg font-black text-rose-900">
          ⛔ غير مصرح بالوصول إلى واجهة إدارة الحسابات والإعدادات
        </h2>
        <p className="text-xs font-bold text-rose-700">
          هذه الواجهة مخصصة لمدير النظام فقط. لا يملك العامل أو المستخدم العادي صلاحية الوصول أو تعديل الحسابات.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0c2461]/10 text-[#0c2461] flex items-center justify-center shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">إعدادات النظام والرقابة المتقدمة</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة حسابات المستخدمين بواسطة المدير، صلاحيات العمال، إدارة البقالات، والربط مع Supabase.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm('هل تود استعادة البيانات الافتراضية النظيفة للتطبيق؟')) {
              onResetData();
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة الضبط النظيف</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-1 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-4 h-4 text-[#f6b93b]" />
            إدارة الحسابات والمستخدمين ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
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
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
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
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
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
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'invoice_header'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText className="w-4 h-4 text-[#f6b93b]" />
            ترويسة الفاتورة
          </button>

          <button
            onClick={() => setActiveTab('themes')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'themes'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Palette className="w-4 h-4 text-[#f6b93b]" />
            ثيمات وألوان النظام
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'bg-[#009432] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-200" />
            دليل Supabase و Vercel
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'audit_log'
                ? 'bg-[#0c2461] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock className="w-4 h-4 text-[#f6b93b]" />
            سجل التدقيق
          </button>
        </div>

        {/* TAB 1: USER ACCOUNTS CREATED BY ADMIN */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  إدارة حسابات المستخدمين وصلاحيات تعديل بيانات الدخول (خاص بالمدير فقط)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكنك عرض المستخدمين المسجلين وتعديل اسم المستخدم أو رقم المستخدم أو تعيين كلمة مرور جديدة مشفرة لأي حساب.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(!showAddUserModal);
                  setUserMgmtErrorMsg(null);
                  setUserMgmtSuccessMsg(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء حساب مستخدم جديد</span>
              </button>
            </div>

            {/* Success & Error Alert Messages */}
            {userMgmtSuccessMsg && (
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#009432] shrink-0" />
                  <span>{userMgmtSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserMgmtSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-950 px-2 py-0.5 rounded font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {userMgmtErrorMsg && (
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{userMgmtErrorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserMgmtErrorMsg(null)}
                  className="text-rose-700 hover:text-rose-950 px-2 py-0.5 rounded font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Edit Selected User Credentials & Permissions Panel */}
            {editingUser && (
              <form
                onSubmit={handleSaveUserCredentials}
                className="bg-amber-50/70 p-5 rounded-2xl border-2 border-[#0c2461]/25 space-y-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0c2461] text-white flex items-center justify-center">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#0c2461]">
                        نموذج تعديل بيانات وصلاحيات المستخدم المحدد
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        تعديل اسم المستخدم، رقم المستخدم، كلمة المرور الجديدة، صلاحية الحساب، البقالة المرتبطة، وحالة الحساب.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0c2461]/10 text-[#0c2461]">
                    الصلاحية الحالية: {getRoleLabelAr(editingUser.role)}
                  </span>
                </div>

                {/* Current User Info Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">اسم المستخدم الحالي:</span>
                    <span className="font-black text-slate-900">{editingUser.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">رقم المستخدم الحالي (User ID):</span>
                    <span className="font-mono font-bold text-[#0c2461] dir-ltr inline-block">
                      {editingUser.phone || editingUser.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">الصلاحية وحالة الحساب الحالية:</span>
                    <span className="font-bold text-slate-800">
                      {getRoleLabelAr(editingUser.role)} ({editingUser.active ? 'نشط' : 'غير نشط'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">كلمة المرور المخزنة:</span>
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> محمية بـ Hash (لا تُعرض القديمة)
                    </span>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      اسم المستخدم (Username) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل اسم المستخدم"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0c2461]"
                    />
                  </div>

                  {/* 2. User ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      رقم المستخدم (User ID) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم المستخدم"
                      value={editUserId}
                      onChange={(e) => setEditUserId(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0c2461]"
                    />
                  </div>

                  {/* 3. New Password with Eye Toggle + Generate Temporary Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        كلمة المرور الجديدة (Password)
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateTempPassword}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-[#0c2461] bg-[#0c2461]/10 hover:bg-[#0c2461] hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="إنشاء كلمة مرور مؤقتة وإظهارها للمراجعة قبل الحفظ"
                      >
                        <Key className="w-3 h-3" />
                        <span>إنشاء كلمة مرور مؤقتة</span>
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full px-3 py-2.5 pl-9 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0c2461]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute left-2.5 text-slate-500 hover:text-[#0c2461] cursor-pointer"
                        title={showEditPassword ? 'إخفاء كلمة المرور الجديدة' : 'إظهار كلمة المرور الجديدة للمراجعة'}
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {editPassword.trim()
                        ? showEditPassword
                          ? `كلمة المرور الجديدة المرئية للمدير قبل الحفظ: ${editPassword.trim()}`
                          : 'اضغط على أيقونة العين لمراجعة كلمة المرور الجديدة قبل الحفظ.'
                        : 'يتم تشفير كلمة المرور الجديدة بآلية Hash الآمنة بعد الحفظ.'}
                    </span>
                  </div>

                  {/* 4. User Role (صلاحية المستخدم) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      صلاحية المستخدم (Role) *
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => {
                        const nextRole = e.target.value as 'admin' | 'worker' | 'grocery';
                        setEditRole(nextRole);
                      }}
                      className="w-full px-3 py-2.5 text-xs font-bold text-[#0c2461] bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0c2461]"
                    >
                      <option value="admin">مدير النظام (Admin)</option>
                      <option value="worker">العامل الميداني (Worker)</option>
                      <option value="grocery">صاحب البقالة (Store Owner)</option>
                    </select>
                  </div>

                  {/* 5. Linked Grocery (البقالة المرتبطة به - يظهر عند اختيار صاحب البقالة) */}
                  {editRole === 'grocery' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        البقالة المرتبطة به *
                      </label>
                      <select
                        required
                        value={editGroceryId}
                        onChange={(e) => setEditGroceryId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-bold text-[#0c2461] bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0c2461]"
                      >
                        <option value="">-- اختر البقالة المرتبطة بالحساب --</option>
                        {groceries.map((g) => (
                          <option key={g.id} value={g.id}>
                            ({g.code}) {g.name} - {g.ownerName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 6. Account Status (حالة الحساب: نشط / غير نشط) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      حالة الحساب (نشط / غير نشط) *
                    </label>
                    <select
                      value={editActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditActive(e.target.value === 'active')}
                      className={`w-full px-3 py-2.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0c2461] ${
                        editActive ? 'text-[#009432]' : 'text-rose-700'
                      }`}
                    >
                      <option value="active">نشط (مفعل للدخول)</option>
                      <option value="inactive">غير نشط (معطل)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setEditPassword('');
                      setUserMgmtErrorMsg(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUserEdit}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#009432] hover:bg-[#007b29] disabled:opacity-60 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingUserEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Create User Form Box */}
            {showAddUserModal && (
              <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-2xl border border-slate-300 space-y-4">
                <div className="text-xs font-bold text-[#0c2461]">
                  بيانات المستخدم الجديد (مدير، عامل ميداني، أو صاحب بقالة):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">اسم المستخدم (Username) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد العمري"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">رقم المستخدم / الهاتف (User ID) *</label>
                    <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
                      <span className="px-2 py-2 bg-slate-100 font-mono text-[11px] font-bold text-slate-600 border-l border-slate-300">
                        +967
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="77xxxxxxx"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        className="w-full px-2 py-2 text-xs font-mono bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">صلاحية المستخدم (Role) *</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'worker' | 'grocery')}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none font-bold text-[#0c2461]"
                    >
                      <option value="admin">مدير النظام (Admin)</option>
                      <option value="worker">العامل الميداني (Worker)</option>
                      <option value="grocery">صاحب البقالة (Store Owner)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">كلمة المرور (Password)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const temp = AuthService.generateTemporaryPassword();
                          setNewUserPin(temp);
                          setShowNewUserPassword(true);
                        }}
                        className="text-[10px] font-bold text-[#0c2461] hover:underline cursor-pointer"
                      >
                        إنشاء مؤقتة
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        maxLength={32}
                        placeholder="اتركه فارغاً ليصبح رقم المستخدم تلقائياً"
                        value={newUserPin}
                        onChange={(e) => setNewUserPin(e.target.value)}
                        className="w-full px-3 py-2 pl-8 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute left-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showNewUserPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showNewUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {newUserRole === 'grocery' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">البقالة المرتبطة به *</label>
                      <select
                        value={newUserGroceryId}
                        onChange={(e) => setNewUserGroceryId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none font-bold text-[#0c2461]"
                      >
                        {groceries.map((g) => (
                          <option key={g.id} value={g.id}>
                            ({g.code}) {g.name} - {g.ownerName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 text-xs font-bold text-white bg-[#009432] hover:bg-[#007b29] rounded-xl shadow-xs"
                  >
                    حفظ وإنشاء الحساب
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 font-bold">اسم المستخدم (Username)</th>
                    <th className="p-3 font-bold">رقم المستخدم (User ID)</th>
                    <th className="p-3 font-bold">الصلاحية</th>
                    <th className="p-3 font-bold">البقالة المرتبطة</th>
                    <th className="p-3 text-center font-bold">كلمة المرور</th>
                    <th className="p-3 text-center font-bold">الحالة</th>
                    <th className="p-3 text-center font-bold w-40">إجراءات التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const linkedGrocery = groceries.find((g) => g.id === u.groceryId);
                    const isMainAdmin = u.id === 'usr_admin_younis' || u.id === 'usr_admin_mohannad' || u.role === 'admin';
                    const isBeingEdited = editingUser?.id === u.id;

                    return (
                      <tr
                        key={u.id}
                        className={`border-b border-slate-200 transition-colors ${
                          isBeingEdited ? 'bg-amber-50/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-[#0c2461] font-black flex items-center justify-center text-xs">
                              {u.avatarBadge}
                            </span>
                            <div>
                              <span className="block">{u.name}</span>
                              {u.username && u.username !== u.name && u.username !== u.phone && (
                                <span className="text-[11px] font-mono text-slate-500 block">
                                  @{u.username}
                                </span>
                              )}
                            </div>
                            {isMainAdmin && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                                مدير عام
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 font-mono font-bold text-slate-700">
                          <span className="dir-ltr inline-block">{u.phone || u.id}</span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              u.role === 'admin'
                                ? 'bg-[#0c2461]/10 text-[#0c2461]'
                                : u.role === 'worker'
                                ? 'bg-[#006266]/10 text-[#006266]'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {getRoleLabelAr(u.role)}
                          </span>
                        </td>

                        <td className="p-3 text-slate-600">
                          {u.role === 'grocery'
                            ? linkedGrocery
                              ? `(${linkedGrocery.code}) ${linkedGrocery.name}`
                              : '-'
                            : linkedGrocery
                            ? <span className="text-[11px] text-slate-400" title="ارتباط بقالة محفوظ تاريخياً">- (محفوظ: {linkedGrocery.name})</span>
                            : '-'}
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-slate-600 bg-slate-100/60 rounded">
                          <span className="inline-flex items-center gap-1 text-xs" title="كلمة المرور مشفرة بآلية SHA-256">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>••••••••</span>
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            disabled={isMainAdmin}
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                              u.active
                                ? 'bg-emerald-100 text-[#009432]'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {u.active ? 'نشط' : 'معطل'}
                          </button>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectUserToEdit(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#0c2461] bg-[#0c2461]/10 hover:bg-[#0c2461] hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="تعديل بيانات المستخدم وصلاحياته وكلمة المرور"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل البيانات</span>
                            </button>

                            {!isMainAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUPABASE & VERCEL DEPLOYMENT GUIDE */}
        {activeTab === 'supabase' && (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950">
              <h3 className="font-black text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-[#009432]" />
                دليل الربط بقاعدة بيانات Supabase والنشر المباشر على Vercel
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                الكود مصمم ومبني 100% ليكون متوافقاً تماماً مع Vercel وخالياً من أي أخطاء Build أو أخطاء Hydration.
              </p>
            </div>

            {/* Step 1: Supabase SQL Schema */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  1. إنشاء جداول قاعدة بيانات Supabase (انسخ الكود والصقه في SQL Editor في Supabase):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`-- SQL Schema for Supabase
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  country_code TEXT DEFAULT '+967',
  role TEXT NOT NULL,
  pin TEXT NOT NULL,
  grocery_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groceries (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  owner_name TEXT,
  balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 500000,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  balance NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS daily_sheets (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  day_name TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  total_cost NUMERIC DEFAULT 0,
  total_sale NUMERIC DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  night_orders_saved BOOLEAN DEFAULT false,
  morning_sort_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  voucher_number TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  party_type TEXT NOT NULL,
  party_id TEXT NOT NULL,
  party_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج مدراء النظام (يونس العفيف و مهند الأحمدي)
INSERT INTO users (id, name, phone, country_code, role, pin, active)
VALUES 
  ('usr_admin_younis', 'يونس العفيف (مدير النظام)', '772317950', '+967', 'admin', '772317950', true),
  ('usr_admin_mohannad', 'مهند الأحمدي (مدير النظام)', '772178969', '+967', 'admin', '772178969', true)
ON CONFLICT (phone) DO NOTHING;`);
                    alert('✅ تم نسخ كود SQL لإنشاء جداول Supabase بنجاح!');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#0c2461] hover:underline cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ كود SQL</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-48 scrollbar-thin text-left dir-ltr">
{`-- 1. افتح Supabase وانتقل إلى SQL Editor
-- 2. الصق هذا الكود واضغط RUN:
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  pin TEXT NOT NULL,
  active BOOLEAN DEFAULT true
);`}
              </pre>
            </div>

            {/* Step 2: .env Variables for Vercel */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3 text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-[#0c2461] block">
                    2. متغيرات البيئة الخاصة بمشروعك (جاهزة في ملف .env):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    يمكنك نسخها ولصقها مباشرة في Vercel في خيار (Environment Variables):
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`SUPABASE_URL="https://hgbnevobfjxggkpzjicv.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_DesBAjmOQwAYOtcKggQwFQ__vkAjme5"
SUPABASE_JWKS_URL="https://hgbnevobfjxggkpzjicv.supabase.co/auth/v1/.well-known/jwks.json"
VITE_SUPABASE_URL="https://hgbnevobfjxggkpzjicv.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_DesBAjmOQwAYOtcKggQwFQ__vkAjme5"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_DesBAjmOQwAYOtcKggQwFQ__vkAjme5"`);
                    alert('✅ تم نسخ نص متغيرات البيئة! الصقها في Vercel مباشرة.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl shadow-xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ متغيرات Vercel</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto text-left dir-ltr">
{`SUPABASE_URL="https://hgbnevobfjxggkpzjicv.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_DesBAjmOQwAYOtcKggQwFQ__vkAjme5"
VITE_SUPABASE_URL="https://hgbnevobfjxggkpzjicv.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_DesBAjmOQwAYOtcKggQwFQ__vkAjme5"`}
              </pre>
            </div>

            {/* Step 3: Deployment on Vercel */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <span className="font-bold text-sm text-[#0c2461] block">
                3. خطوات الرفع على Vercel بنقرة واحدة:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>اربط مستودع GitHub الخاص بك بحسابك على Vercel (<span className="font-mono">vercel.com</span>).</li>
                <li>اختر <strong>Import Git Repository</strong> وحدد المشروع.</li>
                <li>في قسم <strong>Environment Variables</strong> الصق النص المنسوخ من الزر أعلاه.</li>
                <li>تأكد من إعدادات البناء: <strong>Framework Preset: Vite</strong> و <strong>Build Command: npm run build</strong>.</li>
                <li>اضغط <strong>Deploy</strong> وخلال أقل من 40 ثانية سيكون الموقع متاحاً على رابط عالمي سريع ومحمي بشهادة SSL.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: WORKER PERMISSIONS */}
        {activeTab === 'permissions' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                صلاحيات العامل الميداني (مضبوطة لحماية سرية الأسعار والبيانات)
              </h3>
              <p className="text-xs text-slate-500">
                التحكم بالبيانات التي تظهر للعامل أثناء عمله الميداني بالسوق.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    السماح للعامل بإضافة مورد جديد
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    إظهار زر (+ مورد جديد) في كشف اليومية لتمكين العامل من تسجيل مورد طارئ.
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

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    السماح للعامل بإضافة صنف خضار جديد
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    تمكين العامل من إضافة أصناف إضافية غير العشرة الأساسية.
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

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    إظهار أسعار وتكلفة الشراء للعامل الميداني
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    حجب أسعار الجملة وتكلفة الشراء عن العامل لحفظ السرية المالية للمؤسسة.
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

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    قفل تعديل اليومية فور النقر على "حفظ طلبات الليل"
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    منع العامل من تغيير الكميات بعد اعتمادها إلا بطلب المدير.
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

        {/* TAB 4: GROCERIES MANAGEMENT */}
        {activeTab === 'groceries' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">إدارة البقالات الشريكة</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إضافة أي بقالة هنا يولد عموداً جديداً تلقائياً في شاشة العامل، وتضاف إلى جداول فرز الصباح.
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

            {showAddGBulk && (
              <form
                onSubmit={handleCreateGrocery}
                className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-4"
              >
                <div className="text-xs font-bold text-[#0c2461]">
                  بيانات البقالة الجديدة:
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
                      placeholder="مثال: ن، ف"
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
                      placeholder="مثال: تموينات النور"
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
                    <label className="block text-xs font-medium text-slate-600 mb-1">رقم الهاتف (اليمن)</label>
                    <input
                      type="tel"
                      placeholder="77xxxxxxx"
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

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 text-center w-16">الرمز</th>
                    <th className="p-3">اسم البقالة</th>
                    <th className="p-3">صاحب البقالة</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3 text-center">الرصيد الحالي</th>
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
                      <td className="p-2.5 font-mono text-slate-600">+967 {g.phone}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-[#0c2461] tabular-nums">
                        {g.balance.toLocaleString()} ر.ي
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

        {/* TAB 5: SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">إدارة الموردين والمزارع</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إضافة أو حذف الموردين المعتمدين لتوريد الخضروات والفواكه، ويتم حفظهم مباشرة في قاعدة البيانات.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddSBulk(!showAddSBulk)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                + إضافة مورد جديد
              </button>
            </div>

            {showAddSBulk && (
              <form
                onSubmit={handleCreateSupplier}
                className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-4"
              >
                <div className="text-xs font-bold text-[#0c2461]">
                  بيانات المورد الجديد:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      اسم المورد / المزرعة *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مزارع الوادي الأخضر"
                      value={newSName}
                      onChange={(e) => setNewSName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      التخصص والمنتجات
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: طماط، بطاط، بصل"
                      value={newSSpecialty}
                      onChange={(e) => setNewSSpecialty(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      رقم الهاتف (اليمن)
                    </label>
                    <input
                      type="tel"
                      placeholder="77xxxxxxx"
                      value={newSPhone}
                      onChange={(e) => setNewSPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSBulk(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#009432] hover:bg-[#007b29] rounded-lg shadow-xs"
                  >
                    حفظ وإضافة المورد
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0c2461] text-white">
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">اسم المورد / المزرعة</th>
                    <th className="p-3">التخصص والمنتجات</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3 text-center">المستحقات له</th>
                    <th className="p-3 text-center w-20">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        لا يوجد موردون مضافون حالياً. اضغط على (+ إضافة مورد جديد) لإضافة الموردين.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((s, idx) => (
                      <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-2.5 text-slate-600">{s.specialty}</td>
                        <td className="p-2.5 font-mono text-slate-600">+967 {s.phone}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-600 tabular-nums">
                          {s.balance.toLocaleString()} ر.ي
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف المورد (${s.name})؟`)) {
                                onDeleteSupplier(s.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف المورد"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: INVOICE BRANDING */}
        {activeTab === 'invoice_header' && (
          <form onSubmit={handleSaveBranding} className="p-6 space-y-4 max-w-3xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                تخصيص ترويسة الفواتير وكشوف الحساب (PDF)
              </h3>
              <p className="text-xs text-slate-500">
                هذه البيانات ستظهر في الترويسة الرسمية لكافة الفواتير وكشوفات الحساب.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المؤسسة</label>
                <input
                  type="text"
                  value={brandForm.businessName}
                  onChange={(e) => setBrandForm({ ...brandForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف الفرعي</label>
                <input
                  type="text"
                  value={brandForm.businessSubname}
                  onChange={(e) => setBrandForm({ ...brandForm, businessSubname: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف (المدير يونس العفيف)</label>
                <input
                  type="text"
                  value={brandForm.phone}
                  onChange={(e) => setBrandForm({ ...brandForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">السجل التجاري والترخيص</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">تذييل الفاتورة والتواصل</label>
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
                حفظ تعديلات الترويسة
              </button>
            </div>
          </form>
        )}

        {/* TAB 6: THEMES & SYSTEM STYLING (Accessible only in Settings) */}
        {activeTab === 'themes' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#f6b93b]" />
                  تخصيص ثيم وألوان النظام (خاص بالإعدادات)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  اختر الهوية اللونية المعتمدة للمؤسسة ولوحة التحكم وشاشات العمال والبقالات. يتم الحفظ فوراً على الجهاز.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                <span>الثيم الحالي:</span>
                <span className="text-[#0c2461] font-black">
                  {THEMES.find((t) => t.id === currentTheme)?.name || currentTheme}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {THEMES.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => onThemeChange && onThemeChange(theme.id)}
                    className={`rounded-3xl border-2 p-5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Header with name and tag */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <h4 className="font-black text-sm text-slate-900">{theme.name}</h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {theme.tag}
                        </span>
                      </div>

                      {/* Visual Color Palette Swatches */}
                      <div className="space-y-2 mb-4">
                        <div className="text-[11px] text-slate-500 font-semibold">لوحة الألوان:</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div
                            className="h-10 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: theme.primary }}
                          >
                            رئيسي
                          </div>
                          <div
                            className="h-10 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: theme.secondary }}
                          >
                            ثانوي
                          </div>
                          <div
                            className="h-10 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-950 shadow-2xs"
                            style={{ backgroundColor: theme.accent }}
                          >
                            تمييز
                          </div>
                        </div>
                      </div>

                      {/* Mockup card preview */}
                      <div
                        className="rounded-2xl p-3 border text-xs space-y-1.5 mb-4"
                        style={{
                          backgroundColor: theme.bgPreview,
                          borderColor: theme.secondary + '40',
                          color: theme.isDark ? '#f8fafc' : '#0f172a',
                        }}
                      >
                        <div
                          className="px-2 py-1 rounded-lg text-[10px] font-black inline-block"
                          style={{ backgroundColor: theme.primary, color: '#ffffff' }}
                        >
                          معاينة الواجهة
                        </div>
                        <p className="text-[11px] font-medium opacity-80">
                          مظهر أزرار وجداول الفواتير والتقارير
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onThemeChange && onThemeChange(theme.id);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>الثيم المفعّل حالياً</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>تطبيق هذا الثيم</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT LOG */}
        {activeTab === 'audit_log' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">سجل التدقيق والرقابة (Audit Trail)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  توثيق زمني دقيق لكل حركة بالساعة والدقيقة واسم المستخدم والقيم السابقة والجديدة.
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
                    <th className="p-3 w-36 font-bold">التوقيت</th>
                    <th className="p-3 font-bold">المستخدم</th>
                    <th className="p-3 font-bold">العملية</th>
                    <th className="p-3 font-bold">الهدف</th>
                    <th className="p-3 font-bold">التفاصيل</th>
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
                          {(() => {
                            const raw = log.timestamp || '';
                            const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
                            const datePart = dateMatch ? dateMatch[1] : raw;
                            const timePart = extractTime12(raw);
                            return (
                              <span className="inline-flex items-baseline gap-1.5">
                                <span>{datePart}</span>
                                {timePart && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {timePart}
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">{log.user}</td>
                        <td className="p-2.5 font-bold text-[#0c2461]">{log.action}</td>
                        <td className="p-2.5 font-medium text-slate-700">{log.target}</td>
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
