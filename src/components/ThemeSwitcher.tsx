import React from 'react';
import { ThemeId } from '../types';
import { Palette, Check } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export const THEMES: { id: ThemeId; name: string; primary: string; secondary: string; accent: string }[] = [
  {
    id: 'royal_navy',
    name: 'الكحلي الملكي',
    primary: '#0c2461',
    secondary: '#1e3799',
    accent: '#f6b93b',
  },
  {
    id: 'indigo_gold',
    name: 'النيلي العصري',
    primary: '#1e1b4b',
    secondary: '#4338ca',
    accent: '#d97706',
  },
  {
    id: 'emerald_botanical',
    name: 'الأخضر الزراعي',
    primary: '#064e3b',
    secondary: '#047857',
    accent: '#eab308',
  },
  {
    id: 'dark_luxury',
    name: 'الأسود الليلي',
    primary: '#0f172a',
    secondary: '#1e293b',
    accent: '#f59e0b',
  },
];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/10 text-xs">
      {THEMES.map((th) => {
        const isSelected = currentTheme === th.id;
        return (
          <button
            key={th.id}
            type="button"
            onClick={() => onThemeChange(th.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isSelected ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={`تفعيل ثيم: ${th.name}`}
          >
            <span
              className="w-3 h-3 rounded-full border border-black/20 shrink-0"
              style={{ backgroundColor: th.primary }}
            />
            <span className="hidden sm:inline">{th.name}</span>
          </button>
        );
      })}
    </div>
  );
};
