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
      <header
        className="sticky top-0 z-40 text-white shadow-lg border-b transition-colors duration-300 print:hidden theme-header"
        style={{
          backgroundColor: 'var(--theme-primary)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Main Desktop & Tablet Top Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Zone 1: Single Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-md text-lg transition-colors duration-300"
              style={{
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-primary)',
              }}
            >
              خ
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap block">
                محاسبة الخضروات
              </span>
              <span className="text-[10px] text-slate-300 font-bold block">
                سوق الجملة المركزي والتوزيع
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Restricted by Role) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-black text-slate-200">
            {/* Worker link (Admin and Worker) */}
            {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'worker') && (
              <button
                type="button"
                onClick={() => onPageChange('worker')}
                className={`transition-all whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                  activePage === 'worker'
                    ? 'border-current font-black'
                    : 'border-transparent text-slate-200 hover:text-white'
                }`}
                style={{
                  color: activePage === 'worker' ? 'var(--theme-accent)' : undefined,
                  borderColor: activePage === 'worker' ? 'var(--theme-accent)' : undefined,
                }}
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
                  className={`transition-all whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                    activePage === 'dashboard'
                      ? 'border-current font-black'
                      : 'border-transparent text-slate-200 hover:text-white'
                  }`}
                  style={{
                    color: activePage === 'dashboard' ? 'var(--theme-accent)' : undefined,
                    borderColor: activePage === 'dashboard' ? 'var(--theme-accent)' : undefined,
                  }}
                >
                  لوحة تحكم المدير
                </button>

                <button
                  type="button"
                  onClick={() => onPageChange('reports')}
                  className={`transition-all whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                    activePage === 'reports'
                      ? 'border-current font-black'
                      : 'border-transparent text-slate-200 hover:text-white'
                  }`}
                  style={{
                    color: activePage === 'reports' ? 'var(--theme-accent)' : undefined,
                    borderColor: activePage === 'reports' ? 'var(--theme-accent)' : undefined,
                  }}
                >
                  تقارير الأيام والتعديل الشامل
                </button>

                <button
                  type="button"
                  onClick={() => onPageChange('settings')}
                  className={`transition-all whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                    activePage === 'settings'
                      ? 'border-current font-black'
                      : 'border-transparent text-slate-200 hover:text-white'
                  }`}
                  style={{
                    color: activePage === 'settings' ? 'var(--theme-accent)' : undefined,
                    borderColor: activePage === 'settings' ? 'var(--theme-accent)' : undefined,
                  }}
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
                className={`transition-all whitespace-nowrap shrink-0 cursor-pointer py-1.5 border-b-2 ${
                  activePage === 'grocery'
                    ? 'border-current font-black'
                    : 'border-transparent text-slate-200 hover:text-white'
                }`}
                style={{
                  color: activePage === 'grocery' ? 'var(--theme-accent)' : undefined,
                  borderColor: activePage === 'grocery' ? 'var(--theme-accent)' : undefined,
                }}
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
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-bold border transition-colors shadow-xs"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <span
                  className="w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: 'var(--theme-accent)',
                    color: 'var(--theme-primary)',
                  }}
                >
                  {currentUser.avatarBadge}
                </span>
                <span className="font-bold text-white hidden md:inline truncate max-w-[120px]">
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={onOpenNewVoucher}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black rounded-2xl transition-all shadow-md cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              style={{
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-primary)',
              }}
            >
              <PlusCircle className="w-4 h-4" />
              <span>سند مالي</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Sub-Bar with Themes & Quick Role Toggle */}
        <div
          className="sm:hidden border-t px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin transition-colors duration-300"
          style={{
            backgroundColor: 'var(--theme-primary-dark)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-bold whitespace-nowrap">الثيم:</span>
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
          </div>

          {currentUser && (
            <div
              className="flex items-center gap-1 text-[11px] font-black whitespace-nowrap px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'var(--theme-accent)',
              }}
            >
              <span>{currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'worker' ? 'عامل' : 'بقالة'}</span>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE THUMB-FRIENDLY BOTTOM NAVIGATION BAR */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-2 py-2 shadow-2xl print:hidden transition-colors duration-300"
        style={{
          backgroundColor: 'var(--theme-card)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="flex items-center justify-around text-[10px] font-black">
          {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'worker') && (
            <button
              type="button"
              onClick={() => onPageChange('worker')}
              className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer"
              style={{
                color: activePage === 'worker' ? 'var(--theme-worker)' : 'var(--theme-text-muted)',
              }}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="whitespace-nowrap">شاشة العامل</span>
            </button>
          )}

          {(!currentUser || currentUser.role === 'admin') && (
            <>
              <button
                type="button"
                onClick={() => onPageChange('dashboard')}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer"
                style={{
                  color: activePage === 'dashboard' ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                }}
              >
                <DollarSign className="w-5 h-5" />
                <span className="whitespace-nowrap">اللوحة المالية</span>
              </button>

              <button
                type="button"
                onClick={() => onPageChange('reports')}
                className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer"
                style={{
                  color: activePage === 'reports' ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                }}
              >
                <Calendar className="w-5 h-5" />
                <span className="whitespace-nowrap">التقارير</span>
              </button>
            </>
          )}

          {(!currentUser || currentUser.role === 'admin' || currentUser.role === 'grocery') && (
            <button
              type="button"
              onClick={() => onPageChange('grocery')}
              className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer"
              style={{
                color: activePage === 'grocery' ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              }}
            >
              <Store className="w-5 h-5" />
              <span className="whitespace-nowrap">البقالة</span>
            </button>
          )}

          {(!currentUser || currentUser.role === 'admin') && (
            <button
              type="button"
              onClick={() => onPageChange('settings')}
              className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors cursor-pointer"
              style={{
                color: activePage === 'settings' ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
              }}
            >
              <Sliders className="w-5 h-5" />
              <span className="whitespace-nowrap">الإعدادات</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
