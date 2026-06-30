import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, QrCodeIcon, CameraIcon } from '@heroicons/react/24/outline';

const Employees = () => {
  const { user } = useAuth();
  const { t, getLocalizedName, locale } = useLanguage();
  const isReadOnly = user.role === 'Manager';

  // Data States
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // QR / Face Modals State
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [faceStatus, setFaceStatus] = useState('idle'); // idle, loading_models, camera_ready, processing, success, error
  const [faceError, setFaceError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form State
  const [editId, setEditId] = useState(null);
  const [staffId, setStaffId] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameKh, setNameKh] = useState('');
  const [gender, setGender] = useState('Male');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [branch, setBranch] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [shift1Start, setShift1Start] = useState('08:00');
  const [shift1End, setShift1End] = useState('12:00');
  const [shift2Start, setShift2Start] = useState('13:00');
  const [shift2End, setShift2End] = useState('17:00');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let query = `?search=${search}`;
      if (filterDept) query += `&departmentId=${filterDept}`;
      if (filterBranch) query += `&branch=${filterBranch}`;
      if (filterStatus) query += `&status=${filterStatus}`;

      const response = await api.get(`/employees${query}`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const deptRes = await api.get('/departments');
      setDepartments(deptRes.data);

      const posRes = await api.get('/positions');
      setPositions(posRes.data);
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, filterDept, filterBranch, filterStatus]);

  // Filter positions matching selected department in Form Modal
  const availablePositions = positions.filter(pos => pos.departmentId === departmentId);

  // Sync position selection when department changes in form
  useEffect(() => {
    if (availablePositions.length > 0) {
      // If current position isn't in new list, pick first available
      if (!availablePositions.find(p => p.id === positionId)) {
        setPositionId(availablePositions[0].id);
      }
    } else {
      setPositionId('');
    }
  }, [departmentId, positions]);

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

  const handleOpenQrModal = async (emp) => {
    setSelectedEmp(emp);
    setQrImage('');
    setShowQrModal(true);
    try {
      const res = await api.get(`/qrcode/generate/${emp.staffId}`);
      setQrImage(res.data.qrImage);
    } catch (error) {
      console.error('Error generating QR image:', error);
    }
  };

  const handleOpenFaceModal = (emp) => {
    setSelectedEmp(emp);
    setFaceStatus('idle');
    setFaceError('');
    setShowFaceModal(true);
  };

  const startCamera = async () => {
    try {
      setFaceStatus('loading_models');
      if (!window.faceapi) {
        throw new Error('Face Recognition library loading. Please wait a second.');
      }

      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      if (!window.faceapi.nets.tinyFaceDetector.params) {
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      }
      if (!window.faceapi.nets.faceLandmark68Net.params) {
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      }
      if (!window.faceapi.nets.faceRecognitionNet.params) {
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      }

      setFaceStatus('camera_ready');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      streamRef.current = stream;
    } catch (err) {
      console.error(err);
      setFaceStatus('error');
      setFaceError(err.message || 'Error initializing camera or loading models');
    }
  };

  useEffect(() => {
    if (showFaceModal && selectedEmp) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [showFaceModal, selectedEmp]);

  const handleCaptureFace = async () => {
    if (!videoRef.current || !streamRef.current) return;
    setFaceStatus('processing');
    setFaceError('');
    try {
      const detection = await window.faceapi.detectSingleFace(
        videoRef.current,
        new window.faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please face the camera directly and try again.');
      }

      const descriptorArray = Array.from(detection.descriptor);

      await api.post('/face/enroll', {
        staffId: selectedEmp.staffId,
        faceDescriptor: descriptorArray
      });

      setFaceStatus('success');
      playSound('success');

      setTimeout(() => {
        handleCloseFaceModal();
      }, 2000);
    } catch (err) {
      console.error(err);
      setFaceStatus('camera_ready');
      setFaceError(err.message || 'Error scanning face');
      playSound('error');
    }
  };

  const handleCloseFaceModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;
    setShowFaceModal(false);
    setSelectedEmp(null);
  };

  const handleOpenAddModal = () => {
    setEditId(null);
    setStaffId('');
    setNameEn('');
    setNameKh('');
    setGender('Male');
    const firstDept = departments[0]?.id || '';
    setDepartmentId(firstDept);
    setBranch('Phnom Penh HQ');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setStatus('Active');
    setShift1Start('08:00');
    setShift1End('12:00');
    setShift2Start('13:00');
    setShift2End('17:00');
    setEmail('');
    setPassword('');
    setRole('Employee');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditId(emp.id);
    setStaffId(emp.staffId);
    setNameEn(emp.nameEn);
    setNameKh(emp.nameKh);
    setGender(emp.gender);
    setDepartmentId(emp.departmentId);
    setPositionId(emp.positionId);
    setBranch(emp.branch);
    setJoinDate(emp.joinDate ? emp.joinDate.split('T')[0] : '');
    setStatus(emp.status);
    setShift1Start(emp.shift1Start);
    setShift1End(emp.shift1End);
    setShift2Start(emp.shift2Start);
    setShift2End(emp.shift2End);
    setEmail(emp.email);
    setPassword(''); // leave blank
    setRole(emp.role);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId || !nameEn || !nameKh || !email || !departmentId || !positionId || (!editId && !password)) {
      setErrorMsg('Required fields are missing');
      return;
    }

    try {
      const payload = {
        staffId,
        nameEn,
        nameKh,
        gender,
        positionId,
        departmentId,
        branch,
        joinDate,
        status,
        shift1Start,
        shift1End,
        shift2Start,
        shift2End,
        email,
        role,
      };

      if (password) payload.password = password;

      if (editId) {
        await api.put(`/employees/${editId}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      setErrorMsg(error.response?.data?.message || 'Error saving employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("confirmDelete"))) return;

    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.response?.data?.message || 'Error deleting employee');
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center glass-card p-6 rounded-2xl glow-indigo gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-khmer">{t("employees")}</h2>
          <p className="text-slate-400 text-xs mt-1">Manage corporate personnel records</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-500/25 font-khmer cursor-pointer border-none outline-none"
          >
            <PlusIcon className="h-5 w-5" />
            {t("add")}
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-10 w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>

        {/* Department Filter */}
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
        >
          <option value="" className="bg-slate-900">{t("selectDept")} ({t("all")})</option>
          {departments.map(d => (
            <option key={d.id} value={d.id} className="bg-slate-900">{getLocalizedName(d.nameEn, d.nameKh)}</option>
          ))}
        </select>

        {/* Branch Filter */}
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
        >
          <option value="" className="bg-slate-900">{t("branch")} ({t("all")})</option>
          <option value="Phnom Penh HQ" className="bg-slate-900">Phnom Penh HQ</option>
          <option value="Siem Reap Branch" className="bg-slate-900">Siem Reap Branch</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
        >
          <option value="" className="bg-slate-900">{t("status")} ({t("all")})</option>
          <option value="Active" className="bg-slate-900">{t("active")}</option>
          <option value="Inactive" className="bg-slate-900">{t("inactive")}</option>
          <option value="Suspended" className="bg-slate-900">{t("suspended")}</option>
        </select>
      </div>

      {/* Employees Table List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-khmer">{t("loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs text-slate-300 uppercase border-b border-white/10">
                <tr>
                  <th className="py-4 px-6 font-khmer">{t("staffId")}</th>
                  <th className="py-4 px-6 font-khmer">{t("employees")}</th>
                  <th className="py-4 px-6 font-khmer">{t("gender")}</th>
                  <th className="py-4 px-6 font-khmer">{t("branch")}</th>
                  <th className="py-4 px-6 font-khmer">{t("status")}</th>
                  <th className="py-4 px-6 font-khmer">{t("joinDate")}</th>
                  {!isReadOnly && <th className="py-4 px-6 text-right font-khmer">{t("actions")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 6 : 7} className="py-6 text-center text-slate-500 font-khmer">
                      {t("noData")}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">{emp.staffId}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-white">
                            {getLocalizedName(emp.nameEn, emp.nameKh)}
                          </p>
                          <p className="text-xs text-slate-400">{emp.email} • {emp.role}</p>
                          <p className="text-xs font-semibold text-indigo-400">
                            {getLocalizedName(emp.department.nameEn, emp.department.nameKh)} • {getLocalizedName(emp.position.titleEn, emp.position.titleKh)}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-khmer text-slate-300">{emp.gender === 'Male' ? t("male") : emp.gender === 'Female' ? t("female") : t("other")}</td>
                      <td className="py-4 px-6 text-slate-300">{emp.branch}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-khmer ring-1 ${
                            emp.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
                              : emp.status === 'Inactive'
                              ? 'bg-slate-500/10 text-slate-400 ring-slate-500/20'
                              : 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
                          }`}
                        >
                          {emp.status === 'Active' ? t("active") : emp.status === 'Inactive' ? t("inactive") : t("suspended")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '-'}
                      </td>
                      {!isReadOnly && (
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleOpenQrModal(emp)}
                            className="inline-flex p-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/20 rounded-lg transition-colors cursor-pointer"
                            title="View QR Code"
                          >
                            <QrCodeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenFaceModal(emp)}
                            className="inline-flex p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Enroll Face Descriptor"
                          >
                            <CameraIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="inline-flex p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="inline-flex p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
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

      {/* Form Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 overflow-y-auto py-10">
          <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden glow-indigo my-auto">
            <div className="px-6 py-4 bg-slate-950/60 border-b border-white/10">
              <h3 className="font-bold text-white font-khmer">
                {editId ? t("edit") : t("add")} {t("employees")}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("staffId")} *</label>
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="EMP-001"
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("email")} *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@attendance.com"
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* Name EN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("nameEn")} *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Sok Mean"
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* Name KH */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("nameKh")} *</label>
                  <input
                    type="text"
                    required
                    value={nameKh}
                    onChange={(e) => setNameKh(e.target.value)}
                    placeholder="សុខ មាន"
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all font-khmer"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">
                    {t("password")} {editId ? `(${locale === 'kh' ? 'ស្រេចចិត្ត' : 'optional'})` : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("gender")}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                  >
                    <option value="Male" className="bg-slate-900">{t("male")}</option>
                    <option value="Female" className="bg-slate-900">{t("female")}</option>
                    <option value="Other" className="bg-slate-900">{t("other")}</option>
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("selectDept")} *</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id} className="bg-slate-900">{getLocalizedName(d.nameEn, d.nameKh)}</option>
                    ))}
                  </select>
                </div>

                {/* Position Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("selectPos")} *</label>
                  <select
                    value={positionId}
                    onChange={(e) => setPositionId(e.target.value)}
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                  >
                    {availablePositions.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{getLocalizedName(p.titleEn, p.titleKh)}</option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("branch")}</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Phnom Penh HQ"
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* Join Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("joinDate")}</label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">{t("status")}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all font-khmer"
                  >
                    <option value="Active" className="bg-slate-900">{t("active")}</option>
                    <option value="Inactive" className="bg-slate-900">{t("inactive")}</option>
                    <option value="Suspended" className="bg-slate-900">{t("suspended")}</option>
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-khmer">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full py-2 px-3 border border-white/10 bg-slate-950/60 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-slate-900 outline-none transition-all"
                  >
                    <option value="Employee" className="bg-slate-900">Employee</option>
                    <option value="Manager" className="bg-slate-900">Manager</option>
                    <option value="HR" className="bg-slate-900">HR</option>
                    <option value="Admin" className="bg-slate-900">Admin</option>
                  </select>
                </div>
              </div>

              {/* Shift definitions */}
              <div className="border-t border-white/10 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-khmer">Shift Times Configuration</h4>
                
                <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                  {/* Shift 1 */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-khmer">{t("shift1")}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-0.5">{t("start")}</label>
                        <input
                          type="time"
                          value={shift1Start}
                          onChange={(e) => setShift1Start(e.target.value)}
                          className="block w-full py-1.5 px-2 border border-white/10 bg-slate-950/60 text-white rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-0.5">{t("end")}</label>
                        <input
                          type="time"
                          value={shift1End}
                          onChange={(e) => setShift1End(e.target.value)}
                          className="block w-full py-1.5 px-2 border border-white/10 bg-slate-950/60 text-white rounded-lg outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shift 2 */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase font-khmer">{t("shift2")}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-0.5">{t("start")}</label>
                        <input
                          type="time"
                          value={shift2Start}
                          onChange={(e) => setShift2Start(e.target.value)}
                          className="block w-full py-1.5 px-2 border border-white/10 bg-slate-950/60 text-white rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-0.5">{t("end")}</label>
                        <input
                          type="time"
                          value={shift2End}
                          onChange={(e) => setShift2End(e.target.value)}
                          className="block w-full py-1.5 px-2 border border-white/10 bg-slate-950/60 text-white rounded-lg outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 text-xs font-semibold border border-white/10 text-slate-400 rounded-xl hover:bg-white/5 transition-colors font-khmer cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-500/25 font-khmer cursor-pointer border-none outline-none"
                >
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden glow-indigo">
            <div className="px-6 py-4 bg-slate-950/60 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-white font-khmer">QR Code Badge</h3>
              <button 
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-6 flex flex-col items-center space-y-4">
              <p className="text-sm font-semibold text-white font-khmer">
                {getLocalizedName(selectedEmp.nameEn, selectedEmp.nameKh)} ({selectedEmp.staffId})
              </p>
              {qrImage ? (
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img src={qrImage} alt="QR Code Badge" className="w-48 h-48" />
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-sm font-khmer">
                  {t("loading")}
                </div>
              )}
              <p className="text-[11px] text-slate-400 text-center font-khmer leading-relaxed">
                Scan this QR badge at the Office Entrance Kiosk to check in or check out.
              </p>
              {qrImage && (
                <a
                  href={qrImage}
                  download={`QR_Badge_${selectedEmp.staffId}.png`}
                  className="w-full py-2.5 px-4 text-center text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md shadow-cyan-500/25 font-khmer"
                >
                  Download QR Code
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Face Capture Modal */}
      {showFaceModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
          <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden glow-indigo">
            <div className="px-6 py-4 bg-slate-950/60 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-white font-khmer">Enroll Face: {selectedEmp.nameEn}</h3>
              <button 
                onClick={handleCloseFaceModal}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative aspect-video rounded-xl border border-white/10 bg-slate-950/80 overflow-hidden flex items-center justify-center">
                {faceStatus === 'loading_models' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 font-khmer bg-slate-950/90 z-10 text-xs">
                    <span className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></span>
                    <span>Initializing Face AI Models...</span>
                  </div>
                )}
                {faceStatus === 'processing' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 font-khmer bg-slate-950/90 z-10 text-xs">
                    <span className="animate-pulse text-indigo-400 font-bold">Scanning Face Coordinates...</span>
                  </div>
                )}
                {faceStatus === 'success' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-400 gap-2 font-khmer bg-slate-950/90 z-10 text-sm">
                    <span className="text-3xl">✅</span>
                    <span className="font-bold">Face Enrolled Successfully!</span>
                  </div>
                )}
                
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              </div>

              {faceError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 text-center font-khmer">
                  {faceError}
                </div>
              )}

              <div className="text-[11px] text-slate-400 font-khmer text-center">
                {faceStatus === 'camera_ready' && "Position your face in the center of the frame and click 'Capture'."}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseFaceModal}
                  className="py-2 px-4 text-xs font-semibold border border-white/10 text-slate-400 rounded-xl hover:bg-white/5 transition-colors font-khmer cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  disabled={faceStatus !== 'camera_ready'}
                  onClick={handleCaptureFace}
                  className="py-2 px-4 text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/25 font-khmer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none outline-none"
                >
                  Capture and Enroll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
