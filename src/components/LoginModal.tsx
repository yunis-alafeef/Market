import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { AuthSession, UserAccount } from '../types';
import { Lock, UserCheck, ShieldCheck, Store, Smartphone, Key, LogIn, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  isMandatory?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isMandatory = false,
}) => {
  const users = AuthService.getUsers();
  const adminUser = users.find((u) => u.role === 'admin') || users[0];

  const [phone, setPhone] = useState(adminUser?.phone || '772317950');
  const [pin, setPin] = useState(adminUser?.pin || '7723');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleQuickSelect = (user: UserAccount) => {
    setPhone(user.phone);
    setPin(user.pin);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = AuthService.login(phone, pin, rememberDevice);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      if (onClose) onClose();
    } else {
      setErrorMsg(res.error || 'رقم الهاتف أو رمز الدخول (PIN) غير صحيح');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right">
        {/* Header */}
        <div className="bg-[#0c2461] p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f6b93b] to-amber-300 text-[#0c2461] flex items-center justify-center font-black text-2xl mx-auto shadow-md mb-3">
            خ
          </div>
          <h2 className="text-xl font-black tracking-tight">نظام مشتريات وتوزيع الخضروات</h2>
          <p className="text-xs text-amber-300 mt-1 font-semibold">
            إدارة: يونس العفيف (772317950) · مهند الأحمدي (772178969)
          </p>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-slate-300 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/10 cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Select Cards for existing accounts */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              الحسابات المعتمدة في النظام:
            </label>
            <div className="space-y-2">
              {users.map((u) => {
                const isSelected = phone === u.phone;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelect(u)}
                    className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0c2461] bg-[#0c2461]/5 shadow-xs ring-1 ring-[#0c2461]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          u.role === 'admin'
                            ? 'bg-[#0c2461] text-[#f6b93b]'
                            : u.role === 'worker'
                            ? 'bg-[#006266] text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.avatarBadge}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xs text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {u.countryCode} {u.phone} · PIN: {u.pin}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-[#0c2461]/10 text-[#0c2461]'
                          : u.role === 'worker'
                          ? 'bg-[#006266]/10 text-[#006266]'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {u.role === 'admin' ? 'مدير عام' : u.role === 'worker' ? 'عامل ميداني' : 'صاحب بقالة'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            {/* Phone Input with +967 Yemen Prefix */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم الهاتف المعتمد (اليمن)</span>
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0c2461] focus-within:bg-white">
                <span className="px-3.5 py-2.5 bg-slate-200/80 font-mono text-xs font-black text-slate-700 select-none border-l border-slate-300 flex items-center gap-1 shrink-0">
                  🇾🇪 +967
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="772317950"
                  className="w-full px-3 py-2.5 text-sm font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>رمز الدخول السري (PIN)</span>
              </label>
              <input
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="أدخل الرمز هنا..."
                className="w-full text-center text-xl font-mono font-bold tracking-widest py-2.5 px-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0c2461] focus:bg-white focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Remember Device */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded text-[#0c2461] focus:ring-[#0c2461] cursor-pointer"
              />
              <span>تذكر هذا الجوال وحفظ جلسة تسجيل الدخول تلقائياً</span>
            </label>

            <button
              type="submit"
              className="w-full py-3 px-4 text-sm font-bold text-white bg-[#0c2461] hover:bg-[#1e3799] rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-[#f6b93b]" />
              <span>تسجيل الدخول والمصادقة</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
