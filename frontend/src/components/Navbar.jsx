import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Bars3Icon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { locale, setLocale, t, getLocalizedName } = useLanguage();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleLanguageToggle = () => {
    setLocale(locale === 'kh' ? 'en' : 'kh');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/10 bg-slate-950/60 backdrop-blur-md px-6 no-print shadow-sm text-slate-100">
      {/* Sidebar Toggle Button for Mobile */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-slate-400 hover:text-white md:hidden"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold text-slate-400 font-khmer">
            {t("welcome")}, <span className="text-indigo-400 font-bold">{user ? getLocalizedName(user.nameEn, user.nameKh) : ''}</span>
          </h1>
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-4">
        {/* Theme Toggler */}
        <button
          onClick={handleThemeToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer transition-all outline-none"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <SunIcon className="h-5 w-5 text-amber-400" />
          ) : (
            <MoonIcon className="h-5 w-5 text-indigo-400" />
          )}
        </button>

        {/* Language Toggler */}
        <button
          onClick={handleLanguageToggle}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/10 cursor-pointer"
        >
          <span className="text-lg">
            {locale === 'kh' ? '🇰🇭' : '🇺🇸'}
          </span>
          <span className="font-mono">
            {locale === 'kh' ? 'ខ្មែរ' : 'EN'}
          </span>
        </button>

        {/* User Role Badge */}
        {user && (
          <span className="hidden md:inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
            {t("role")}: {user.role}
          </span>
        )}

        <div className="h-6 w-px bg-white/10"></div>

        {/* Log Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-rose-500/10 cursor-pointer"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          <span className="hidden sm:inline font-khmer">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
