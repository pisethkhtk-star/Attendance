import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { PlusIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const ApprovalManage = () => {
  const { t, getLocalizedName } = useLanguage();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Lookups
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [approverId, setApproverId] = useState('');
  const [scope, setScope] = useState('Employee');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetStaffId, setTargetStaffId] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter lists
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, empRes, deptRes] = await Promise.all([
        api.get('/leave-approvals'),
        api.get('/employees'),
        api.get('/departments')
      ]);
      setRules(rulesRes.data);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      console.error('Error loading approvals data:', err);
      setErrorMsg('Failed to load approval management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleOpenAddModal = () => {
    // Set default values
    const managers = employees.filter(e => ['Admin', 'HR', 'Manager'].includes(e.role));
    if (managers.length > 0) {
      setApproverId(managers[0].staffId);
    } else {
      setApproverId('');
    }
    
    setScope('Employee');
    
    const normalEmployees = employees.filter(e => e.role === 'Employee');
    if (normalEmployees.length > 0) {
      setTargetStaffId(normalEmployees[0].staffId);
    } else {
      setTargetStaffId('');
    }

    if (departments.length > 0) {
      setTargetDeptId(departments[0].id);
    } else {
      setTargetDeptId('');
    }

    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!approverId || !scope) {
      setErrorMsg('Approver and Scope are required');
      return;
    }
    if (scope === 'Department' && !targetDeptId) {
      setErrorMsg('Target Department is required');
      return;
    }
    if (scope === 'Employee' && !targetStaffId) {
      setErrorMsg('Target Employee is required');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      await api.post('/leave-approvals', {
        approverId,
        scope,
        targetDeptId: scope === 'Department' ? targetDeptId : null,
        targetStaffId: scope === 'Employee' ? targetStaffId : null
      });

      setSuccessMsg('Leave approval rule created successfully!');
      playSound('success');
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating approval rule:', err);
      setErrorMsg(err.response?.data?.message || 'Error creating approval rule');
      playSound('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this approval rule?')) return;
    try {
      await api.delete(`/leave-approvals/${id}`);
      setSuccessMsg('Approval rule deleted successfully!');
      playSound('success');
      fetchData();
    } catch (err) {
      console.error('Error deleting approval rule:', err);
      setErrorMsg('Failed to delete approval rule.');
      playSound('error');
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter(rule => {
    const approverName = rule.approver ? `${rule.approver.nameEn} ${rule.approver.nameKh}`.toLowerCase() : '';
    const targetName = rule.targetEmployee ? `${rule.targetEmployee.nameEn} ${rule.targetEmployee.nameKh}`.toLowerCase() : '';
    const deptName = rule.targetDept ? `${rule.targetDept.nameEn} ${rule.targetDept.nameKh}`.toLowerCase() : '';
    
    return approverName.includes(search.toLowerCase()) || 
           targetName.includes(search.toLowerCase()) || 
           deptName.includes(search.toLowerCase()) ||
           rule.approverId.toLowerCase().includes(search.toLowerCase()) ||
           (rule.targetStaffId && rule.targetStaffId.toLowerCase().includes(search.toLowerCase()));
  });

  const managers = employees.filter(e => ['Admin', 'HR', 'Manager'].includes(e.role));

  return (
    <div className="space-y-6 text-slate-100">
      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-sm text-emerald-300 font-khmer flex justify-between items-center">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-sm text-rose-300 font-khmer flex justify-between items-center">
          <span>❌ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {/* Header Block */}
      <div className="glass-card p-6 rounded-2xl glow-indigo flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-khmer">គ្រប់គ្រងការអនុម័តច្បាប់ (Approval Manage)</h2>
          <p className="text-slate-400 text-xs mt-1">
            កំណត់ និងគ្រប់គ្រងអ្នកអនុម័តច្បាប់សម្រាករបស់បុគ្គលិកម្នាក់ៗ ឬជាក្រុមសាខា/ដេប៉ាតឺម៉ង់
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="py-2.5 px-5 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/25 font-khmer border-none outline-none cursor-pointer flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>បន្ថែមច្បាប់អនុម័ត (Add Approver Rule)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <input
            type="text"
            placeholder="ស្វែងរកអ្នកអនុម័ត ឬបុគ្គលិកគោលដៅ... (Search...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-9 pr-4 bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            🔍
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-khmer">កំពុងទាញយកទិន្នន័យ (Loading)...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs text-slate-300 uppercase border-b border-white/10">
                <tr>
                  <th className="py-4 px-6 font-khmer">អ្នកអនុម័ត (Approver)</th>
                  <th className="py-4 px-6 font-khmer">កម្រិតកំណត់ (Scope Type)</th>
                  <th className="py-4 px-6 font-khmer">គោលដៅ (Target)</th>
                  <th className="py-4 px-6 text-right font-khmer">សកម្មភាព (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 font-khmer">
                      មិនទាន់មានច្បាប់កំណត់អ្នកអនុម័តនៅឡើយទេ
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-white">
                          {rule.approver ? getLocalizedName(rule.approver.nameEn, rule.approver.nameKh) : rule.approverId}
                        </p>
                        <p className="text-xs text-indigo-400">ID: {rule.approverId}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                          rule.scope === 'Department' 
                            ? 'bg-purple-500/10 text-purple-300 ring-purple-500/20' 
                            : 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20'
                        }`}>
                          {rule.scope}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {rule.scope === 'Department' ? (
                          <span className="text-white font-semibold">
                            🏢 ដេប៉ាតឺម៉ង់៖ {rule.targetDept ? getLocalizedName(rule.targetDept.nameEn, rule.targetDept.nameKh) : 'N/A'}
                          </span>
                        ) : (
                          <div>
                            <p className="font-semibold text-white">
                              👤 {rule.targetEmployee ? getLocalizedName(rule.targetEmployee.nameEn, rule.targetEmployee.nameKh) : rule.targetStaffId}
                            </p>
                            <p className="text-xs text-slate-400">ID: {rule.targetStaffId}</p>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="inline-flex p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl text-rose-400 transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <TrashIcon className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden shadow-2xl glow-indigo border border-white/10">
            <div className="p-6 border-b border-white/5 bg-slate-950/40">
              <h3 className="text-lg font-bold text-white font-khmer">បន្ថែមច្បាប់អនុម័តច្បាប់សម្រាក</h3>
              <p className="text-xs text-slate-400 mt-1">កំណត់អ្នកអនុម័តសម្រាប់បុគ្គលិកម្នាក់ៗ ឬដេប៉ាតឺម៉ង់</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Select Approver */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">ជ្រើសរើសអ្នកអនុម័ត (Approver)</label>
                  <select
                    value={approverId}
                    onChange={(e) => setApproverId(e.target.value)}
                    className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                  >
                    {managers.map(m => (
                      <option key={m.staffId} value={m.staffId} className="bg-slate-900">
                        {getLocalizedName(m.nameEn, m.nameKh)} ({m.role} - ID: {m.staffId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scope Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">ជម្រើសគ្រប់គ្រង (Scope Type)</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={scope === 'Employee'}
                        onChange={() => setScope('Employee')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>បុគ្គលិកម្នាក់ៗ (Employee)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={scope === 'Department'}
                        onChange={() => setScope('Department')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>ជាក្រុម/ដេប៉ាតឺម៉ង់ (Department)</span>
                    </label>
                  </div>
                </div>

                {/* Target Dropdowns depending on scope */}
                {scope === 'Employee' ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">ជ្រើសរើសបុគ្គលិកគោលដៅ (Target Employee)</label>
                    <select
                      value={targetStaffId}
                      onChange={(e) => setTargetStaffId(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                    >
                      {employees.map(emp => (
                        <option key={emp.staffId} value={emp.staffId} className="bg-slate-900">
                          {getLocalizedName(emp.nameEn, emp.nameKh)} (ID: {emp.staffId})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">ជ្រើសរើសដេប៉ាតឺម៉ង់គោលដៅ (Target Department)</label>
                    <select
                      value={targetDeptId}
                      onChange={(e) => setTargetDeptId(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                    >
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id} className="bg-slate-900">
                          {getLocalizedName(dept.nameEn, dept.nameKh)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-slate-950/40 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 text-xs font-semibold border border-white/10 text-slate-400 rounded-xl hover:bg-white/5 transition-colors font-khmer cursor-pointer bg-transparent"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-4 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-khmer cursor-pointer border-none outline-none disabled:opacity-50"
                >
                  {saving ? 'Saving...' : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalManage;
