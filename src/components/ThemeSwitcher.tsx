import React, { useState } from 'react';
import { ThemeId } from '../types';
import { Check, Sparkles, Palette, ChevronDown } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  compact?: boolean;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tag: string;
  primary: string;
  secondary: string;
  accent: string;
  bgPreview: string;
  isDark?: boolean;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'royal_navy',
    name: 'الكحلي الملكي',
    tag: 'كلاسيك',
    primary: '#0c2461',
    secondary: '#1e3799',
    accent: '#f6b93b',
    bgPreview: '#f1f5f9',
    isDark: false,
  },
  {
    id: 'dark_luxury',
    name: 'الأسود الفخم OLED',
    tag: 'ليلي',
    primary: '#020617',
    secondary: '#1e293b',
    accent: '#fbbf24',
    bgPreview: '#030712',
    isDark: true,
  },
  {
    id: 'emerald_botanical',
    name: 'الزمرد الزراعي',
    tag: 'طبيعي',
    primary: '#064e3b',
    secondary: '#047857',
    accent: '#eab308',
    bgPreview: '#f0fdf4',
    isDark: false,
  },
  {
    id: 'indigo_gold',
    name: 'النيلي العصري',
    tag: 'مودرن',
    primary: '#1e1b4b',
    secondary: '#4338ca',
    accent: '#f59e0b',
    bgPreview: '#f8fafc',
    isDark: false,
  },
  {
    id: 'ruby_luxury',
    name: 'العقيق الملكي',
    tag: 'فاخر',
    primary: '#4c0519',
    secondary: '#881337',
    accent: '#fbbf24',
    bgPreview: '#fff1f2',
    isDark: false,
  },
];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeDef = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  const handleSelect = (id: ThemeId) => {
    onThemeChange(id);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black bg-black/40 hover:bg-black/50 text-white border border-white/20 shadow-sm cursor-pointer transition-all active:scale-95"
          title="تغيير ثيم الواجهة"
        >
          <span className="relative flex w-4 h-4 rounded-full overflow-hidden border border-white/40 shadow-xs shrink-0">
            <span className="w-1/2 h-full" style={{ backgroundColor: activeDef.primary }} />
            <span className="w-1/2 h-full" style={{ backgroundColor: activeDef.accent }} />
          </span>
          <span className="hidden xs:inline whitespace-nowrap">{activeDef.name}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20 z-50 text-right animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 mb-1 border-b border-white/10 flex items-center justify-between">
                <span>اختر هوية الألوان</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <div className="space-y-1">
                {THEMES.map((th) => {
                  const isSelected = currentTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => handleSelect(th.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative flex w-4 h-4 rounded-full overflow-hidden border border-black/30 shrink-0">
                          <span className="w-1/2 h-full" style={{ backgroundColor: th.primary }} />
                          <span className="w-1/2 h-full" style={{ backgroundColor: th.accent }} />
                        </span>
                        <span>{th.name}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">
                          {th.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs p-1 rounded-2xl border border-white/20 shadow-inner overflow-x-auto max-w-full">
      {THEMES.map((th) => {
        const isSelected = currentTheme === th.id;
        return (
          <button
            key={th.id}
            type="button"
            onClick={() => handleSelect(th.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              isSelected
                ? 'bg-white text-slate-900 shadow-md ring-2 ring-amber-400 font-black'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
            title={`تفعيل ثيم: ${th.name}`}
          >
            {/* Dual Color Swatch Dot */}
            <span className="relative flex w-4 h-4 rounded-full overflow-hidden border border-black/40 shrink-0 shadow-xs">
              <span className="w-1/2 h-full" style={{ backgroundColor: th.primary }} />
              <span className="w-1/2 h-full" style={{ backgroundColor: th.accent }} />
            </span>
            <span>{th.name}</span>
            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
          </button>
        );
      })}
    </div>
  );
};
