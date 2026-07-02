import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { QrCodeIcon, CameraIcon, ClockIcon, MapPinIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Html5Qrcode } from 'html5-qrcode';

// Helper: display Khmer name if available, otherwise English
const getLocalizedName = (nameEn, nameKh) => {
  if (nameKh && nameKh.trim()) return nameKh.trim();
  return nameEn || '';
};

const Kiosk = () => {
  const { hasPermission } = useAuth(); // destructure hasPermission for permission-guarded UI
  const [activeTab, setActiveTab] = useState('face'); // face, qrcode

  // Real-time Clock State
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Scanning State
  const [scanLock, setScanLock] = useState(false);
  const scanLockRef = useRef(false); // ref mirror to avoid stale closure in setInterval
  const [scanError, setScanError] = useState('');
  const [faceStatus, setFaceStatus] = useState('idle'); // idle, loading_models, scanning, error
  const [successResult, setSuccessResult] = useState(null);

  // Geolocation State
  const [coords, setCoords] = useState(null);
  const coordsRef = useRef(null); // ref mirror so interval always reads latest coords
  const [locationError, setLocationError] = useState('');

  // References for Media and HTML5 QR
  const videoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceIntervalRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Keep coordsRef in sync with state so setInterval closures always read latest coords
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  // Keep scanLockRef in sync with state so setInterval closures always read latest lock
  useEffect(() => {
    scanLockRef.current = scanLock;
  }, [scanLock]);

  // Geolocation tracker with fallback for low accuracy (crucial for desktops without GPS cards)
  const requestLocation = (highAccuracy = true) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const c = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCoords(c);
          coordsRef.current = c;
          setLocationError('');
        },
        (error) => {
          console.error(`Error fetching location (highAccuracy=${highAccuracy}):`, error);
          if (highAccuracy && error.code !== error.PERMISSION_DENIED) {
            // Retry with low accuracy (uses WiFi/IP geo) if high accuracy times out/fails
            requestLocation(false);
          } else {
            setLocationError('Enable GPS / Location access on this device');
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 5000 }
      );
    } else {
      setLocationError('Geolocation not supported by this browser.');
    }
  };

  // Digital clock & Geolocation tracking
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Initial fetch
    requestLocation(true);

    // Continuously watch the position (more responsive than setInterval polling)
    let watchId = null;
    const startWatching = (highAccuracy = true) => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const c = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setCoords(c);
            coordsRef.current = c;
            setLocationError('');
          },
          (error) => {
            console.error(`WatchPosition error (highAccuracy=${highAccuracy}):`, error);
            if (highAccuracy && error.code !== error.PERMISSION_DENIED) {
              if (watchId !== null) navigator.geolocation.clearWatch(watchId);
              startWatching(false);
            } else {
              setLocationError('Enable GPS / Location access on this device');
            }
          },
          { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: 10000 }
        );
      }
    };

    startWatching(true);

    return () => {
      clearInterval(interval);
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Web Audio buzzer sound generator
  const playSound = (type = 'success') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.16);
        setTimeout(() => { osc.stop(); ctx.close(); }, 200);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      }
    } catch (err) {
      console.error('Audio feedback error:', err);
    }
  };

  // Process Success Result Modal
  const triggerSuccessModal = (result) => {
    playSound('success');
    setSuccessResult(result);
    setScanLock(true);
    setScanError('');

    // Stop scanners temporarily while success modal is open
    stopFaceRecognition();
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      qrScannerRef.current.pause();
    }

    setTimeout(() => {
      setSuccessResult(null);
      setScanLock(false);
      // Restart correct scanner
      if (activeTab === 'face') {
        startFaceRecognition();
      } else if (qrScannerRef.current) {
        qrScannerRef.current.resume();
      }
    }, 3500);
  };

  // Process QR Code Scans
  const handleQrScan = async (decodedText) => {
    if (scanLock) return;
    if (!coords) {
      playSound('error');
      setScanError('កំពុងស្វែងរកទីតាំង GPS... សូមរង់ចាំមួយភ្លែត ឬបើក Location Access លើ browser (Acquiring location...)');
      requestLocation(true);
      return;
    }
    try {
      const response = await api.post('/qrcode/scan', {
        qrToken: decodedText,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      if (response.data.success) {
        triggerSuccessModal(response.data);
      } else {
        throw new Error(response.data.message || 'QR Scan failed');
      }
    } catch (error) {
      console.error('QR Scan API error:', error);
      playSound('error');
      setScanError(error.response?.data?.message || error.message || 'Invalid or expired QR code badge');
    }
  };

  // Process Face Recognition embedding check
  const handleFaceCheckIn = async (descriptorArray) => {
    // Use ref to avoid stale closure
    if (scanLockRef.current) return;
    const currentCoords = coordsRef.current;
    if (!currentCoords) {
      playSound('error');
      setScanError('កំពុងស្វែងរកទីតាំង GPS... សូមរង់ចាំមួយភ្លែត ឬបើក Location Access លើ browser (Acquiring location...)');
      requestLocation(true);
      return;
    }
    try {
      const response = await api.post('/face/checkin', {
        faceDescriptor: descriptorArray,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude
      });
      if (response.data.success) {
        triggerSuccessModal(response.data);
      } else {
        throw new Error(response.data.message || 'Face Check-in failed');
      }
    } catch (error) {
      console.error('Face Check-in API error:', error);
      playSound('error');
      setScanError(error.response?.data?.message || error.message || 'Face scan verification failed');
    }
  };

  // Face recognition engine handlers
  const startFaceRecognition = async () => {
    try {
      setFaceStatus('loading_models');
      setScanError('');

      // Wait up to 10s for CDN script to finish loading (defer attribute causes timing issues)
      let waited = 0;
      while (!window.faceapi && waited < 10000) {
        await new Promise(resolve => setTimeout(resolve, 200));
        waited += 200;
      }
      if (!window.faceapi) {
        throw new Error('Face recognition library (face-api.js) failed to load. Check internet connection.');
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

      setFaceStatus('scanning');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      faceStreamRef.current = stream;

      // Scan every 1.5 seconds — use refs to avoid stale closure
      faceIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || scanLockRef.current) return;
        try {
          const detection = await window.faceapi.detectSingleFace(
            videoRef.current,
            new window.faceapi.TinyFaceDetectorOptions()
          ).withFaceLandmarks().withFaceDescriptor();

          if (detection) {
            const descriptorArray = Array.from(detection.descriptor);
            await handleFaceCheckIn(descriptorArray);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setFaceStatus('error');
      setScanError(err.message || 'Camera hardware authorization or loading models failed');
    }
  };

  const stopFaceRecognition = () => {
    if (faceIntervalRef.current) {
      clearInterval(faceIntervalRef.current);
      faceIntervalRef.current = null;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(track => track.stop());
      faceStreamRef.current = null;
    }
  };

  // QR scanner engine handlers
  const startQrScanner = () => {
    setScanError('');
    const html5Qrcode = new Html5Qrcode("qr-reader");
    qrScannerRef.current = html5Qrcode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5Qrcode.start(
      { facingMode: "user" },
      config,
      async (decodedText) => {
        handleQrScan(decodedText);
      },
      () => {
        // Quiet mode
      }
    ).catch(err => {
      console.error("QR scanner start error:", err);
      setScanError("Failed to access camera for QR Code Scanner");
    });
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch (err) {
        console.error(err);
      }
      qrScannerRef.current = null;
    }
  };

  // Sync scanners with active tab
  useEffect(() => {
    if (activeTab === 'face') {
      stopQrScanner().then(() => {
        startFaceRecognition();
      });
    } else {
      stopFaceRecognition();
      setTimeout(() => {
        startQrScanner();
      }, 300);
    }

    return () => {
      stopFaceRecognition();
      stopQrScanner();
    };
  }, [activeTab]);

  return (
    <div className="min-h-[85vh] flex flex-col justify-between items-center text-slate-100 relative">
      {/* Kiosk Clock Banner */}
      <div className="w-full text-center space-y-2 mt-4 relative">

        {/* Permission-guarded: Link to Geofencing Settings Page */}
        {hasPermission('kiosk_settings') && (
          <Link
            to="/kiosk-settings"
            className="absolute top-2 right-4 flex items-center gap-1.5 p-2 px-3 bg-slate-900/60 text-slate-400 hover:text-indigo-400 border border-white/10 hover:border-indigo-500/30 rounded-xl transition-all cursor-pointer z-20 text-xs font-semibold font-khmer"
            title="Configure Kiosk Geolocation Limits"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Geofence Settings</span>
          </Link>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 text-indigo-300 font-khmer text-xs">
            <ClockIcon className="h-4 w-4 animate-pulse" />
            <span>KIOSK ACTIVE scan mode</span>
          </div>

          {/* Geolocation Status Badge */}
          {coords ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20 text-emerald-300 font-khmer text-[11px]">
              <MapPinIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>📍 GPS Active ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-rose-500/10 px-3.5 py-1 rounded-full border border-rose-500/20 text-rose-300 font-khmer text-[11px] animate-pulse">
              <MapPinIcon className="h-3.5 w-3.5 text-rose-400" />
              <span>⚠️ GPS Offline — {locationError || 'Acquiring location...'}</span>
            </div>
          )}
        </div>

        <h1 className="text-4xl font-extrabold text-white tracking-widest tabular-nums mt-2">
          {timeStr}
        </h1>
        <p className="text-slate-400 font-khmer text-xs">
          {dateStr}
        </p>
      </div>

      {/* Main Scanner Container */}
      <div className="w-full max-w-lg glass-card rounded-3xl overflow-hidden glow-indigo my-6 relative flex flex-col items-center">
        {/* Success Scan Slide Modal Overlay */}
        {successResult && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <span className="text-5xl animate-bounce">🎉</span>
            <h2 className="text-2xl font-bold text-emerald-400 font-khmer mt-4">
              ស្កេនបានជោគជ័យ! (Scan Success)
            </h2>

            <div className="mt-6 space-y-2 max-w-xs bg-slate-900/60 p-5 rounded-2xl border border-white/10 w-full">
              <p className="text-xs text-slate-400 font-khmer">ឈ្មោះបុគ្គលិក (Employee):</p>
              <p className="text-lg font-bold text-white">
                {getLocalizedName(successResult.employee.nameEn, successResult.employee.nameKh)}
              </p>
              <div className="h-px bg-white/5 my-2"></div>

              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-khmer">អត្តលេខ (ID):</span>
                <span className="font-semibold">{successResult.employee.staffId}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-khmer">ផ្នែក (Dept):</span>
                <span className="font-semibold">{successResult.employee.department}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-khmer">សកម្មភាព (Action):</span>
                <span className="font-semibold text-emerald-300 uppercase">{successResult.action}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span className="font-khmer">ម៉ោងស្កេន (Time):</span>
                <span className="font-semibold">{successResult.timeString}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-khmer mt-8 animate-pulse">
              ម៉ាស៊ីននឹងចាប់ផ្តើមស្កេនឡើងវិញក្នុងពេលបន្តិចទៀត...
            </p>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 w-full">
          <button
            onClick={() => setActiveTab('face')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all cursor-pointer font-khmer border-none outline-none ${
              activeTab === 'face'
                ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CameraIcon className="h-5 w-5" />
            Face Scan
          </button>
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all cursor-pointer font-khmer border-none outline-none ${
              activeTab === 'qrcode'
                ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCodeIcon className="h-5 w-5" />
            QR Scan
          </button>
        </div>

        {/* Scanning Window Frame */}
        <div className="p-6 w-full flex flex-col items-center">
          <div className="relative w-full aspect-video md:aspect-[4/3] rounded-2xl border border-white/10 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
            {/* Overlay indicators */}
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-indigo-500/20 m-6 rounded-xl flex items-center justify-center">
              {activeTab === 'face' && (
                <div className="w-40 h-40 rounded-full border border-indigo-500/30 animate-pulse"></div>
              )}
            </div>

            {/* Face Recognition view states */}
            {activeTab === 'face' && (
              <>
                {faceStatus === 'loading_models' && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-3 text-slate-400 z-10 text-xs">
                    <span className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-500 border-t-transparent"></span>
                    <span className="font-khmer">កំពុងទាញយកម៉ូដែលមុខ (Loading Face AI Models)...</span>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              </>
            )}

            {/* QR Scanner view state */}
            {activeTab === 'qrcode' && (
              <div id="qr-reader" className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
            )}
          </div>

          {/* Error Message display block */}
          {scanError && (
            <div className="mt-4 w-full rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 text-center font-khmer">
              ⚠️ {scanError}
            </div>
          )}

          {/* Status indicators */}
          <div className="mt-4 text-xs font-semibold text-slate-400 font-khmer flex gap-2 items-center">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            {activeTab === 'face' ? "កំពុងស្កេនផ្ទៃមុខស្វ័យប្រវត្តិ (Scanning faces auto)..." : "សូមបង្ហាញកូដ QR របស់លោកអ្នក (Show QR code badge)"}
          </div>
        </div>
      </div>

      {/* Helpful Instructions footer */}
      <div className="w-full max-w-md text-center bg-slate-950/40 p-4 rounded-xl border border-white/5 text-slate-400 text-[10px] font-khmer leading-relaxed mb-4">
        {activeTab === 'face'
          ? "គន្លឹះ៖ សូមឈរចំពីមុខកាមេរ៉ា និងធានាថាពន្លឺគ្រប់គ្រាន់ដើម្បីឱ្យប្រព័ន្ធចាប់មុខបានលឿន។"
          : "គន្លឹះ៖ សូមដាក់រូបភាព QR ឱ្យចំប្រអប់ស្កេន និងរក្សាចម្ងាយប្រមាណ ១០ ទៅ ១៥ សង់ទីម៉ែត្រពីកាមេរ៉ា។"}
      </div>
    </div>
  );
};

export default Kiosk;
