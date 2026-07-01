import React, { useState } from 'react';
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
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [openMenus, setOpenMenus] = useState({ Leave: true, Setup: true });

  const menuItems = [
    {
      path: "/",
      name: t("dashboard"),
      icon: HomeIcon,
    },
    {
      key: "Setup",
      name: t("setupGroup"),
      icon: Cog6ToothIcon,
      subItems: [
        {
          path: "/employees",
          name: t("employees"),
          resource: "employees",
        },
        {
          path: "/positions",
          name: t("positions"),
          resource: "positions",
        },
        {
          path: "/departments",
          name: t("departments"),
          resource: "departments",
        },
        {
          path: "/work-hours",
          name: t("workHours"),
          resource: "work_hours",
        },
      ]
    },
    {
      path: "/attendance",
      name: t("attendance"),
      icon: ClockIcon,
    },
    {
      key: "Leave",
      name: t("leaveGroup"),
      icon: CalendarIcon,
      subItems: [
        {
          path: "/leaves",
          name: t("requestItem"),
          resource: "leaves",
        },
        {
          path: "/leave-types",
          name: t("types"),
          resource: "leave_types",
        },
        {
          path: "/leave-allowances",
          name: t("allowances"),
          resource: "leave_allowances",
        },
      ]
    },
    {
      path: "/reports",
      name: t("reports"),
      icon: DocumentChartBarIcon,
      resource: "reports",
    },
    {
      path: "/kiosk",
      name: t("facescan"),
      icon: ComputerDesktopIcon,
      resource: "kiosk",
    },
    {
      path: "/kiosk-settings",
      name: t("branchSetting"),
      icon: MapPinIcon,
      resource: "kiosk_settings",
    },
    {
      path: "/permissions",
      name: "Permissions",
      icon: ShieldCheckIcon,
      resource: "permissions",
    },
  ];

  // Filter items based on permissions
  const filteredItems = menuItems.map(item => {
    if (item.subItems) {
      const allowedSubItems = item.subItems.filter(sub => {
        if (!sub.resource) return true;
        return hasPermission(sub.resource);
      });
      if (allowedSubItems.length > 0) {
        return { ...item, subItems: allowedSubItems };
      }
      return null;
    }
    if (item.adminOnly) return user?.role === 'Admin' ? item : null;
    if (!item.resource) return item;
    return hasPermission(item.resource) ? item : null;
  }).filter(Boolean);

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
          
          if (item.subItems) {
            const isOpen = openMenus[item.key];
            return (
              <div key={item.key} className="space-y-1">
                <button
                  onClick={() => setOpenMenus(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 border border-transparent hover:bg-white/5 hover:text-white cursor-pointer bg-transparent text-left outline-none text-slate-300"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-khmer">{item.name}</span>
                  </div>
                  <svg
                    className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isOpen && (
                  <div className="pl-4 space-y-1 border-l border-white/5 ml-6">
                    {item.subItems.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 border ${
                            isActive
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-transparent border-transparent hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span className="font-khmer">{sub.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

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
