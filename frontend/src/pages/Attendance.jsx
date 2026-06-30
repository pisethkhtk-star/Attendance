import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MagnifyingGlassIcon, CalendarIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const Attendance = () => {
  const { user, hasPermission } = useAuth();
  const { t, getLocalizedName } = useLanguage();

  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [checkin1, setCheckin1] = useState('');
  const [checkout1, setCheckout1] = useState('');
  const [checkin2, setCheckin2] = useState('');
  const [checkout2, setCheckout2] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [newStaffId, setNewStaffId] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newCheckin1, setNewCheckin1] = useState('');
  const [newCheckout1, setNewCheckout1] = useState('');
  const [newCheckin2, setNewCheckin2] = useState('');
  const [newCheckout2, setNewCheckout2] = useState('');
  const [newNote, setNewNote] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(() => {
    // Default to start of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [filterDept, setFilterDept] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = `?startDate=${startDate}&endDate=${endDate}`;
      if (user.role === 'Employee') {
        query += `&staffId=${user.staffId}`;
      } else {
        if (search) query += `&staffId=${search}`;
        if (filterDept) query += `&departmentId=${filterDept}`;
        if (filterBranch) query += `&branch=${filterBranch}`;
      }

      const response = await api.get(`/attendances/history${query}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading attendance logs:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenEditModal = (log) => {
    setSelectedLog(log);
    setCheckin1(log.checkin1 || '');
    setCheckout1(log.checkout1 || '');
    setCheckin2(log.checkin2 || '');
    setCheckout2(log.checkout2 || '');
    setNote(log.note || '');
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.put(`/attendances/${selectedLog.id}`, {
        checkin1,
        checkout1,
        checkin2,
        checkout2,
        note
      });

      setLogs(prev => prev.map(item => {
        if (item.id === selectedLog.id) {
          return {
            ...item,
            ...res.data.data
          };
        }
        return item;
      }));

      playSound('success');
      setShowEditModal(false);
      setSelectedLog(null);
    } catch (error) {
      console.error('Error saving attendance log:', error);
      setErrorMsg(error.response?.data?.message || 'Error updating record');
      playSound('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddModal = async () => {
    setErrorMsg('');
    setNewStaffId('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewCheckin1('');
    setNewCheckout1('');
    setNewCheckin2('');
    setNewCheckout2('');
    setNewNote('');
    setShowAddModal(true);

    try {
      const res = await api.get('/employees');
      setEmployeesList(res.data);
      if (res.data.length > 0) {
        setNewStaffId(res.data[0].staffId);
      }
    } catch (err) {
      console.error('Error fetching employees list:', err);
    }
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    if (!newStaffId) {
      setErrorMsg('Please select or enter an employee (សូមជ្រើសរើសបុគ្គលិក)');
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/attendances', {
        staffId: newStaffId,
        attendanceDate: newDate,
        checkin1: newCheckin1,
        checkout1: newCheckout1,
        checkin2: newCheckin2,
        checkout2: newCheckout2,
        note: newNote
      });

      setLogs(prev => [res.data.data, ...prev]);

      playSound('success');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating attendance log:', error);
      setErrorMsg(error.response?.data?.message || 'Error creating record');
      playSound('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this attendance log? (តើអ្នកប្រាកដជាចង់លុបវត្តមាននេះមែនទេ?)')) {
      return;
    }

    try {
      await api.delete(`/attendances/${logId}`);
      setLogs(prev => prev.filter(item => item.id !== logId));
      playSound('success');
    } catch (error) {
      console.error('Error deleting attendance log:', error);
      alert('Failed to delete attendance log.');
      playSound('error');
    }
  };

  const fetchMetadata = async () => {
    try {
      if (user.role !== 'Employee') {
        const response = await api.get('/departments');
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate, search, filterDept, filterBranch]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Title Block */}
      <div className="glass-card p-6 rounded-2xl glow-indigo flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white font-khmer">{t("attendance")}</h2>
          <p className="text-slate-400 text-xs mt-1">Review check-in history logs and shifts compliance</p>
        </div>
        {hasPermission('add_attendance') && (
          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-5 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/25 font-khmer border-none outline-none cursor-pointer flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Attendance</span>
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="glass-card p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date Filters */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("startDate")}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("endDate")}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>

        {/* HR/Admin query parameters */}
        {user.role !== 'Employee' ? (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("staffId")}</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. EMP-001"
                  className="pl-9 w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("departments")}</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
              >
                <option value="">{t("selectDept")} ({t("all")})</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-900">{getLocalizedName(d.nameEn, d.nameKh)}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="md:col-span-2 flex items-center justify-end p-4 bg-slate-950/40 border border-white/5 rounded-xl text-xs font-medium text-slate-400 font-khmer">
            🔍 កំពុងបង្ហាញកំណត់ត្រាវត្តមានសម្រាប់គណនីរបស់អ្នកផ្ទាល់ ({user.staffId})
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-khmer">{t("loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs text-slate-300 uppercase border-b border-white/10">
                <tr>
                  <th className="py-4 px-6 font-khmer">{t("leaveDate")}</th>
                  {user.role !== 'Employee' && <th className="py-4 px-6 font-khmer">{t("staffId")}</th>}
                  {user.role !== 'Employee' && <th className="py-4 px-6 font-khmer">{t("employees")}</th>}
                  <th className="py-4 px-6 font-khmer">{t("checkin1")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkout1")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkin2")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkout2")}</th>
                  <th className="py-4 px-6 font-khmer">{t("status")}</th>
                  <th className="py-4 px-6 font-khmer">{t("description")}</th>
                  {(hasPermission('edit_attendance') || hasPermission('delete_attendance')) && <th className="py-4 px-6 font-khmer text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={user.role === 'Employee' ? 7 : ((hasPermission('edit_attendance') || hasPermission('delete_attendance')) ? 10 : 9)} className="py-6 text-center text-slate-500 font-khmer">
                      {t("noData")}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">
                        {new Date(log.attendanceDate).toLocaleDateString()}
                      </td>
                      {user.role !== 'Employee' && (
                        <td className="py-4 px-6 font-semibold text-white">
                          {log.employee.staffId}
                        </td>
                      )}
                      {user.role !== 'Employee' && (
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-white">
                              {getLocalizedName(log.employee.nameEn, log.employee.nameKh)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {getLocalizedName(log.employee.department.nameEn, log.employee.department.nameKh)}
                            </p>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-6">{log.checkin1 || '-'}</td>
                      <td className="py-4 px-6">{log.checkout1 || '-'}</td>
                      <td className="py-4 px-6">{log.checkin2 || '-'}</td>
                      <td className="py-4 px-6">{log.checkout2 || '-'}</td>
                      <td className="py-4 px-6 space-y-1">
                        {log.isLate && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/20 font-khmer">
                            {t("late")}
                          </span>
                        )}
                        {log.isEarlyLeave && (
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/20 font-khmer ml-1">
                            {t("earlyLeave")}
                          </span>
                        )}
                        {!log.isLate && !log.isEarlyLeave && (log.checkin1 || log.checkin2) && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/20 font-khmer">
                            {t("normal")}
                          </span>
                        )}
                        {!(log.checkin1 || log.checkin2) && (
                          <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-500/20 font-khmer">
                            On Leave / Absent
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs italic text-slate-400">{log.note || '-'}</td>
                      {(hasPermission('edit_attendance') || hasPermission('delete_attendance')) && (
                        <td className="py-4 px-6 text-right space-x-2">
                          {hasPermission('edit_attendance') && (
                            <button
                              onClick={() => handleOpenEditModal(log)}
                              className="inline-flex p-2 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 rounded-xl text-indigo-400 transition-colors cursor-pointer"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('delete_attendance') && (
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="inline-flex p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 rounded-xl text-rose-400 transition-colors cursor-pointer"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Attendance Record Modal */}
      {showEditModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl glow-indigo border border-white/10">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-slate-950/40">
              <h3 className="text-lg font-bold text-white font-khmer">កែប្រែទិន្នន័យវត្តមាន (Edit Attendance)</h3>
              <p className="text-xs text-slate-400 mt-1">
                {getLocalizedName(selectedLog.employee.nameEn, selectedLog.employee.nameKh)} (ID: {selectedLog.employee.staffId}) - {new Date(selectedLog.attendanceDate).toLocaleDateString()}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-khmer">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Shift 1 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check In 1</label>
                    <input
                      type="text"
                      placeholder="e.g. 08:00:00"
                      value={checkin1}
                      onChange={(e) => setCheckin1(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check Out 1</label>
                    <input
                      type="text"
                      placeholder="e.g. 12:00:00"
                      value={checkout1}
                      onChange={(e) => setCheckout1(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Shift 2 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check In 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 13:00:00"
                      value={checkin2}
                      onChange={(e) => setCheckin2(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check Out 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 17:00:00"
                      value={checkout2}
                      onChange={(e) => setCheckout2(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Description Note */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("description")}</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Provide a reason for modification..."
                    className="w-full h-20 py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-khmer resize-none"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-slate-950/40 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="py-2.5 px-5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-khmer cursor-pointer border-none outline-none"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/25 font-khmer border-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'រក្សាទុក (Save Changes)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attendance Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl glow-indigo border border-white/10">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-slate-950/40">
              <h3 className="text-lg font-bold text-white font-khmer">បន្ថែមទិន្នន័យវត្តមាន (Add Attendance)</h3>
              <p className="text-xs text-slate-400 mt-1">Manually log a new attendance record for an employee.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAdd}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-khmer">
                    {errorMsg}
                  </div>
                )}

                {/* Employee select */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("employees")}</label>
                  <select
                    value={newStaffId}
                    onChange={(e) => setNewStaffId(e.target.value)}
                    className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                  >
                    <option value="">Select Employee...</option>
                    {employeesList.map(emp => (
                      <option key={emp.id} value={emp.staffId} className="bg-slate-900">
                        {emp.staffId} - {getLocalizedName(emp.nameEn, emp.nameKh)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Date */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Date (ថ្ងៃខែឆ្នាំ)</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Shift 1 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check In 1</label>
                    <input
                      type="text"
                      placeholder="e.g. 08:00:00"
                      value={newCheckin1}
                      onChange={(e) => setNewCheckin1(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check Out 1</label>
                    <input
                      type="text"
                      placeholder="e.g. 12:00:00"
                      value={newCheckout1}
                      onChange={(e) => setNewCheckout1(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Shift 2 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check In 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 13:00:00"
                      value={newCheckin2}
                      onChange={(e) => setNewCheckin2(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">Check Out 2</label>
                    <input
                      type="text"
                      placeholder="e.g. 17:00:00"
                      value={newCheckout2}
                      onChange={(e) => setNewCheckout2(e.target.value)}
                      className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Description Note */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase font-khmer">{t("description")}</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Provide a description note for manual checkin..."
                    className="w-full h-20 py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-khmer resize-none"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-slate-950/40 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-khmer cursor-pointer border-none outline-none"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md shadow-indigo-500/25 font-khmer border-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'រក្សាទុក (Save Changes)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
