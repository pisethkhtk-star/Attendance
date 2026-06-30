import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  HomeIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  ComputerDesktopIcon,
  ShieldCheckIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();

  const menuItems = [
    {
      path: "/",
      name: t("dashboard"),
      icon: HomeIcon,
    },
    {
      path: "/departments",
      name: t("departments"),
      icon: BuildingOfficeIcon,
      resource: "departments",
    },
    {
      path: "/positions",
      name: t("positions"),
      icon: BriefcaseIcon,
      resource: "positions",
    },
    {
      path: "/employees",
      name: t("employees"),
      icon: UsersIcon,
      resource: "employees",
    },
    {
      path: "/attendance",
      name: t("attendance"),
      icon: ClockIcon,
      resource: "attendance",
    },
    {
      path: "/leaves",
      name: t("leaves"),
      icon: CalendarIcon,
      resource: "leaves",
    },
    {
      path: "/reports",
      name: t("reports"),
      icon: DocumentChartBarIcon,
      resource: "reports",
    },
    {
      path: "/kiosk",
      name: "Kiosk Mode",
      icon: ComputerDesktopIcon,
      resource: "kiosk",
    },
    {
      path: "/kiosk-settings",
      name: "Kiosk Geofencing",
      icon: MapPinIcon,
      adminOnly: true,
    },
    {
      path: "/permissions",
      name: "Permissions",
      icon: ShieldCheckIcon,
      resource: "permissions",
    },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (item.adminOnly) return user?.role === 'Admin';
    if (!item.resource) return true;
    return hasPermission(item.resource);
  });

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 w-64 bg-slate-950/60 backdrop-blur-xl border-r border-white/10 text-slate-300 transition-transform duration-300 transform md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } no-print`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/5 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-8 w-8 text-indigo-400 animate-pulse" />
          <span className="text-lg font-bold text-white tracking-wider font-khmer">
            ATTENDANCE
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="md:hidden text-slate-400 hover:text-white"
        >
          <span className="sr-only">Close sidebar</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="mt-6 px-4 space-y-1 overflow-y-auto max-h-[calc(100vh-5rem)]">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 border ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-khmer">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
