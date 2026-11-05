/**
 * FeedbackContactModal — Section 3 of the three communication cards.
 * General feedback, data corrections, technical issues and admin assistance.
 * All submissions are persisted to the database and appear in the admin queue.
 */
import { useEffect, useState } from 'react';
import {
  CheckCircle2, ChevronDown, Loader2, MessageSquare, Send, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8000';

const CATEGORIES = [
  { value: 'general_feedback', label: 'General Feedback' },
  { value: 'incorrect_information', label: 'Incorrect Outbreak Information' },
  { value: 'data_correction', label: 'Data Correction Request' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'administrative', label: 'Administrative Assistance' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABELS = {
  new: { label: 'Received', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  reviewed: { label: 'Under Review', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  resolved: { label: 'Resolved', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-violet-400 ${
    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'
  }`;

const Field = ({ label, error, required, children }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
      {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
  </div>
);

const DEFAULT = {
  category: 'general_feedback',
  subject: '',
  message: '',
  related_report_ref: '',
};

export default function FeedbackContactModal({ onClose }) {
  const { token, userData } = useAuth();
  const [form, setForm] = useState(DEFAULT);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/feedback-requests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch { /* non-fatal */ }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, [token]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim() || form.subject.trim().length < 3)
      e.subject = 'Subject must be at least 3 characters.';
    if (!form.message.trim() || form.message.trim().length < 10)
      e.message = 'Message must be at least 10 characters.';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setSubmitError('');

    const norm = (v) => (typeof v === 'string' ? (v.trim() || null) : v || null);

    try {
      const res = await fetch(`${API_BASE}/api/feedback-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: form.category,
          subject: form.subject.trim(),
          message: form.message.trim(),
          related_report_ref: norm(form.related_report_ref),
          submitter_name: userData?.name || null,
          submitter_email: userData?.email || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed.');
      setSuccessData(data);
      fetchHistory();
      setForm(DEFAULT);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const catLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label || val;
  const statusMeta = (s) => STATUS_LABELS[s] || { label: s, color: 'text-slate-600 bg-slate-100 border-slate-200' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <MessageSquare className="h-5 w-5 text-violet-600" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Feedback & Contact Admin</h2>
              <p className="text-xs text-slate-500">Your message is saved and reviewed by an administrator.</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success state */}
        {successData ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
              <CheckCircle2 className="h-8 w-8 text-violet-600" />
            </span>
            <h3 className="text-xl font-bold text-slate-900">Message Received</h3>
            <p className="max-w-sm text-sm text-slate-600">
              Your feedback has been saved. An administrator will review it.
              You can track its status below.
            </p>
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm">
              <span className="font-semibold text-violet-700">Reference ID:</span>{' '}
              <span className="font-mono text-violet-800">{successData.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <p className="text-xs text-slate-400">
              Category: <strong>{catLabel(successData.category)}</strong> · Status:{' '}
              <strong className="text-blue-600">Received</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSuccessData(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Send another
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required>
                <select value={form.category} onChange={set('category')} className={inputCls(false)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Subject" required error={errors.subject}>
                <input
                  value={form.subject}
                  onChange={set('subject')}
                  placeholder="Brief subject line"
                  className={inputCls(errors.subject)}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Related report or outbreak reference" error={errors.related_report_ref}>
                  <input
                    value={form.related_report_ref}
                    onChange={set('related_report_ref')}
                    placeholder="Optional — report ID, outbreak name, or other reference"
                    className={inputCls(errors.related_report_ref)}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Message" required error={errors.message}>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    rows={5}
                    placeholder="Describe your feedback, issue or request in detail..."
                    className={`${inputCls(errors.message)} resize-none`}
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{form.message.length}/3000</p>
                </Field>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">
                Sending as <strong className="text-slate-600">{userData?.name || 'authenticated user'}</strong>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* History accordion */}
        <div className="border-t border-slate-100 px-6 pb-5 pt-4">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <span>My previous messages ({history.length})</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>

          {showHistory && (
            <div className="mt-2 max-h-56 overflow-y-auto space-y-2 rounded-xl border border-slate-100 p-3">
              {historyLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : history.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">No previous messages.</p>
              ) : (
                history.map((item) => {
                  const meta = statusMeta(item.status);
                  return (
                    <div key={item.id} className="rounded-lg border border-slate-100 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.subject}</p>
                          <p className="text-xs text-slate-500">{catLabel(item.category)}</p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      {item.admin_notes && (
                        <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                          <strong>Admin note:</strong> {item.admin_notes}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()} · Ref: {item.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
