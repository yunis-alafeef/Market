import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { AuthSession } from '../types';
import { Smartphone, Lock, LogIn, AlertCircle } from 'lucide-react';

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
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone.trim()) {
      setErrorMsg('يرجى إدخال رقم الهاتف');
      return;
    }
    if (!pin.trim()) {
      setErrorMsg('يرجى إدخال كلمة المرور (رقم الهاتف المعتمد)');
      return;
    }

    const res = AuthService.login(phone, pin, rememberDevice);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      if (onClose) onClose();
    } else {
      setErrorMsg(res.error || 'رقم الهاتف أو كلمة المرور غير صحيحة');
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
          <p className="text-xs text-slate-300 mt-1 font-medium">
            تسجيل الدخول إلى النظام المحاسبي والميداني
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
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Input with +967 Yemen Prefix */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم الهاتف المسجل (اليمن)</span>
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0c2461] focus-within:bg-white transition-all">
                <span className="px-3.5 py-2.5 bg-slate-200/80 font-mono text-xs font-black text-slate-700 select-none border-l border-slate-300 flex items-center gap-1 shrink-0">
                  🇾🇪 +967
                </span>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="77XXXXXXX"
                  className="w-full px-3 py-2.5 text-sm font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>كلمة المرور / رمز الدخول</span>
              </label>
              <input
                type="password"
                required
                maxLength={25}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className="w-full text-center text-lg font-mono font-bold tracking-wider py-2.5 px-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-[#0c2461] focus:bg-white focus:outline-none transition-all"
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
