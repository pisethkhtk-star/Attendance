import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { formatTime12Hour } from './Attendance';

const Dashboard = () => {
  const { user } = useAuth();
  const { t, getLocalizedName } = useLanguage();

  // Statistics State
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    earlyLeaveToday: 0,
    onLeaveToday: 0,
  });

  // Time logging details
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');
  
  // Daily log state
  const [todayLogs, setTodayLogs] = useState([]);
  const [personalTodayLog, setPersonalTodayLog] = useState(null);
  
  const [_loading, setLoading] = useState(true);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const options = { timeZone: 'Asia/Phnom_Penh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const dateOptions = { timeZone: 'Asia/Phnom_Penh', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', options));
      setLiveDate(now.toLocaleDateString('en-US', dateOptions));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stats & today's logs if admin, HR, or manager
      if (user.role !== 'Employee') {
        const statsRes = await api.get('/attendances/stats');
        setStats(statsRes.data);

        const logsRes = await api.get('/attendances/today');
        setTodayLogs(logsRes.data);
      }

      // Fetch personal today log for the logged-in employee
      const personalHistory = await api.get(`/attendances/history?staffId=${user.staffId}&startDate=${new Date().toISOString().split('T')[0]}`);
      if (personalHistory.data && personalHistory.data.length > 0) {
        setPersonalTodayLog(personalHistory.data[0]);
      } else {
        setPersonalTodayLog(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);



  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner with Clock & Greetings */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900/40 border border-white/10 text-white rounded-2xl shadow-xl gap-4 relative overflow-hidden glow-indigo">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-[80px] pointer-events-none"></div>
        <div className="z-10">
          <h2 className="text-xl md:text-2xl font-bold font-khmer">
            {t("welcome")}, {getLocalizedName(user.nameEn, user.nameKh)}!
          </h2>
          <p className="text-slate-400 text-sm mt-1">{liveDate}</p>
        </div>
        <div className="z-10 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 text-center font-mono">
          <span className="text-3xl font-bold tracking-widest text-indigo-300">{liveTime}</span>
          <span className="block text-[10px] uppercase text-indigo-400 font-semibold tracking-widest mt-1">Phnom Penh (GMT+7)</span>
        </div>
      </div>

      {/* Stats Cards (For Admins/HR/Managers) */}
      {user.role !== 'Employee' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 ring-1 ring-indigo-500/20">
              <UsersIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium font-khmer">{t("totalEmployees")}</p>
              <h3 className="text-xl font-bold mt-1 text-white">{stats.totalEmployees}</h3>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 ring-1 ring-emerald-500/20">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium font-khmer">{t("presentToday")}</p>
              <h3 className="text-xl font-bold mt-1 text-emerald-400">{stats.presentToday}</h3>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 ring-1 ring-amber-500/20">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium font-khmer">{t("lateToday")}</p>
              <h3 className="text-xl font-bold mt-1 text-amber-400">{stats.lateToday}</h3>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 ring-1 ring-rose-500/20">
              <ExclamationCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium font-khmer">{t("earlyLeaveToday")}</p>
              <h3 className="text-xl font-bold mt-1 text-rose-400">{stats.earlyLeaveToday}</h3>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4 col-span-2 lg:col-span-1">
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 ring-1 ring-sky-500/20">
              <CalendarDaysIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium font-khmer">{t("onLeaveToday")}</p>
              <h3 className="text-xl font-bold mt-1 text-sky-400">{stats.onLeaveToday}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Console & Check-in / Check-out actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Console */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col justify-between glow-indigo">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="font-bold text-white flex items-center gap-2 font-khmer">
                <ClockIcon className="h-5 w-5 text-indigo-400" />
                វត្តមានថ្ងៃនេះ (Today's Attendance Status)
              </h3>
            </div>

            {/* Shift profile display */}
            <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-slate-950/40 border border-white/5 rounded-xl text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider">{t("shift1")}</p>
                <p className="text-slate-200 font-semibold mt-1">
                  {user.shift1Start} - {user.shift1End}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider">{t("shift2")}</p>
                <p className="text-slate-200 font-semibold mt-1">
                  {user.shift2Start} - {user.shift2End}
                </p>
              </div>
            </div>

            {/* Logs Today state */}
            <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-slate-400 font-medium font-khmer">{t("checkin1")}</p>
                <p className={`font-bold mt-1 ${personalTodayLog?.checkin1 ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {personalTodayLog?.checkin1 ? formatTime12Hour(personalTodayLog.checkin1) : t("notLogged")}
                </p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-slate-400 font-medium font-khmer">{t("checkout1")}</p>
                <p className={`font-bold mt-1 ${personalTodayLog?.checkout1 ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {personalTodayLog?.checkout1 ? formatTime12Hour(personalTodayLog.checkout1) : t("notLogged")}
                </p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-slate-400 font-medium font-khmer">{t("checkin2")}</p>
                <p className={`font-bold mt-1 ${personalTodayLog?.checkin2 ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {personalTodayLog?.checkin2 ? formatTime12Hour(personalTodayLog.checkin2) : t("notLogged")}
                </p>
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <p className="text-slate-400 font-medium font-khmer">{t("checkout2")}</p>
                <p className={`font-bold mt-1 ${personalTodayLog?.checkout2 ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {personalTodayLog?.checkout2 ? formatTime12Hour(personalTodayLog.checkout2) : t("notLogged")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Indicators Card / Personal Status */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between glow-indigo">
          <div>
            <h3 className="font-bold text-white pb-4 border-b border-white/10 font-khmer">
              សូចនាករថ្ងៃនេះ (Daily Indicators)
            </h3>
            
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200 font-khmer">ស្ថានភាពចុះវត្តមានយឺត (Late Status)</p>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated by checking system</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    personalTodayLog?.isLate
                      ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
                  }`}
                >
                  {personalTodayLog?.isLate ? t("late") : t("normal")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200 font-khmer">ស្ថានភាពចេញមុន (Early Leave)</p>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated by checkout shifts</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    personalTodayLog?.isEarlyLeave
                      ? 'bg-rose-500/10 text-rose-300 ring-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
                  }`}
                >
                  {personalTodayLog?.isEarlyLeave ? t("earlyLeave") : t("normal")}
                </span>
              </div>

              {personalTodayLog?.note && (
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <p className="text-xs font-bold text-indigo-400 font-khmer">កំណត់សម្គាល់ថ្ងៃនេះ (Today's note):</p>
                  <p className="text-xs text-indigo-300 mt-1">{personalTodayLog.note}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-950/40 border border-white/5 rounded-xl text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Logged Account Profile</span>
            <span className="text-sm font-bold text-indigo-300 block mt-1">{user.staffId}</span>
            <span className="text-xs text-slate-400 block mt-0.5">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Live Table (For HR/Admin/Managers to view today's check-ins) */}
      {user.role !== 'Employee' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="font-bold text-white font-khmer">
              {t("attendanceSummary")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs text-slate-300 uppercase border-b border-white/10">
                <tr>
                  <th className="py-4 px-6 font-khmer">{t("staffId")}</th>
                  <th className="py-4 px-6 font-khmer">{t("employees")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkin1")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkout1")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkin2")}</th>
                  <th className="py-4 px-6 font-khmer">{t("checkout2")}</th>
                  <th className="py-4 px-6 font-khmer">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {todayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-khmer">
                      {t("noData")}
                    </td>
                  </tr>
                ) : (
                  todayLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">{log.employee.staffId}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-white">
                            {getLocalizedName(log.employee.nameEn, log.employee.nameKh)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {getLocalizedName(log.employee.department.nameEn, log.employee.department.nameKh)} • {getLocalizedName(log.employee.position.titleEn, log.employee.position.titleKh)}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">{formatTime12Hour(log.checkin1)}</td>
                      <td className="py-4 px-6">{formatTime12Hour(log.checkout1)}</td>
                      <td className="py-4 px-6">{formatTime12Hour(log.checkin2)}</td>
                      <td className="py-4 px-6">{formatTime12Hour(log.checkout2)}</td>
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
                        {!log.isLate && !log.isEarlyLeave && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/20 font-khmer">
                            {t("normal")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
