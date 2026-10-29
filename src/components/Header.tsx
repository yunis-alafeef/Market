import React from 'react';
import { ActivePage, ThemeId, UserAccount } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';
import {
  PlusCircle,
  ShieldCheck,
  UserCheck,
  Store,
  LogOut,
  LogIn,
  Sliders,
  Calendar,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';

interface HeaderProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  onOpenNewVoucher: () => void;
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onPageChange,
  onOpenNewVoucher,
  currentUser,
  onOpenLogin,
  onLogout,
  currentTheme,
  onThemeChange,
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c2461] text-white shadow-md border-b border-[#1e3799]/40 print:hidden">
        {/* Main Desktop & Tablet Top Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Zone 1: Single Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f6b93b] to-amber-400 flex items-center justify-center text-[#0c2461] font-black shadow-sm text-base">
              خ
            </div>
            <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">
              محاسبة الخضروات
            </span>
          </div>

          {/* Zone 2: Navigation Links (Restricted by Role) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-bold text-slate-200">
            {/* Worker link (Admin and Worker) */}
            {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'worker') && (
              <button
                type="button"
                onClick={() => onPageChange('worker')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                  activePage === 'worker'
                    ? 'text-[#f6b93b] border-[#f6b93b]'
                    : 'border-transparent text-slate-200 hover:text-white'
                }`}
              >
                شاشة العامل الميداني
              </button>
            )}

            {/* Admin only views */}
            {(!currentUser || currentUser.role === 'admin') && (
              <>
                <button
                  type="button"
                  onClick={() => onPageChange('dashboard')}
                  className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                    activePage === 'dashboard'
                      ? 'text-[#f6b93b] border-[#f6b93b]'
                      : 'border-transparent text-slate-200 hover:text-white'
                  }`}
                >
                  لوحة تحكم المدير
                </button>

                <button
                  type="button"
                  onClick={() => onPageChange('reports')}
                  className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                    activePage === 'reports'
                      ? 'text-[#f6b93b] border-[#f6b93b]'
                      : 'border-transparent text-slate-200 hover:text-white'
                  }`}
                >
                  تقارير الأيام والتعديل الشامل
                </button>

                <button
                  type="button"
                  onClick={() => onPageChange('settings')}
                  className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                    activePage === 'settings'
                      ? 'text-[#f6b93b] border-[#f6b93b]'
                      : 'border-transparent text-slate-200 hover:text-white'
                  }`}
                >
                  إعدادات النظام والرقابة
                </button>
              </>
            )}

            {/* Grocery view (Admin and Grocery Owner) */}
            {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'grocery') && (
              <button
                type="button"
                onClick={() => onPageChange('grocery')}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                  activePage === 'grocery'
                    ? 'text-[#f6b93b] border-[#f6b93b]'
                    : 'border-transparent text-slate-200 hover:text-white'
                }`}
              >
                بوابة صاحب البقالة
              </button>
            )}
          </nav>

          {/* Zone 3: Themes Switcher, User Avatar & Primary Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme switcher */}
            <div className="hidden sm:block">
              <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
            </div>

            {/* User Profile / Login status */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-[#1e3799]/80 border border-white/10 rounded-xl px-2.5 py-1 text-xs">
                <span className="w-5 h-5 rounded-full bg-[#f6b93b] text-[#0c2461] font-black flex items-center justify-center text-[10px]">
                  {currentUser.avatarBadge}
                </span>
                <span className="font-bold text-white hidden md:inline truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-xl transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#f6b93b]" />
                <span>دخول</span>
              </button>
            )}

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={onOpenNewVoucher}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-slate-900 bg-[#f6b93b] hover:bg-[#e5aa32] rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>سند مالي</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Sub-Bar with Themes & Quick Role Toggle */}
        <div className="sm:hidden bg-[#0c2461]/90 border-t border-white/10 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-bold whitespace-nowrap">الثيم:</span>
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
          </div>

          {currentUser && (
            <div className="flex items-center gap-1 text-[11px] text-[#f6b93b] font-bold whitespace-nowrap">
              <span>{currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'worker' ? 'عامل' : 'بقالة'}</span>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE THUMB-FRIENDLY BOTTOM NAVIGATION BAR (Filtered by Role) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg print:hidden">
        <div className="flex items-center justify-around text-[10px] font-bold">
          {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'worker') && (
            <button
              type="button"
              onClick={() => onPageChange('worker')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activePage === 'worker' ? 'text-[#006266] font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className={`w-5 h-5 ${activePage === 'worker' ? 'text-[#006266]' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">شاشة العامل</span>
            </button>
          )}

          {(!currentUser || currentUser.role === 'admin') && (
            <>
              <button
                type="button"
                onClick={() => onPageChange('dashboard')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                  activePage === 'dashboard' ? 'text-[#0c2461] font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className={`w-5 h-5 ${activePage === 'dashboard' ? 'text-[#0c2461]' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">اللوحة المالية</span>
              </button>

              <button
                type="button"
                onClick={() => onPageChange('reports')}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                  activePage === 'reports' ? 'text-[#0c2461] font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className={`w-5 h-5 ${activePage === 'reports' ? 'text-[#0c2461]' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">التقارير</span>
              </button>
            </>
          )}

          {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'grocery') && (
            <button
              type="button"
              onClick={() => onPageChange('grocery')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activePage === 'grocery' ? 'text-[#f6b93b] font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className={`w-5 h-5 ${activePage === 'grocery' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">البقالة</span>
            </button>
          )}

          {(!currentUser || currentUser.role === 'admin') && (
            <button
              type="button"
              onClick={() => onPageChange('settings')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                activePage === 'settings' ? 'text-[#0c2461] font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className={`w-5 h-5 ${activePage === 'settings' ? 'text-[#0c2461]' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">الإعدادات</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
