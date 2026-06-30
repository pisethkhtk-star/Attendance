import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import { MapPinIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Fix default Leaflet marker icon broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom glowing marker icon
const glowIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 26px; height: 26px;
    background: #6366f1;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(99,102,241,0.4), 0 0 20px rgba(99,102,241,0.6);
    cursor: grab;
  "></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const KioskSettings = () => {
  const [settings, setSettings] = useState(null);
  const [markerPos, setMarkerPos] = useState([11.5564, 104.9282]);
  const [radius, setRadius] = useState(100);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentGps, setCurrentGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const mapRef = useRef(null);

  // Load current settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/kiosk-settings');
        const s = res.data;
        setSettings(s);
        setMarkerPos([s.latitude, s.longitude]);
        setRadius(s.radius);
      } catch (err) {
        console.error('Error loading kiosk settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handle map click to move marker
  const handleMapClick = useCallback((lat, lng) => {
    setMarkerPos([lat, lng]);
  }, []);

  // Get user's current GPS location
  const getMyLocation = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentGps({ lat, lng });
        setMarkerPos([lat, lng]);
        // Pan map to new location
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsError('Could not access your GPS. Please allow location access.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Save settings to database
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.put('/kiosk-settings', {
        latitude: markerPos[0],
        longitude: markerPos[1],
        radius: parseFloat(radius),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving kiosk settings:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const distanceFromGps = currentGps
    ? haversineDistance(currentGps.lat, currentGps.lng, markerPos[0], markerPos[1])
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <span className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-khmer text-sm">Loading Kiosk Settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <MapPinIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-khmer">ការកំណត់ Kiosk Geofencing</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Click on the map or drag the marker to set the allowed check-in zone center.
            </p>
          </div>
        </div>

        {/* My Location Button */}
        <button
          id="get-my-location-btn"
          onClick={getMyLocation}
          disabled={gpsLoading}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer outline-none disabled:opacity-50 font-khmer"
        >
          {gpsLoading ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <MapPinIcon className="h-4 w-4" />
          )}
          {gpsLoading ? 'Getting GPS...' : '📍 Use My Location'}
        </button>
      </div>

      {gpsError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-khmer">
          ⚠️ {gpsError}
        </div>
      )}

      {/* Main Layout: Map + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Map Panel — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Map instruction */}
            <div className="px-5 py-3 bg-slate-950/60 border-b border-white/5 flex items-center gap-2 text-xs text-slate-400 font-khmer">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse inline-block" />
              ចុចលើផែនទីដើម្បីផ្លាស់ប្ដូរទីតាំង | Click map to reposition · Drag marker to fine-tune
            </div>

            {/* Leaflet Map */}
            <div className="h-[450px] w-full relative" id="kiosk-map-container">
              <MapContainer
                center={markerPos}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Click handler */}
                <MapClickHandler onMapClick={handleMapClick} />

                {/* Geofence circle */}
                <Circle
                  center={markerPos}
                  radius={radius}
                  pathOptions={{
                    color: '#6366f1',
                    fillColor: '#6366f1',
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: '6 4',
                  }}
                />

                {/* Center Marker — draggable */}
                <Marker
                  position={markerPos}
                  icon={glowIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const latlng = e.target.getLatLng();
                      setMarkerPos([latlng.lat, latlng.lng]);
                    },
                  }}
                />

                {/* Current GPS position marker (blue dot) */}
                {currentGps && (
                  <Marker
                    position={[currentGps.lat, currentGps.lng]}
                    icon={new L.DivIcon({
                      className: '',
                      html: `<div style="
                        width: 14px; height: 14px;
                        background: #22d3ee;
                        border: 2px solid white;
                        border-radius: 50%;
                        box-shadow: 0 0 0 3px rgba(34,211,238,0.35);
                      " title="Your current GPS position"></div>`,
                      iconSize: [14, 14],
                      iconAnchor: [7, 7],
                    })}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Controls Panel — 1/3 width */}
        <div className="lg:col-span-1 flex flex-col gap-4">

          {/* Coordinate Info Card */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white font-khmer flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-indigo-400" />
              Zone Center Coordinates
            </h3>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1 font-khmer">
                  Latitude (រង្សីទទឹង)
                </label>
                <input
                  id="latitude-input"
                  type="number"
                  step="any"
                  value={markerPos[0].toFixed(6)}
                  onChange={(e) => setMarkerPos([parseFloat(e.target.value) || 0, markerPos[1]])}
                  className="w-full py-2 px-3 bg-slate-950/60 border border-white/10 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1 font-khmer">
                  Longitude (រង្សីបណ្ដោយ)
                </label>
                <input
                  id="longitude-input"
                  type="number"
                  step="any"
                  value={markerPos[1].toFixed(6)}
                  onChange={(e) => setMarkerPos([markerPos[0], parseFloat(e.target.value) || 0])}
                  className="w-full py-2 px-3 bg-slate-950/60 border border-white/10 text-white rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Radius Slider Card */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-khmer">Allowed Radius</h3>
              <span className="text-lg font-extrabold text-indigo-400 tabular-nums">{radius}m</span>
            </div>

            <input
              id="radius-slider"
              type="range"
              min={10}
              max={5000}
              step={10}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-khmer">
              <span>10m (Tight)</span>
              <span>5000m (5km)</span>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 200, 500, 1000, 2000].map((r) => (
                <button
                  key={r}
                  id={`preset-radius-${r}`}
                  onClick={() => setRadius(r)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer outline-none font-khmer ${
                    radius === r
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/20'
                  }`}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Distance from your GPS */}
          {distanceFromGps !== null && (
            <div className={`rounded-2xl p-4 border text-center ${
              distanceFromGps <= radius
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <p className="text-xs font-khmer font-semibold mb-1">
                {distanceFromGps <= radius ? '✅ You are inside the zone' : '❌ You are outside the zone'}
              </p>
              <p className="text-2xl font-extrabold tabular-nums">
                {distanceFromGps < 1000 ? `${Math.round(distanceFromGps)}m` : `${(distanceFromGps / 1000).toFixed(2)}km`}
              </p>
              <p className="text-[10px] opacity-60 font-khmer mt-1">distance from zone center</p>
            </div>
          )}

          {/* Save Button */}
          <button
            id="save-kiosk-settings-btn"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 px-6 font-bold text-sm rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer outline-none border-none disabled:opacity-50 disabled:cursor-not-allowed font-khmer flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircleIcon className="h-4 w-4 text-emerald-300" />
                Saved Successfully!
              </>
            ) : (
              '💾 Save Geofence Settings'
            )}
          </button>

          {/* Info Box */}
          <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-2 text-[11px] text-slate-500 font-khmer leading-relaxed">
            <p className="font-semibold text-slate-400">ℹ️ របៀបប្រើប្រាស់</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>ចុចលើផែនទី ឬ Drag marker ដើម្បីផ្ដាក់ Center</li>
              <li>ប្ដូរ Radius ដើម្បីកំណត់ zone ចន្លោះ</li>
              <li>ចុច "Use My Location" ដើម្បី Auto-fill GPS</li>
              <li>Employee ដែល scan ក្រៅ zone → rejected</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskSettings;
