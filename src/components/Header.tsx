import React from 'react';
import { ActivePage } from '../types';
import { PlusCircle, ShieldCheck, UserCheck, Store, Clock } from 'lucide-react';

interface HeaderProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  onOpenNewVoucher: () => void;
  currentRole: 'worker' | 'admin' | 'grocery';
  onRoleChange: (role: 'worker' | 'admin' | 'grocery') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onPageChange,
  onOpenNewVoucher,
  currentRole,
  onRoleChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0c2461] text-white shadow-md border-b border-[#1e3799]/40 print:hidden">
      {/* Role switch bar on top on mobile, integrated cleanly */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single line, whitespace-nowrap) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f6b93b] to-[#e5aa32] flex items-center justify-center text-[#0c2461] font-black shadow-sm text-lg">
            خ
          </div>
          <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
            النظام المحاسبي والرقابي للخضروات
          </span>
        </div>

        {/* Zone 2: 5 Single-Line Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-200">
          <button
            onClick={() => onPageChange('worker')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
              activePage === 'worker'
                ? 'text-[#f6b93b] border-[#f6b93b]'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            شاشة العامل الميداني
          </button>

          <button
            onClick={() => onPageChange('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
              activePage === 'dashboard'
                ? 'text-[#f6b93b] border-[#f6b93b]'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            لوحة تحكم المدير
          </button>

          <button
            onClick={() => onPageChange('reports')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
              activePage === 'reports'
                ? 'text-[#f6b93b] border-[#f6b93b]'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            تقارير الأيام والتعديل الشامل
          </button>

          <button
            onClick={() => onPageChange('settings')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
              activePage === 'settings'
                ? 'text-[#f6b93b] border-[#f6b93b]'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            إعدادات النظام والرقابة
          </button>

          <button
            onClick={() => onPageChange('grocery')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
              activePage === 'grocery'
                ? 'text-[#f6b93b] border-[#f6b93b]'
                : 'border-transparent text-slate-200 hover:text-white'
            }`}
          >
            بوابة صاحب البقالة
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Quick Financial Voucher or Role Badge) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick role preview dropdown */}
          <div className="hidden sm:flex items-center bg-[#1e3799]/60 border border-white/10 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => {
                onRoleChange('worker');
                onPageChange('worker');
              }}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                currentRole === 'worker' ? 'bg-[#006266] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="واجهة العامل الميداني"
            >
              <UserCheck className="w-3.5 h-3.5" />
              عامل
            </button>
            <button
              onClick={() => {
                onRoleChange('admin');
                onPageChange('dashboard');
              }}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                currentRole === 'admin' ? 'bg-[#1e3799] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="لوحة تحكم المدير"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              مدير
            </button>
            <button
              onClick={() => {
                onRoleChange('grocery');
                onPageChange('grocery');
              }}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                currentRole === 'grocery' ? 'bg-[#f6b93b] text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="بوابة البقالة"
            >
              <Store className="w-3.5 h-3.5" />
              بقالة
            </button>
          </div>

          <button
            onClick={onOpenNewVoucher}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-[#f6b93b] hover:bg-[#e5aa32] rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>سند مالي</span>
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Row (Mobile-Friendly touch tabs) */}
      <div className="lg:hidden bg-[#0c2461]/95 border-t border-white/10 px-2 py-2 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max text-xs font-semibold">
          <button
            onClick={() => {
              onRoleChange('worker');
              onPageChange('worker');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              activePage === 'worker' ? 'bg-[#006266] text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            شاشة العامل
          </button>
          <button
            onClick={() => {
              onRoleChange('admin');
              onPageChange('dashboard');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              activePage === 'dashboard' ? 'bg-[#1e3799] text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            لوحة المدير
          </button>
          <button
            onClick={() => {
              onRoleChange('admin');
              onPageChange('reports');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              activePage === 'reports' ? 'bg-[#1e3799] text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            تقارير الأيام
          </button>
          <button
            onClick={() => {
              onRoleChange('admin');
              onPageChange('settings');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              activePage === 'settings' ? 'bg-[#1e3799] text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            الإعدادات
          </button>
          <button
            onClick={() => {
              onRoleChange('grocery');
              onPageChange('grocery');
            }}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              activePage === 'grocery' ? 'bg-[#f6b93b] text-slate-900 font-bold' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            بوابة البقالة
          </button>
        </div>
      </div>
    </header>
  );
};
