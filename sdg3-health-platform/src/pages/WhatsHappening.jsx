/**
 * WhatsHappening — India outbreak intelligence dashboard.
 *
 * Sections:
 *  1. Page header + location control
 *  2. India outbreak heatmap (Leaflet, published records only)
 *  3. Nearby outbreaks view (when location is set)
 *  4. Latest verified outbreak updates feed
 *  5. Three communication cards
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, Clock3, Filter, Globe2,
  HelpCircle, Loader2, MapPin, MessageSquare, Navigation,
  RefreshCw, ShieldCheck, Sparkles, TrendingUp, X,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '../context/AuthContext';
import ReportOutbreakModal from '../components/ReportOutbreakModal';
import RequestInformationPanel from '../components/RequestInformationPanel';
import FeedbackContactModal from '../components/FeedbackContactModal';

const API_BASE = 'http://localhost:8000';
const RADIUS_OPTIONS = [25, 50, 100, 200];

// ─── helpers ─────────────────────────────────────────────────────────────────

const relativeTime = (iso) => {
  if (!iso) return null;
  const mins = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const h = mins / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const riskColor = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'high')   return 'bg-rose-100 text-rose-700 border-rose-200';
  if (l === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (l === 'low')    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const heatColor = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'high')   return '#ef4444';
  if (l === 'medium') return '#f59e0b';
  return '#10b981';
};

// ─── skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded-full bg-slate-200" />
        <div className="h-4 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-slate-200" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-full rounded bg-slate-100" />
        <div className="h-3.5 w-5/6 rounded bg-slate-100" />
        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
      </div>
      <div className="mt-4 h-10 w-full rounded-xl bg-slate-100" />
    </div>
  );
}

// ─── outbreak card ────────────────────────────────────────────────────────────
function OutbreakCard({ item }) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          {item.disease}
        </span>
        {item.risk_level && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${riskColor(item.risk_level)}`}>
            <ShieldCheck className="h-3 w-3" />{item.risk_level}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900 leading-snug">
        {item.disease}{item.district ? ` · ${item.district}` : ''}
      </h3>
      <p className="mt-1 text-xs font-medium text-slate-500">{item.state}</p>
      {item.distance_km != null && (
        <p className="mt-0.5 text-xs text-blue-600 font-medium">{item.distance_km} km away</p>
      )}
      {item.proximity_label && !item.distance_km && (
        <p className="mt-0.5 text-xs text-slate-400">
          {item.proximity_label === 'same_district' ? 'Same district' : 'Same state'}
        </p>
      )}
      {item.description && (
        <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3">{item.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {item.reported_cases != null && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />{item.reported_cases.toLocaleString()} cases
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {relativeTime(item.published_at || item.created_at) || 'Recently published'}
        </span>
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Source: </span>
        {item.source_name || 'Verified record'}
        {item.source_reference ? ` — ${item.source_reference}` : ''}
      </div>
    </article>
  );
}

// ─── communication card ───────────────────────────────────────────────────────
function CommunicationCard({ icon: Icon, iconBg, iconColor, title, subtitle, actionLabel, actionColor, onAction }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className={`mb-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      <button
        onClick={onAction}
        className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98] ${actionColor}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ─── location control ─────────────────────────────────────────────────────────
function LocationControl({ location, locationStatus, onDetect, onManualSelect, onClear, indiaLocations }) {
  const [showManual, setShowManual] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const districts = indiaLocations.find((l) => l.state === selectedState)?.districts || [];

  const applyManual = () => {
    if (!selectedState) return;
    onManualSelect(selectedState, selectedDistrict || null);
    setShowManual(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {/* Current location display */}
      <div className="flex flex-wrap items-center gap-3">
        <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <span className="text-sm text-slate-700">
          {location
            ? <>Showing outbreaks near <strong className="text-slate-900">{location.display}</strong></>
            : <span className="text-slate-500">Showing outbreaks across <strong className="text-slate-700">India</strong></span>
          }
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          {!location && (
            <button
              onClick={onDetect}
              disabled={locationStatus === 'detecting'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {locationStatus === 'detecting'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Navigation className="h-3.5 w-3.5" />}
              {locationStatus === 'detecting' ? 'Detecting…' : 'Use My Location'}
            </button>
          )}
          <button
            onClick={() => setShowManual((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <MapPin className="h-3.5 w-3.5" />
            {location ? 'Change Location' : 'Choose Location'}
          </button>
          {location && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              India-wide
            </button>
          )}
        </div>
      </div>

      {/* Status / error messages */}
      {locationStatus === 'denied' && (
        <p className="mt-2 text-xs text-rose-600">
          Location permission denied. Please use the manual selector below, or allow location access in your browser.
        </p>
      )}
      {locationStatus === 'unavailable' && (
        <p className="mt-2 text-xs text-amber-600">
          Geolocation is unavailable in this browser. Use the manual selector to choose a location.
        </p>
      )}
      {locationStatus === 'timeout' && (
        <p className="mt-2 text-xs text-amber-600">
          Location request timed out. Use the manual selector or try again.
        </p>
      )}
      {locationStatus === 'geocode_failed' && (
        <p className="mt-2 text-xs text-amber-600">
          Location detected but could not be resolved to a state/district. Manual selection is available.
        </p>
      )}

      {/* Manual selector */}
      {showManual && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">State</label>
            <select
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(''); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none"
            >
              <option value="">Select state…</option>
              {indiaLocations.map((l) => (
                <option key={l.state} value={l.state}>{l.state}</option>
              ))}
            </select>
          </div>
          {districts.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">District (optional)</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none"
              >
                <option value="">Any district</option>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={applyManual}
            disabled={!selectedState}
            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            onClick={() => setShowManual(false)}
            className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function WhatsHappening() {
  const { token } = useAuth();

  // Outbreak data
  const [items, setItems] = useState([]);
  const [mapPoints, setMapPoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [stateFilter, setStateFilter] = useState('All States');
  const [diseaseFilter, setDiseaseFilter] = useState('');
  const [diseaseList, setDiseaseList] = useState([]);

  // Location
  const [location, setLocation] = useState(null);           // { state, district, display, lat, lng }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle|detecting|denied|unavailable|timeout|geocode_failed
  const [indiaLocations, setIndiaLocations] = useState([]);
  const [nearbyItems, setNearbyItems] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(100);
  const [mapView, setMapView] = useState('india'); // 'india' | 'nearby'

  // Modals
  const [activeModal, setActiveModal] = useState(null);
  const [reportSuccess, setReportSuccess] = useState('');
  const debounceRef = useRef(null);

  // ── load india locations for manual selector
  useEffect(() => {
    fetch(`${API_BASE}/api/outbreaks/india-locations`)
      .then((r) => r.json())
      .then((d) => setIndiaLocations(d.locations || []))
      .catch(() => {});
  }, []);

  // ── load disease list
  useEffect(() => {
    fetch(`${API_BASE}/api/outbreaks/diseases`)
      .then((r) => r.json())
      .then((d) => setDiseaseList(d.diseases || []))
      .catch(() => {});
  }, []);

  // ── fetch main outbreak data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (stateFilter && stateFilter !== 'All States') params.set('state', stateFilter);
      if (diseaseFilter.trim()) params.set('disease', diseaseFilter.trim());
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [feedRes, mapRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/outbreaks?${params}`, { headers }),
        fetch(`${API_BASE}/api/outbreaks/heatmap?${params}`, { headers }),
        fetch(`${API_BASE}/api/outbreaks/stats`, { headers }),
      ]);

      if (!feedRes.ok) throw new Error('Unable to load the verified outbreak feed.');
      const feedData = await feedRes.json();
      setItems(feedData.items || []);

      if (mapRes.ok) {
        const md = await mapRes.json();
        setMapPoints(md.points || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Unable to load outbreak data.');
      setItems([]);
      setMapPoints([]);
    } finally {
      setLoading(false);
    }
  }, [stateFilter, diseaseFilter, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── fetch nearby outbreaks when location is set
  const fetchNearby = useCallback(async () => {
    if (!location) { setNearbyItems([]); return; }
    setNearbyLoading(true);
    try {
      let data;
      if (location.lat != null && location.lng != null) {
        // Coordinate-based Haversine search
        const params = new URLSearchParams({ lat: location.lat, lng: location.lng, radius_km: radiusKm });
        const res = await fetch(`${API_BASE}/api/outbreaks/nearby?${params}`);
        if (res.ok) {
          const json = await res.json();
          data = json.data || [];
        }
      }
      if (!data || data.length === 0) {
        // Administrative fallback (state/district name matching)
        const params = new URLSearchParams({ state: location.state });
        if (location.district) params.set('district', location.district);
        const res = await fetch(`${API_BASE}/api/outbreaks/in-area?${params}`);
        if (res.ok) {
          const json = await res.json();
          data = json.data || [];
        }
      }
      setNearbyItems(data || []);
    } catch { setNearbyItems([]); }
    finally { setNearbyLoading(false); }
  }, [location, radiusKm]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchNearby, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchNearby]);

  // ── geolocation detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Validate India bounds
        if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
          setLocationStatus('geocode_failed');
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/api/outbreaks/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const geo = await res.json();
            if (geo.state) {
              setLocation({
                lat, lng,
                state: geo.state,
                district: geo.district || null,
                display: geo.district
                  ? `${geo.district}, ${geo.state}`
                  : geo.state,
              });
              setLocationStatus('resolved');
            } else {
              // State name not found — still show a location with coords
              setLocation({ lat, lng, state: '', district: null, display: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E` });
              setLocationStatus('geocode_failed');
            }
          } else {
            setLocationStatus('geocode_failed');
          }
        } catch {
          setLocationStatus('geocode_failed');
        }
      },
      (err) => {
        if (err.code === 1) setLocationStatus('denied');
        else if (err.code === 3) setLocationStatus('timeout');
        else setLocationStatus('unavailable');
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleManualSelect = (state, district) => {
    setLocation({ lat: null, lng: null, state, district, display: district ? `${district}, ${state}` : state });
    setLocationStatus('resolved');
    // Sync state filter to match
    setStateFilter(state);
  };

  const handleClearLocation = () => {
    setLocation(null);
    setLocationStatus('idle');
    setNearbyItems([]);
    setMapView('india');
  };

  const handleReportSuccess = () => {
    setReportSuccess('Your outbreak report has been submitted for admin review.');
    setTimeout(() => setReportSuccess(''), 8000);
    fetchData();
  };

  // Determine map center
  const mapCenter = location?.lat && location?.lng
    ? [location.lat, location.lng]
    : [22.5, 78.96];
  const mapZoom = location?.lat ? 8 : 5;

  const displayPoints = mapView === 'nearby' && location
    ? nearbyItems.filter((i) => i.latitude).map((i) => ({
        lat: i.latitude, lng: i.longitude,
        intensity: i.reported_cases || 1,
        district: i.district, state: i.state,
        disease: i.disease, risk: i.risk_level,
        reported_cases: i.reported_cases,
        published_at: i.published_at,
        has_exact_coords: i.has_exact_coords,
      }))
    : mapPoints;

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* ── 1. Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
            <Globe2 className="h-3.5 w-3.5" />
            India · Outbreak Intelligence
          </span>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">What's Happening Around</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Explore verified outbreak updates, understand disease-related information and communicate
            new observations to the health administration.
          </p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-slate-400">
              Last refreshed: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Location control ─────────────────────────────────────────────── */}
      <LocationControl
        location={location}
        locationStatus={locationStatus}
        onDetect={handleDetectLocation}
        onManualSelect={handleManualSelect}
        onClear={handleClearLocation}
        indiaLocations={indiaLocations}
      />

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Published records', value: stats.total_records },
            { label: 'Total reported cases', value: stats.total_cases?.toLocaleString() },
            { label: 'High-risk records', value: stats.high_risk_records },
            { label: 'States represented', value: stats.states_represented },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{s.value ?? '—'}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Report success banner ─────────────────────────────────────────── */}
      {reportSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          {reportSuccess}
        </div>
      )}

      {/* ── 2. India / Nearby Heatmap ─────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">India Outbreak Map</h2>
          <div className="flex items-center gap-2">
            {location && (
              <>
                <button
                  onClick={() => setMapView('india')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mapView === 'india' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  India-wide
                </button>
                <button
                  onClick={() => setMapView('nearby')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mapView === 'nearby' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Near {location.display}
                </button>
              </>
            )}
            <span className="text-xs text-slate-400">
              {displayPoints.length} geo-located record{displayPoints.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3 text-xs text-slate-600">
            {[
              { color: '#ef4444', label: 'High risk' },
              { color: '#f59e0b', label: 'Medium risk' },
              { color: '#10b981', label: 'Low / Unspecified' },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
            <span className="ml-auto text-slate-400">Circle size ∝ reported cases · Intensity = case count</span>
          </div>

          <div className="h-[400px]">
            {displayPoints.length === 0 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
                <Globe2 className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  {mapView === 'nearby'
                    ? `No geo-located outbreak records within ${radiusKm} km of ${location?.display}.`
                    : 'No geo-located outbreak records available.'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Records without valid coordinates are shown in the feed below but cannot be plotted on the map.
                  {mapPoints.length === 0 && ' An admin can seed verified outbreak records from the Admin Dashboard.'}
                </p>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom
                className="h-full w-full"
                key={`map-${mapView}-${displayPoints.length}-${mapCenter.join(',')}`}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {displayPoints.map((pt, idx) => (
                  <CircleMarker
                    key={`${pt.disease}-${pt.state}-${idx}`}
                    center={[pt.lat, pt.lng]}
                    radius={Math.max(7, Math.min(30, Math.log10((pt.intensity || 1) + 1) * 8))}
                    pathOptions={{
                      color: heatColor(pt.risk),
                      fillColor: heatColor(pt.risk),
                      fillOpacity: pt.has_exact_coords ? 0.75 : 0.45,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-slate-900">{pt.disease}</p>
                        <p className="text-slate-600">{pt.district ? `${pt.district}, ` : ''}{pt.state}</p>
                        <p className="text-slate-500">
                          {pt.reported_cases != null ? `${pt.reported_cases.toLocaleString()} reported cases` : 'Case count unavailable'}
                        </p>
                        {pt.distance_km != null && (
                          <p className="text-blue-600 font-medium">{pt.distance_km} km away</p>
                        )}
                        {!pt.has_exact_coords && (
                          <p className="text-xs text-slate-400 italic">Plotted at administrative centroid</p>
                        )}
                        {pt.risk && (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${riskColor(pt.risk)}`}>
                            {pt.risk} risk
                          </span>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                {/* User location pin */}
                {location?.lat && location?.lng && (
                  <CircleMarker
                    center={[location.lat, location.lng]}
                    radius={10}
                    pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
                  >
                    <Popup>
                      <p className="text-sm font-semibold">Your location</p>
                      <p className="text-xs text-slate-500">{location.display}</p>
                    </Popup>
                  </CircleMarker>
                )}
              </MapContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Radius selector (nearby mode) ────────────────────────────────── */}
      {location && mapView === 'nearby' && location.lat && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          <span className="font-medium">Search radius:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                radiusKm === r ? 'bg-blue-600 text-white' : 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-100'
              }`}
            >
              {r} km
            </button>
          ))}
          {nearbyLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none"
        >
          <option value="All States">All States</option>
          {indiaLocations.map((l) => (
            <option key={l.state} value={l.state}>{l.state}</option>
          ))}
        </select>

        <input
          value={diseaseFilter}
          onChange={(e) => setDiseaseFilter(e.target.value)}
          placeholder="Search disease…"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none w-44"
        />

        {(stateFilter !== 'All States' || diseaseFilter) && (
          <button
            onClick={() => { setStateFilter('All States'); setDiseaseFilter(''); }}
            className="ml-auto text-xs text-slate-400 hover:text-slate-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Nearby outbreaks section ──────────────────────────────────────── */}
      {location && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Outbreaks Near {location.display}
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {nearbyItems.length} record{nearbyItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          {nearbyLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : nearbyItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No published outbreaks found near {location.display}.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                This does not mean there are no health risks — check the India-wide feed below.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {nearbyItems.map((item) => (
                <OutbreakCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 3. Latest Verified Outbreak Updates ──────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">Latest Verified Outbreak Updates</h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {items.length} record{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
            <p className="mt-3 text-base font-semibold text-rose-700">Unable to load outbreak feed</p>
            <p className="mt-1 text-sm text-rose-600">{error}</p>
            <button onClick={fetchData} className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-4 text-base font-semibold text-slate-600">No verified records found</p>
            <p className="mt-1 text-sm text-slate-400">
              {stateFilter !== 'All States' || diseaseFilter
                ? 'Try clearing the filters.'
                : 'No approved outbreak records are in the system yet. An admin can seed or add records from the Admin Dashboard.'}
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => <OutbreakCard key={item.id} item={item} />)}
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Only administrator-approved and published records appear here.
              User-submitted reports remain pending until reviewed.
            </div>
          </>
        )}
      </section>

      {/* ── 4. Three Communication Cards ─────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-slate-900">Communicate with the Administration</h2>
        <p className="mb-5 text-sm text-slate-500">
          Three dedicated channels — each kept separate and routed to the right admin queue.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <CommunicationCard
            icon={MapPin}
            iconBg="bg-emerald-100" iconColor="text-emerald-600"
            title="Report a Possible Outbreak"
            subtitle="Share information about a possible new disease outbreak for administrative review. Your submission stays pending until verified — it never enters the public feed automatically."
            actionLabel="Submit a Report"
            actionColor="bg-emerald-600 hover:bg-emerald-700"
            onAction={() => setActiveModal('report')}
          />
          <CommunicationCard
            icon={HelpCircle}
            iconBg="bg-blue-100" iconColor="text-blue-600"
            title="Request Outbreak Information"
            subtitle="Ask for clarification or additional information about a disease or published outbreak. AI retrieves relevant health guidance from trusted sources. Unanswered questions go to admin."
            actionLabel="Ask a Question"
            actionColor="bg-blue-600 hover:bg-blue-700"
            onAction={() => setActiveModal('info')}
          />
          <CommunicationCard
            icon={MessageSquare}
            iconBg="bg-violet-100" iconColor="text-violet-600"
            title="Feedback & Contact Admin"
            subtitle="Send general feedback, report incorrect information, request a data correction, report a technical issue, or request administrative assistance."
            actionLabel="Send a Message"
            actionColor="bg-violet-600 hover:bg-violet-700"
            onAction={() => setActiveModal('feedback')}
          />
        </div>
      </section>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {activeModal === 'report'   && <ReportOutbreakModal onClose={() => setActiveModal(null)} onSuccess={handleReportSuccess} />}
      {activeModal === 'info'     && <RequestInformationPanel onClose={() => setActiveModal(null)} outbreaks={items} />}
      {activeModal === 'feedback' && <FeedbackContactModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
