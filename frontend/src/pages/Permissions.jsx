import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const Permissions = () => {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Define structured layout variables
  const roles = ['Admin', 'HR', 'Manager', 'Employee'];
  const resources = [
    { key: 'departments', label: 'Departments (ដេប៉ាតឺម៉ង់)' },
    { key: 'positions', label: 'Positions (តួនាទី)' },
    { key: 'employees', label: 'Employees (បុគ្គលិក)' },
    { key: 'attendance', label: 'Attendance logs (វត្តមាន)' },
    { key: 'add_attendance', label: 'Add Attendance Logs (បន្ថែមវត្តមាន)' },
    { key: 'edit_attendance', label: 'Edit Attendance Logs (កែប្រែវត្តមាន)' },
    { key: 'delete_attendance', label: 'Delete Attendance Logs (លុបវត្តមាន)' },
    { key: 'leaves', label: 'Leaves approval (ច្បាប់ឈប់សម្រាក)' },
    { key: 'reports', label: 'Reports view (របាយការណ៍)' },
    { key: 'kiosk', label: 'Kiosk Entrance mode (ម៉ាស៊ីនស្កេន)' }
  ];

  const playSound = (type = 'success') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.16);
        setTimeout(() => { osc.stop(); ctx.close(); }, 200);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/permissions');
      setPermissions(res.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setErrorMsg('Failed to load role permissions from server.');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionVal = (role, resource) => {
    const item = permissions.find(p => p.role === role && p.resource === resource);
    return item ? item.canAccess : false;
  };

  const handleCheckboxChange = (role, resource) => {
    // Admin permissions are locked for safety
    if (role === 'Admin') return;

    setPermissions(prev => 
      prev.map(p => {
        if (p.role === role && p.resource === resource) {
          return { ...p, canAccess: !p.canAccess };
        }
        return p;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMsg('');
      setErrorMsg('');
      
      // Filter out admin permissions if they exist to keep them locked
      const payload = permissions.filter(p => p.role !== 'Admin');

      await api.put('/permissions', { permissions: payload });
      
      setSuccessMsg('Permissions updated successfully! (កែប្រែសិទ្ធិបានជោគជ័យ)');
      playSound('success');
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3500);
    } catch (error) {
      console.error('Error saving permissions:', error);
      setErrorMsg('Failed to save permissions configuration.');
      playSound('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <span className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 text-indigo-300 font-khmer text-xs">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Role-Based Access Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2 font-khmer">
            គ្រប់គ្រងសិទ្ធិប្រើប្រាស់ (Manage Permissions)
          </h1>
          <p className="text-sm text-slate-400 font-khmer">
            Configure resource permissions and system layout visibility rules for each user role.
          </p>
        </div>
      </div>

      {/* Message Notifications */}
      {successMsg && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300 font-khmer animate-fade-in">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-300 font-khmer animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* Permissions Matrix Glass Card */}
      <div className="glass-card rounded-2xl overflow-hidden glow-indigo">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse glass-table">
            <thead>
              <tr>
                <th className="py-4 px-6 font-khmer text-slate-400 uppercase text-xs tracking-wider">
                  Resource / Feature
                </th>
                {roles.map(role => (
                  <th key={role} className="py-4 px-6 text-center font-khmer text-slate-400 uppercase text-xs tracking-wider">
                    {role === 'Admin' ? 'Admin 👑' : role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(res => (
                <tr key={res.key} className="transition-colors hover:bg-white/5">
                  <td className="py-4 px-6 font-medium text-white text-sm font-khmer border-b border-white/5">
                    {res.label}
                  </td>
                  {roles.map(role => {
                    const isChecked = getPermissionVal(role, res.key);
                    const isAdmin = role === 'Admin';
                    return (
                      <td key={`${role}-${res.key}`} className="py-4 px-6 text-center border-b border-white/5">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isAdmin}
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(role, res.key)}
                            className="w-4 h-4 text-indigo-600 border border-white/10 rounded-md bg-slate-950 focus:ring-indigo-500 focus:ring-offset-slate-900 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-950/40 border-t border-white/5 flex justify-between items-center">
          <span className="text-[11px] text-slate-400 font-khmer max-w-sm leading-relaxed">
            * ម៉ាស៊ីន Admin ត្រូវបានចាក់សោរឱ្យមានសិទ្ធិទាំងអស់ដើម្បីសុវត្ថិភាព។ (Admin permissions are locked for system safety).
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-6 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/25 font-khmer border-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></span>
                <span>Saving...</span>
              </>
            ) : (
              <span>រក្សាទុកការផ្លាស់ប្តូរ (Save Permissions)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Permissions;
