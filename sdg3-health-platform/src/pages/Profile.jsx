/**
 * Profile — professional user profile page with:
 * - Real data from /api/profile (name, email, role, location, bio, member-since)
 * - Functional edit form (PATCH /api/profile)
 * - Real activity statistics from /api/profile/stats
 * - Disease Outbreak Alerts & Notifications section from /api/notifications
 * - 30-second polling + fetch-on-focus for new alert delivery
 * - Toast when a new unread alert arrives
 * - Mark as read / Mark all read / Acknowledge per notification
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, Bell, BellOff, BookOpen, Calendar,
  CheckCircle2, ChevronDown, ChevronRight, Edit3, HelpCircle,
  Loader2, Mail, MapPin, MessageSquare, Save, Shield, User, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8000';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

const relTime = (iso) => {
  if (!iso) return '—';
  const mins = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.round(mins)} min ago`;
  const h = mins / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  return fmt(iso);
};

const SEVERITY_STYLE = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-sky-100 text-sky-700 border-sky-200',
};

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-emerald-400 ${
    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'
  }`;

// ─── notification card ────────────────────────────────────────────────────────
function NotificationCard({ notif, onRead, onAck, expanded, onToggle }) {
  const sev = notif.alert_severity || 'medium';
  const sevStyle = SEVERITY_STYLE[sev] || SEVERITY_STYLE.medium;
  const isUnread = !notif.is_read;

  return (
    <div
      className={`rounded-xl border transition ${
        isUnread
          ? 'border-emerald-200 bg-emerald-50/40 shadow-sm'
          : 'border-slate-100 bg-white'
      }`}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="mt-0.5 flex-shrink-0">
          {isUnread ? (
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          ) : (
            <span className="flex h-2.5 w-2.5 rounded-full bg-slate-200" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 line-clamp-1">
              {notif.alert_title || 'Disease Alert'}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sevStyle}`}>
              {sev}
            </span>
            {notif.is_acknowledged && (
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                Acknowledged
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {notif.alert_disease && <span>{notif.alert_disease}</span>}
            {notif.alert_affected_state && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{notif.alert_affected_state}
                {notif.alert_affected_district ? `, ${notif.alert_affected_district}` : ''}
              </span>
            )}
            <span>{relTime(notif.delivered_at)}</span>
          </div>
        </div>
        {expanded
          ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
          : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
              <p className="text-sm text-slate-700 leading-6">{notif.alert_message}</p>

              {(notif.alert_observation_window || notif.alert_observed_values || notif.alert_baseline_comparison) && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1 text-xs text-slate-600">
                  {notif.alert_observation_window && (
                    <p><span className="font-semibold">Period:</span> {notif.alert_observation_window}</p>
                  )}
                  {notif.alert_observed_values && (
                    <p><span className="font-semibold">Observed:</span> {notif.alert_observed_values}</p>
                  )}
                  {notif.alert_baseline_comparison && (
                    <p><span className="font-semibold">Baseline:</span> {notif.alert_baseline_comparison}</p>
                  )}
                  {notif.alert_detection_method && (
                    <p className="text-slate-400 italic">Detection: {notif.alert_detection_method}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-400">
                Delivered: {fmt(notif.delivered_at)} · Ref {notif.alert_id?.slice(0, 8).toUpperCase()}
              </p>

              <div className="flex flex-wrap gap-2">
                {!notif.is_read && (
                  <button
                    onClick={() => onRead(notif.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Read
                  </button>
                )}
                {!notif.is_acknowledged && (
                  <button
                    onClick={() => onAck(notif.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl"
    >
      <Bell className="h-5 w-5 text-emerald-600" />
      <span className="text-sm font-medium text-slate-800">{message}</span>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Profile() {
  const { token, userData: authUser, userRole } = useAuth();

  // Profile data
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState(null);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', location: '', bio: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // all | unread | high | acknowledged
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const prevUnreadRef = useRef(null);
  const pollRef = useRef(null);

  // ── fetch profile ────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditForm({ name: data.name || '', location: data.location || '', bio: data.bio || '' });
      }
    } catch { /* non-fatal */ }
    finally { setProfileLoading(false); }
  }, [token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/profile/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch { /* non-fatal */ }
  }, [token]);

  // ── fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setNotifLoading(true);
    try {
      const unreadOnlyParam = notifFilter === 'unread' ? '&unread_only=true' : '';
      const [notifRes, countRes] = await Promise.all([
        fetch(`${API}/api/notifications?limit=30${unreadOnlyParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data);
      }
      if (countRes.ok) {
        const { unread_count } = await countRes.json();
        // Show toast if new alerts arrived since last poll
        if (prevUnreadRef.current !== null && unread_count > prevUnreadRef.current) {
          const diff = unread_count - prevUnreadRef.current;
          setToast(`${diff} new disease alert${diff > 1 ? 's' : ''} received.`);
        }
        prevUnreadRef.current = unread_count;
        setUnreadCount(unread_count);
      }
    } catch { /* non-fatal */ }
    finally { if (!silent) setNotifLoading(false); }
  }, [token, notifFilter]);

  // ── initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── 30-second polling + fetch-on-focus ───────────────────────────────────
  useEffect(() => {
    if (!token) return;
    pollRef.current = setInterval(() => fetchNotifications(true), 30000);
    const onFocus = () => fetchNotifications(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchNotifications, token]);

  // ── notification actions ─────────────────────────────────────────────────
  const markRead = async (id) => {
    try {
      const res = await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setNotifications((ns) => ns.map((n) => (n.id === id ? updated : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        if (prevUnreadRef.current !== null) prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
      }
    } catch { /* non-fatal */ }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch(`${API}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        prevUnreadRef.current = 0;
        fetchStats();
      }
    } catch { /* non-fatal */ }
  };

  const acknowledge = async (id) => {
    try {
      const res = await fetch(`${API}/api/notifications/${id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setNotifications((ns) => ns.map((n) => (n.id === id ? updated : n)));
        if (!updated.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        fetchStats();
      }
    } catch { /* non-fatal */ }
  };

  // ── profile edit ─────────────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError('');
    setEditSuccess('');
    try {
      const payload = {};
      if (editForm.name.trim()) payload.name = editForm.name.trim();
      payload.location = editForm.location.trim() || null;
      payload.bio = editForm.bio.trim() || null;

      const res = await fetch(`${API}/api/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed.');
      setProfile(data);
      setEditSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setEditError(err.message || 'Update failed.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── filtered notifications ────────────────────────────────────────────────
  const filteredNotifs = notifications.filter((n) => {
    if (notifFilter === 'unread') return !n.is_read;
    if (notifFilter === 'high') return ['high', 'critical'].includes(n.alert_severity || '');
    if (notifFilter === 'acknowledged') return n.is_acknowledged;
    return true;
  });

  // ── initials avatar ───────────────────────────────────────────────────────
  const initials = (profile?.name || authUser?.name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const displayProfile = profile || authUser;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-slate-500">Your account details, activity and disease alerts.</p>
      </div>

      {/* ── Profile header card + account info ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: avatar + name + role */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
              {initials}
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">{displayProfile?.name || '—'}</h2>
            <p className="text-sm text-slate-500">{displayProfile?.email || '—'}</p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              userRole === 'admin'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {userRole === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              {userRole === 'admin' ? 'Administrator' : 'User'}
            </span>

            {unreadCount > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Bell className="h-3.5 w-3.5" />
                {unreadCount} unread alert{unreadCount > 1 ? 's' : ''}
              </div>
            )}

            <button
              onClick={() => { setEditing((v) => !v); setEditError(''); setEditSuccess(''); }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />
              {editing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Right: account info / edit form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Edit form */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5"
              >
                <h3 className="mb-4 text-base font-bold text-slate-900">Edit Profile</h3>
                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Full Name
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputCls(false)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Location <span className="normal-case font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className={inputCls(false)}
                      placeholder="e.g. Mumbai, Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Bio <span className="normal-case font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                      rows={3}
                      className={`${inputCls(false)} resize-none`}
                      placeholder="Short bio"
                    />
                  </div>
                  {editError && <p className="text-sm text-rose-600">{editError}</p>}
                  {editSuccess && <p className="text-sm text-emerald-600">{editSuccess}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-slate-900">Account Information</h3>
            <div className="space-y-3">
              {[
                {
                  icon: Mail,
                  label: 'Email',
                  value: displayProfile?.email || '—',
                },
                {
                  icon: Calendar,
                  label: 'Member since',
                  value: fmt(displayProfile?.created_at),
                },
                {
                  icon: MapPin,
                  label: 'Location',
                  value: displayProfile?.location || (
                    <span className="text-slate-400 italic">Not provided — click Edit Profile to add</span>
                  ),
                },
                {
                  icon: User,
                  label: 'Bio',
                  value: displayProfile?.bio || (
                    <span className="text-slate-400 italic">Not provided</span>
                  ),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
                    <p className="mt-0.5 text-sm text-slate-800 break-words">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity Statistics ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-base font-bold text-slate-900">Activity Statistics</h3>
        {!stats ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Predictions Made',    value: stats.predictions_made,    icon: Activity,      color: 'bg-blue-100 text-blue-700' },
              { label: 'Reports Submitted',   value: stats.reports_submitted,   icon: AlertTriangle, color: 'bg-orange-100 text-orange-700' },
              { label: 'Alerts Received',     value: stats.alerts_received,     icon: Bell,          color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Unread Alerts',       value: stats.unread_alerts,       icon: BellOff,       color: 'bg-rose-100 text-rose-700' },
              { label: 'Info Requests',       value: stats.information_requests, icon: HelpCircle,   color: 'bg-violet-100 text-violet-700' },
              { label: 'Feedback Sent',       value: stats.feedback_sent,       icon: MessageSquare, color: 'bg-slate-100 text-slate-600' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-4">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Disease Outbreak Alerts & Notifications ──────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <Bell className="h-5 w-5 text-emerald-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Disease Outbreak Alerts &amp; Notifications</h3>
              <p className="text-xs text-slate-500">Administrator-issued disease anomaly alerts delivered to your account.</p>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => fetchNotifications()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-6 py-2">
          {[
            { id: 'all',          label: 'All' },
            { id: 'unread',       label: 'Unread' },
            { id: 'high',         label: 'High Priority' },
            { id: 'acknowledged', label: 'Acknowledged' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setNotifFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                notifFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="px-6 py-4">
          {notifLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <BellOff className="h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold text-slate-500">
                {notifFilter === 'all'
                  ? 'No disease anomaly alerts have been sent to your account yet.'
                  : `No ${notifFilter} alerts.`}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                When an administrator issues a disease anomaly alert, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifs.map((n) => (
                <NotificationCard
                  key={n.id}
                  notif={n}
                  expanded={expandedId === n.id}
                  onToggle={() => {
                    setExpandedId((v) => (v === n.id ? null : n.id));
                    if (!n.is_read) markRead(n.id);
                  }}
                  onRead={markRead}
                  onAck={acknowledge}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
          Refreshes every 30 seconds and on window focus.
          Only administrator-verified disease anomaly alerts appear here.
        </div>
      </div>

      {/* ── My Information Requests ──────────────────────────────────────── */}
      <InformationRequestsSection token={token} />
    </div>
  );
}

// ─── Information Requests Section Component ───────────────────────────────────
function InformationRequestsSection({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const STATUS_LABELS = {
    pending: { label: 'Processing', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    rag_answered: { label: 'Answered by AI', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    awaiting_admin: { label: 'Awaiting Admin', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    admin_replied: { label: 'Admin Replied', color: 'text-violet-700 bg-violet-50 border-violet-200' },
    closed: { label: 'Closed', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  };

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/information-requests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRequests(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const statusMeta = (s) => STATUS_LABELS[s] || { label: s, color: 'text-slate-600 bg-slate-100 border-slate-200' };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
            <HelpCircle className="h-5 w-5 text-violet-600" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">My Information Requests</h3>
            <p className="text-xs text-slate-500">Questions you've asked about disease outbreaks</p>
          </div>
        </div>
        <button
          onClick={fetchRequests}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Request list */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <HelpCircle className="h-10 w-10 text-slate-300" />
            <p className="text-base font-semibold text-slate-500">No information requests yet</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Ask questions about disease outbreaks from the "What's Happening" page
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`rounded-xl border transition ${
                  req.status === 'admin_replied'
                    ? 'border-violet-200 bg-violet-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId((v) => (v === req.id ? null : req.id))}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {req.topic && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {req.topic}
                        </span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusMeta(req.status).color}`}>
                        {statusMeta(req.status).label}
                      </span>
                      {req.admin_reply && (
                        <span className="flex h-2 w-2 rounded-full bg-violet-500" title="New admin reply" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">{req.question}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {relTime(req.created_at)} · Ref {req.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  {expandedId === req.id
                    ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                </button>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {expandedId === req.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                        {/* Question */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            Your Question
                          </p>
                          <p className="text-sm text-slate-700 leading-6">{req.question}</p>
                        </div>

                        {/* RAG Answer */}
                        {req.rag_grounded === 'true' && req.rag_answer && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs font-semibold text-emerald-700">AI Answer</span>
                            </div>
                            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                              {req.rag_answer}
                            </div>
                          </div>
                        )}

                        {/* Admin Reply */}
                        {req.admin_reply && (
                          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-violet-600" />
                              <span className="text-xs font-semibold text-violet-700">Administrator Response</span>
                              {req.admin_replied_at && (
                                <span className="ml-auto text-xs text-violet-500">
                                  {relTime(req.admin_replied_at)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-violet-900 leading-6 whitespace-pre-wrap">
                              {req.admin_reply}
                            </p>
                          </div>
                        )}

                        {/* Awaiting admin */}
                        {!req.rag_answer && !req.admin_reply && req.status === 'awaiting_admin' && (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                            Your question has been forwarded to an administrator. You'll be notified when they respond.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

