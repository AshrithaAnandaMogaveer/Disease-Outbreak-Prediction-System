/**
 * AdminDashboard — Full admin control panel.
 *
 * Tabs:
 *  1. Overview       — stats cards + recent activity
 *  2. Outbreak Reports — review queue with RAG evidence assistance
 *  3. Information Requests — user questions, admin reply
 *  4. Feedback & Contact — general feedback queue
 *  5. Add Case Data  — publish verified outbreak records directly
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity, AlertTriangle, Bell, BookOpen, CheckCircle2,
  ChevronDown, ChevronRight, Database, ExternalLink,
  HelpCircle, Loader2, MessageSquare, RefreshCw,
  Send, Shield, Sparkles, Upload, Users, X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';

import DatasetUpload from '../components/dashboard/DatasetUpload';
import ManageExistingCases from '../components/dashboard/ManageExistingCases';

const API = 'http://localhost:8000';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const relTime = (iso) => {
  if (!iso) return '—';
  const mins = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const h = mins / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const STATUS_CHIP = {
  pending:           'bg-amber-100 text-amber-700 border-amber-200',
  under_review:      'bg-blue-100 text-blue-700 border-blue-200',
  needs_information: 'bg-orange-100 text-orange-700 border-orange-200',
  approved:          'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected:          'bg-rose-100 text-rose-700 border-rose-200',
  rag_answered:      'bg-teal-100 text-teal-700 border-teal-200',
  awaiting_admin:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  admin_replied:     'bg-violet-100 text-violet-700 border-violet-200',
  closed:            'bg-slate-100 text-slate-600 border-slate-200',
  new:               'bg-sky-100 text-sky-700 border-sky-200',
  reviewed:          'bg-slate-100 text-slate-600 border-slate-200',
  resolved:          'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const chip = (status) => (
  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_CHIP[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
    {status?.replace(/_/g, ' ')}
  </span>
);

const CATEGORY_LABELS = {
  general_feedback:     'General Feedback',
  incorrect_information:'Incorrect Information',
  data_correction:      'Data Correction',
  technical_issue:      'Technical Issue',
  administrative:       'Administrative',
  other:                'Other',
};

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 hover:border-slate-300';

// ─── collapsible card ─────────────────────────────────────────────────────────

function CollapseCard({ title, badge, badgeColor = 'bg-orange-100 text-orange-700', children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-slate-900">{title}</span>
          {badge != null && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>{badge}</span>
          )}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ─── TAB 2: Outbreak Reports ──────────────────────────────────────────────────

function OutbreakReportsTab({ token }) {
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded]         = useState(null);
  const [evidence, setEvidence]         = useState({});
  const [evidenceLoading, setEvidenceLoading] = useState({});
  const [hallucination, setHallucination] = useState({});
  const [hallucinationLoading, setHallucinationLoading] = useState({});
  const [actionLoading, setActionLoading]     = useState({});
  const [decisionReasons, setDecisionReasons] = useState({});
  const [reviewNotes, setReviewNotes]   = useState({});

  const load = async () => {
    setLoading(true); setError('');
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const r = await fetch(`${API}/api/admin/outbreak-reports${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to load reports.');
      setReports(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, statusFilter]);

  const loadEvidence = async (id) => {
    if (evidence[id]) return;
    setEvidenceLoading((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`${API}/api/admin/outbreak-reports/${id}/evidence`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setEvidence((p) => ({ ...p, [id]: data }));
      }
    } catch { /* non-fatal */ }
    finally { setEvidenceLoading((p) => ({ ...p, [id]: false })); }
  };

  const loadHallucinationCheck = async (id) => {
    if (hallucination[id]) return;
    setHallucinationLoading((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`${API}/api/admin/outbreak-reports/${id}/hallucination-check`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setHallucination((p) => ({ ...p, [id]: data }));
      }
    } catch { /* non-fatal */ }
    finally { setHallucinationLoading((p) => ({ ...p, [id]: false })); }
  };

  const act = async (id, status, reason, notes) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`${API}/api/admin/outbreak-reports/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, decision_reason: reason || null, review_notes: notes || null }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Action failed.');
      await load();
      setExpanded(null);
    } catch (e) { setError(e.message); }
    finally { setActionLoading((p) => ({ ...p, [id]: false })); }
  };

  const toggle = (id) => {
    setExpanded((v) => (v === id ? null : id));
    if (expanded !== id) {
      loadEvidence(id);
      loadHallucinationCheck(id);
    }
  };

  const pending = reports.filter((r) => ['pending','under_review','needs_information'].includes(r.status));
  const done    = reports.filter((r) => ['approved','rejected'].includes(r.status));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none">
          <option value="">All statuses</option>
          {['pending','under_review','needs_information','approved','rejected'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* Pending queue */}
      <CollapseCard title="Awaiting Review" badge={pending.length} badgeColor="bg-orange-100 text-orange-700">
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            No reports awaiting review.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((rep) => (
              <div key={rep.id} className="rounded-xl border border-slate-200 bg-white">
                {/* Summary row */}
                <button onClick={() => toggle(rep.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{rep.disease_name}</span>
                      {chip(rep.status)}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {rep.state}{rep.district ? ` · ${rep.district}` : ''}{rep.locality ? ` · ${rep.locality}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Submitted {relTime(rep.created_at)} · Ref {rep.id.slice(0,8).toUpperCase()}
                    </p>
                  </div>
                  {expanded === rep.id
                    ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                </button>

                {/* Expanded detail */}
                {expanded === rep.id && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div><span className="font-medium text-slate-700">Cases reported:</span> <span className="text-slate-600">{rep.reported_cases ?? 'Unknown'}</span></div>
                      <div><span className="font-medium text-slate-700">Observation date:</span> <span className="text-slate-600">{fmt(rep.observation_date)}</span></div>
                      <div className="sm:col-span-2"><span className="font-medium text-slate-700">Description:</span><p className="mt-1 text-slate-600 leading-6">{rep.description}</p></div>
                      {rep.source_reference && (
                        <div className="sm:col-span-2">
                          <span className="font-medium text-slate-700">Source: </span>
                          <a href={rep.source_reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                            {rep.source_reference} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* RAG evidence */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">AI Evidence Assistance</span>
                        <span className="ml-auto rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-600">Advisory only</span>
                      </div>
                      {evidenceLoading[rep.id] ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600"><Loader2 className="h-4 w-4 animate-spin" /> Retrieving evidence…</div>
                      ) : evidence[rep.id] ? (
                        <div className="space-y-3">
                          {evidence[rep.id].rag_answer ? (
                            <div className="prose prose-sm max-w-none text-slate-700">
                              <ReactMarkdown>{evidence[rep.id].rag_answer}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No relevant documents retrieved for this report.</p>
                          )}
                          {evidence[rep.id].rag_sources?.length > 0 && (
                            <ul className="space-y-1">
                              {evidence[rep.id].rag_sources.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 border border-slate-100">
                                  <BookOpen className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                                  <div>
                                    <span className="font-medium">{s.title || 'Document'}</span>
                                    {s.source && <span className="text-slate-400"> — {s.source}</span>}
                                    {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-blue-500 hover:underline inline-flex items-center gap-0.5">Link<ExternalLink className="h-2.5 w-2.5" /></a>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-[11px] text-slate-400 italic">{evidence[rep.id].advisory_note}</p>
                        </div>
                      ) : (
                        <button onClick={() => loadEvidence(rep.id)} className="text-sm text-blue-600 hover:underline">Load evidence</button>
                      )}
                    </div>

                    {/* Hallucination Detection Check */}
                    <div className={`rounded-xl border p-4 ${
                      hallucination[rep.id]?.risk_level === 'high' ? 'border-rose-200 bg-rose-50' :
                      hallucination[rep.id]?.risk_level === 'medium' ? 'border-amber-200 bg-amber-50' :
                      hallucination[rep.id]?.risk_level === 'low' ? 'border-emerald-200 bg-emerald-50' :
                      'border-purple-100 bg-purple-50'
                    }`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${
                          hallucination[rep.id]?.risk_level === 'high' ? 'text-rose-600' :
                          hallucination[rep.id]?.risk_level === 'medium' ? 'text-amber-600' :
                          hallucination[rep.id]?.risk_level === 'low' ? 'text-emerald-600' :
                          'text-purple-600'
                        }`} />
                        <span className={`text-sm font-semibold ${
                          hallucination[rep.id]?.risk_level === 'high' ? 'text-rose-800' :
                          hallucination[rep.id]?.risk_level === 'medium' ? 'text-amber-800' :
                          hallucination[rep.id]?.risk_level === 'low' ? 'text-emerald-800' :
                          'text-purple-800'
                        }`}>Verification Analysis</span>
                        <span className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                          hallucination[rep.id]?.risk_level === 'high' ? 'bg-rose-100 border-rose-200 text-rose-600' :
                          hallucination[rep.id]?.risk_level === 'medium' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                          hallucination[rep.id]?.risk_level === 'low' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' :
                          'bg-purple-100 border-purple-200 text-purple-600'
                        }`}>
                          {hallucination[rep.id]?.risk_level?.toUpperCase() || 'PENDING'} RISK
                        </span>
                      </div>
                      {hallucinationLoading[rep.id] ? (
                        <div className="flex items-center gap-2 text-sm text-purple-600"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing report…</div>
                      ) : hallucination[rep.id] ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="mb-1 text-xs font-medium text-slate-600">Confidence Score</div>
                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full transition-all ${
                                    hallucination[rep.id].confidence_score >= 70 ? 'bg-emerald-500' :
                                    hallucination[rep.id].confidence_score >= 40 ? 'bg-amber-500' :
                                    'bg-rose-500'
                                  }`}
                                  style={{ width: `${hallucination[rep.id].confidence_score}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                hallucination[rep.id].confidence_score >= 70 ? 'text-emerald-600' :
                                hallucination[rep.id].confidence_score >= 40 ? 'text-amber-600' :
                                'text-rose-600'
                              }`}>
                                {hallucination[rep.id].confidence_score}%
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            <strong>Assessment:</strong> {hallucination[rep.id].recommendation}
                          </p>
                          {hallucination[rep.id].signals && (
                            <div className="grid gap-2 text-xs sm:grid-cols-2">
                              {Object.entries(hallucination[rep.id].signals).map(([key, signal]) => (
                                <div key={key} className="rounded-lg bg-white/60 border border-slate-200 px-3 py-2">
                                  <div className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, ' ')}</div>
                                  <div className="mt-1 text-slate-600">{signal.detail || `Score: ${signal.score}`}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400 italic">{hallucination[rep.id].disclaimer}</p>
                        </div>
                      ) : (
                        <button onClick={() => loadHallucinationCheck(rep.id)} className="text-sm text-purple-600 hover:underline">Run verification check</button>
                      )}
                    </div>

                    {/* Review notes and actions */}
                    <div className="space-y-2">
                      <textarea
                        value={reviewNotes[rep.id] || ''}
                        onChange={(e) => setReviewNotes((p) => ({ ...p, [rep.id]: e.target.value }))}
                        placeholder="Review notes (optional — visible to submitter if status changes)"
                        rows={2}
                        className={`${inputCls} resize-none`}
                      />
                      <textarea
                        value={decisionReasons[rep.id] || ''}
                        onChange={(e) => setDecisionReasons((p) => ({ ...p, [rep.id]: e.target.value }))}
                        placeholder="Decision reason (required when rejecting)"
                        rows={2}
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={!!actionLoading[rep.id]}
                        onClick={() => act(rep.id, 'approved', decisionReasons[rep.id], 'Approved from admin dashboard.')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading[rep.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve & Publish
                      </button>
                      <button
                        disabled={!!actionLoading[rep.id]}
                        onClick={() => act(rep.id, 'rejected', decisionReasons[rep.id] || 'Rejected by admin.', reviewNotes[rep.id])}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button
                        disabled={!!actionLoading[rep.id]}
                        onClick={() => act(rep.id, 'under_review', null, reviewNotes[rep.id] || 'Moved to under review.')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Mark Under Review
                      </button>
                      <button
                        disabled={!!actionLoading[rep.id]}
                        onClick={() => act(rep.id, 'needs_information', null, reviewNotes[rep.id] || 'More information required.')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Request More Info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapseCard>

      {/* Finalized */}
      <CollapseCard title="Finalized Reports" badge={done.length} badgeColor="bg-slate-100 text-slate-600">
        {done.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">No finalized reports yet.</p>
        ) : (
          <div className="space-y-2">
            {done.map((rep) => (
              <div key={rep.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <span className="font-medium text-slate-800">{rep.disease_name}</span>
                  <span className="ml-2 text-xs text-slate-500">{rep.state}{rep.district ? ` · ${rep.district}` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  {chip(rep.status)}
                  <span className="text-xs text-slate-400">{fmt(rep.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapseCard>
    </div>
  );
}

// ─── TAB 3: Information Requests ──────────────────────────────────────────────

function InformationRequestsTab({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [replies, setReplies]   = useState({});
  const [replyLoading, setReplyLoading] = useState({});

  const load = async () => {
    setLoading(true); setError('');
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const r = await fetch(`${API}/api/admin/information-requests${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to load information requests.');
      setRequests(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, statusFilter]);

  const sendReply = async (id) => {
    const reply = replies[id]?.trim();
    if (!reply) return;
    setReplyLoading((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`${API}/api/admin/information-requests/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ admin_reply: reply, status: 'admin_replied' }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Reply failed.');
      setReplies((p) => ({ ...p, [id]: '' }));
      await load();
      setExpanded(null);
    } catch (e) { setError(e.message); }
    finally { setReplyLoading((p) => ({ ...p, [id]: false })); }
  };

  const parseSources = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };

  const awaiting = requests.filter((r) => ['pending','awaiting_admin'].includes(r.status));
  const rest     = requests.filter((r) => !['pending','awaiting_admin'].includes(r.status));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none">
          <option value="">All statuses</option>
          {['pending','rag_answered','awaiting_admin','admin_replied','closed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <CollapseCard title="Awaiting Admin Response" badge={awaiting.length} badgeColor="bg-indigo-100 text-indigo-700">
        {awaiting.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">No requests awaiting response.</p>
        ) : (
          <div className="space-y-3">
            {awaiting.map((req) => (
              <div key={req.id} className="rounded-xl border border-slate-200 bg-white">
                <button onClick={() => setExpanded((v) => (v === req.id ? null : req.id))} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {req.topic && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{req.topic}</span>}
                      {chip(req.status)}
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">{req.question}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{relTime(req.created_at)} · Ref {req.id.slice(0,8).toUpperCase()}</p>
                  </div>
                  {expanded === req.id ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                </button>

                {expanded === req.id && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Full question</p>
                      <p className="text-sm text-slate-700 leading-6">{req.question}</p>
                    </div>

                    {/* RAG answer if available */}
                    {req.rag_grounded === 'true' && req.rag_answer && (
                      <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-teal-600" />
                          <span className="text-xs font-semibold text-teal-700">AI already answered this question</span>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-700">
                          <ReactMarkdown>{req.rag_answer}</ReactMarkdown>
                        </div>
                        {parseSources(req.rag_sources).length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {parseSources(req.rag_sources).map((s, i) => (
                              <li key={i} className="text-xs text-slate-500 flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3 flex-shrink-0" />
                                {s.title}{s.source ? ` — ${s.source}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your reply</p>
                      <textarea
                        value={replies[req.id] || ''}
                        onChange={(e) => setReplies((p) => ({ ...p, [req.id]: e.target.value }))}
                        placeholder="Type your response to the user…"
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={!replies[req.id]?.trim() || !!replyLoading[req.id]}
                          onClick={() => sendReply(req.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {replyLoading[req.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapseCard>

      <CollapseCard title="Answered / Closed" badge={rest.length} badgeColor="bg-slate-100 text-slate-600">
        {rest.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">No answered requests yet.</p>
        ) : (
          <div className="space-y-2">
            {rest.map((req) => (
              <div key={req.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-700 line-clamp-2">{req.question}</p>
                  {chip(req.status)}
                </div>
                {req.admin_reply && (
                  <p className="mt-1 text-xs text-violet-700 bg-violet-50 rounded-lg px-2 py-1.5">
                    <strong>Your reply:</strong> {req.admin_reply}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">{fmt(req.created_at)} · Ref {req.id.slice(0,8).toUpperCase()}</p>
              </div>
            ))}
          </div>
        )}
      </CollapseCard>
    </div>
  );
}

// ─── TAB 4: Feedback & Contact ────────────────────────────────────────────────

function FeedbackTab({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes]       = useState({});
  const [actLoading, setActLoading] = useState({});

  const load = async () => {
    setLoading(true); setError('');
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const r = await fetch(`${API}/api/admin/feedback-requests${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to load feedback.');
      setRequests(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token, statusFilter]);

  const review = async (id, status) => {
    setActLoading((p) => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`${API}/api/admin/feedback-requests/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, admin_notes: notes[id] || null }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Action failed.');
      await load();
      setExpanded(null);
    } catch (e) { setError(e.message); }
    finally { setActLoading((p) => ({ ...p, [id]: false })); }
  };

  const newItems = requests.filter((r) => r.status === 'new');
  const rest     = requests.filter((r) => r.status !== 'new');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none">
          <option value="">All statuses</option>
          {['new','reviewed','resolved'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <CollapseCard title="New Messages" badge={newItems.length} badgeColor="bg-sky-100 text-sky-700">
        {newItems.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">No new feedback.</p>
        ) : (
          <div className="space-y-3">
            {newItems.map((req) => (
              <div key={req.id} className="rounded-xl border border-slate-200 bg-white">
                <button onClick={() => setExpanded((v) => (v === req.id ? null : req.id))} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {CATEGORY_LABELS[req.category] || req.category}
                      </span>
                      {chip(req.status)}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800">{req.subject}</p>
                    <p className="text-xs text-slate-500">
                      {req.submitter_name || 'User'}{req.submitter_email ? ` (${req.submitter_email})` : ''} · {relTime(req.created_at)}
                    </p>
                  </div>
                  {expanded === req.id ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                </button>

                {expanded === req.id && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                    <p className="text-sm text-slate-700 leading-6 whitespace-pre-wrap">{req.message}</p>
                    {req.related_report_ref && (
                      <p className="text-xs text-slate-500">Related reference: <strong>{req.related_report_ref}</strong></p>
                    )}
                    <div className="space-y-2">
                      <textarea
                        value={notes[req.id] || ''}
                        onChange={(e) => setNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                        placeholder="Admin notes (optional, visible to user)"
                        rows={2}
                        className={`${inputCls} resize-none`}
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={!!actLoading[req.id]}
                          onClick={() => review(req.id, 'reviewed')}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {actLoading[req.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : null}
                          Mark Reviewed
                        </button>
                        <button
                          disabled={!!actLoading[req.id]}
                          onClick={() => review(req.id, 'resolved')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapseCard>

      <CollapseCard title="Reviewed / Resolved" badge={rest.length} badgeColor="bg-slate-100 text-slate-600">
        {rest.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">No resolved feedback yet.</p>
        ) : (
          <div className="space-y-2">
            {rest.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-slate-700">{req.subject}</span>
                  <span className="ml-2 text-xs text-slate-400">{CATEGORY_LABELS[req.category] || req.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  {chip(req.status)}
                  <span className="text-xs text-slate-400">{fmt(req.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapseCard>
    </div>
  );
}

// ─── TAB 5: Add Case Data ─────────────────────────────────────────────────────

const CASE_DEFAULTS = {
  disease: '', state: '', district: '', locality: '',
  reported_cases: '', deaths: '', risk_level: 'Medium',
  source_name: 'Admin review', source_reference: '', description: '',
  latitude: '', longitude: '',
  reporting_start: '', reporting_end: '',
};

function AddCaseTab({ token, onSaved }) {
  const [form, setForm]     = useState(CASE_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true); setError(''); setSuccess('');

    const payload = {
      ...form,
      reported_cases: form.reported_cases ? Number(form.reported_cases) : null,
      deaths:         form.deaths ? Number(form.deaths) : null,
      latitude:       form.latitude ? Number(form.latitude) : null,
      longitude:      form.longitude ? Number(form.longitude) : null,
      reporting_start: form.reporting_start || null,
      reporting_end:   form.reporting_end || null,
      district: form.district.trim() || null,
      locality: form.locality.trim() || null,
      source_reference: form.source_reference.trim() || null,
    };

    try {
      const r = await fetch(`${API}/api/admin/case-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(Array.isArray(data.detail) ? data.detail[0]?.msg || 'Validation error.' : data.detail || 'Failed to save.');
      setSuccess(`Record published: ${data.disease} · ${data.state}${data.district ? ` · ${data.district}` : ''}`);
      setForm(CASE_DEFAULTS);
      if (onSaved) onSaved();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Dataset Upload Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Bulk Import from Dataset</h3>
            <p className="mt-1 text-sm text-slate-600">
              Upload CSV or Excel file with outbreak data for batch processing
            </p>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showUpload ? 'Hide' : 'Show'} Upload
          </button>
        </div>
        {showUpload && (
          <DatasetUpload 
            token={token} 
            onImportComplete={() => {
              setShowUpload(false);
              if (onSaved) onSaved();
              setSuccess('Dataset imported successfully! Records are now published.');
            }}
          />
        )}
      </div>

      {/* Manage Existing Cases Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Manage Existing Cases</h3>
            <p className="mt-1 text-sm text-slate-600">
              View and edit published outbreak records. Updates crossing 100 cases will notify all users.
            </p>
          </div>
          <button
            onClick={() => setShowManage(!showManage)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showManage ? 'Hide' : 'Show'} Table
          </button>
        </div>
        {showManage && (
          <ManageExistingCases 
            token={token} 
            onUpdate={() => {
              if (onSaved) onSaved();
              setSuccess('Record updated successfully');
            }}
          />
        )}
      </div>

      {/* Manual Entry Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-bold text-slate-900">Publish Single Verified Outbreak Record</h3>
      {error   && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Disease *</label>
            <input value={form.disease} onChange={set('disease')} placeholder="e.g. Dengue" className={inputCls} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">State *</label>
            <input value={form.state} onChange={set('state')} placeholder="e.g. Maharashtra" className={inputCls} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">District</label>
            <input value={form.district} onChange={set('district')} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Locality</label>
            <input value={form.locality} onChange={set('locality')} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reported cases</label>
            <input type="number" min="0" value={form.reported_cases} onChange={set('reported_cases')} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Deaths</label>
            <input type="number" min="0" value={form.deaths} onChange={set('deaths')} placeholder="Optional" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Risk level</label>
            <select value={form.risk_level} onChange={set('risk_level')} className={inputCls}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source name</label>
            <input value={form.source_name} onChange={set('source_name')} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source reference / URL</label>
            <input value={form.source_reference} onChange={set('source_reference')} placeholder="Optional — URL or document reference" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting start date</label>
            <input type="date" value={form.reporting_start} onChange={set('reporting_start')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting end date</label>
            <input type="date" value={form.reporting_end} onChange={set('reporting_end')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Latitude <span className="normal-case font-normal text-slate-400">(India: 6–38°N)</span></label>
            <input type="number" step="0.0001" value={form.latitude} onChange={set('latitude')} placeholder="e.g. 19.0760" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Longitude <span className="normal-case font-normal text-slate-400">(India: 68–98°E)</span></label>
            <input type="number" step="0.0001" value={form.longitude} onChange={set('longitude')} placeholder="e.g. 72.8777" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description / Verification notes *</label>
            <textarea value={form.description} onChange={set('description')} rows={4} placeholder="Summarise the outbreak, source verification and key facts." className={`${inputCls} resize-none`} required />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {saving ? 'Publishing…' : 'Publish Record'}
          </button>
          <p className="text-xs text-slate-400">Record goes live immediately in the public feed and heatmap.</p>
        </div>
      </form>
    </div>
  </div>
  );
}

// ─── TAB 6: Disease Alerts ────────────────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { value: 'medium',   label: 'Medium',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'high',     label: 'High',     color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'critical', label: 'Critical', color: 'text-rose-700 bg-rose-50 border-rose-200' },
];

const SEV_STYLE = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-sky-100 text-sky-700 border-sky-200',
};

const ALERT_DEFAULTS = {
  title: '', disease: '', affected_state: '', affected_district: '',
  severity: 'medium', message: '',
  observation_window: '', baseline_comparison: '', observed_values: '',
  detection_method: '', target_audience: 'all',
  related_outbreak_id: '',
};

function AlertsTab({ token, onSaved }) {
  const [alerts, setAlerts]           = useState([]);
  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [form, setForm]               = useState(ALERT_DEFAULTS);
  const [creating, setCreating]       = useState(false);
  const [sendNow, setSendNow]         = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult]   = useState('');

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const loadAlerts = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/admin/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('Failed to load alerts.');
      setAlerts(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadCandidates = async () => {
    try {
      const r = await fetch(`${API}/api/admin/alerts/anomaly-candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setCandidates((await r.json()).candidates || []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => { loadAlerts(); loadCandidates(); }, [token]);

  const prefillFromCandidate = (c) => {
    setForm((f) => ({
      ...f,
      title: c.message.slice(0, 80),
      message: c.message,
      severity: c.suggested_severity || 'medium',
      detection_method: 'threshold: weekly_change analysis',
    }));
    setSuccess('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setCreating(true); setError(''); setSuccess('');
    try {
      const payload = {
        title: form.title.trim(),
        disease: form.disease.trim() || null,
        affected_state: form.affected_state.trim() || null,
        affected_district: form.affected_district.trim() || null,
        severity: form.severity,
        message: form.message.trim(),
        observation_window: form.observation_window.trim() || null,
        baseline_comparison: form.baseline_comparison.trim() || null,
        observed_values: form.observed_values.trim() || null,
        detection_method: form.detection_method.trim() || null,
        target_audience: form.target_audience || 'all',
        related_outbreak_id: form.related_outbreak_id.trim() || null,
      };
      const r = await fetch(`${API}/api/admin/alerts?send_now=${sendNow}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Failed to create alert.');
      setSuccess(
        sendNow
          ? `Alert sent to ${data.recipient_count ?? 0} user${data.recipient_count !== 1 ? 's' : ''}. Reference: ${data.id.slice(0,8).toUpperCase()}`
          : `Alert saved as draft. Reference: ${data.id.slice(0,8).toUpperCase()}`
      );
      setForm(ALERT_DEFAULTS);
      loadAlerts();
      if (onSaved) onSaved();
    } catch (e) { setError(e.message); }
    finally { setCreating(false); }
  };

  const sendDraft = async (id) => {
    try {
      const r = await fetch(`${API}/api/admin/alerts/${id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).detail || 'Send failed.');
      loadAlerts();
      if (onSaved) onSaved();
    } catch (e) { setError(e.message); }
  };

  const seedStaticData = async () => {
    setSeedLoading(true); setSeedResult('');
    try {
      const r = await fetch(`${API}/api/admin/seed-static-outbreaks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Seed failed.');
      setSeedResult(data.message);
    } catch (e) { setSeedResult(`Error: ${e.message}`); }
    finally { setSeedLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* ── Heatmap seed helper ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
        <h3 className="mb-1 text-sm font-bold text-teal-900">Populate Heatmap with Verified District Data</h3>
        <p className="mb-3 text-xs text-teal-700">
          Seeds the published outbreak database from the curated static India district dataset (34 records covering 17 states).
          Safe to run multiple times — existing records are skipped.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={seedStaticData}
            disabled={seedLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {seedLoading ? 'Seeding…' : 'Seed Static Outbreaks'}
          </button>
          {seedResult && (
            <span className={`text-xs font-medium ${seedResult.startsWith('Error') ? 'text-rose-600' : 'text-teal-700'}`}>
              {seedResult}
            </span>
          )}
        </div>
      </div>

      {/* ── Anomaly candidates ──────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <CollapseCard title="Anomaly Candidates (from trend analysis)" badge={candidates.length} badgeColor="bg-orange-100 text-orange-700">
          <p className="mb-3 text-xs text-slate-500">
            These are threshold-based signals from the static outbreak dataset.
            Review the evidence before sending an alert — these are suggestions, not confirmed outbreaks.
          </p>
          <div className="space-y-2">
            {candidates.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase flex-shrink-0 ${SEV_STYLE[c.suggested_severity] || SEV_STYLE.medium}`}>
                    {c.type}
                  </span>
                  <p className="text-sm text-slate-700">{c.message}</p>
                </div>
                <button
                  onClick={() => prefillFromCandidate(c)}
                  className="flex-shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Use as draft
                </button>
              </div>
            ))}
          </div>
        </CollapseCard>
      )}

      {/* ── Alert composer ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-lg font-bold text-slate-900">Create Disease Anomaly Alert</h3>
        {error   && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Alert Title *</label>
              <input value={form.title} onChange={setF('title')} placeholder="e.g. Dengue surge in Bengaluru Urban" className={inputCls} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Disease</label>
              <input value={form.disease} onChange={setF('disease')} placeholder="e.g. Dengue" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Severity *</label>
              <select value={form.severity} onChange={setF('severity')} className={inputCls}>
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Affected State</label>
              <input value={form.affected_state} onChange={setF('affected_state')} placeholder="e.g. Karnataka" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Affected District</label>
              <input value={form.affected_district} onChange={setF('affected_district')} placeholder="e.g. Bengaluru Urban" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observation Window</label>
              <input value={form.observation_window} onChange={setF('observation_window')} placeholder="e.g. 2026-05-01 – 2026-05-09" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Detection Method</label>
              <input value={form.detection_method} onChange={setF('detection_method')} placeholder="e.g. threshold: weekly_change > 30%" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Observed Values</label>
              <input value={form.observed_values} onChange={setF('observed_values')} placeholder="e.g. 3420 cases, +18.5% weekly" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Baseline Comparison</label>
              <input value={form.baseline_comparison} onChange={setF('baseline_comparison')} placeholder="e.g. vs 2890 cases prior week" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Target Audience</label>
              <select value={form.target_audience} onChange={setF('target_audience')} className={inputCls}>
                <option value="all">All registered users</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">Alert is delivered to all registered non-admin users.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message * <span className="normal-case font-normal text-slate-400">(explain the anomaly and recommended action)</span></label>
              <textarea value={form.message} onChange={setF('message')} rows={4} placeholder="Describe the anomaly clearly. Include what was observed, potential causes, and any recommended precautions. Do not claim this is a confirmed outbreak unless verified." className={`${inputCls} resize-none`} required />
              <p className="mt-1 text-right text-xs text-slate-400">{form.message.length}/5000</p>
            </div>
          </div>

          {/* Send options */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(e) => setSendNow(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <span className="text-sm font-medium text-slate-700">Send immediately</span>
            </label>
            <span className="text-xs text-slate-400">
              {sendNow ? 'Alert will be delivered to all eligible users right away.' : 'Alert will be saved as a draft — send it later.'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {creating ? 'Saving…' : sendNow ? 'Create & Send Alert' : 'Save as Draft'}
            </button>
            <p className="text-xs text-slate-400">
              Clearly distinguish observed data from ML predictions. Do not fabricate case counts or severity.
            </p>
          </div>
        </form>
      </div>

      {/* ── Sent alerts list ────────────────────────────────────────────── */}
      <CollapseCard title="Sent & Draft Alerts" badge={alerts.length} badgeColor="bg-slate-100 text-slate-600">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : alerts.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">No alerts created yet.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{a.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEV_STYLE[a.severity] || SEV_STYLE.medium}`}>{a.severity}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === 'sent' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {a.status}
                    </span>
                  </div>
                  {a.disease && <p className="mt-0.5 text-xs text-slate-500">{a.disease}{a.affected_state ? ` · ${a.affected_state}` : ''}</p>}
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {a.recipient_count ?? 0} recipients · {a.sent_at ? `Sent ${fmt(a.sent_at)}` : `Created ${fmt(a.created_at)}`}
                  </p>
                </div>
                {a.status === 'draft' && (
                  <button
                    onClick={() => sendDraft(a.id)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button onClick={loadAlerts} className="text-xs text-slate-400 hover:text-slate-600 hover:underline inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </CollapseCard>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',             icon: Activity },
  { id: 'info',       label: 'Information Requests',  icon: HelpCircle },
  { id: 'feedback',   label: 'Feedback & Contact',    icon: MessageSquare },
  { id: 'alerts',     label: 'Disease Alerts',        icon: Bell },
];

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { userData, token } = useAuth();
  const location = useLocation();
  
  // Read tab from URL parameter
  const searchParams = new URLSearchParams(location.search);
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'overview');
  
  // Update tab when URL changes
  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/statistics`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setStats(await r.json());
    } catch { /* non-fatal */ }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { loadStats(); }, [token]);

  const statCards = stats ? [
    { icon: Database,       label: 'Total Predictions', value: stats.total_predictions ?? 0, color: 'bg-blue-500' },
    { icon: Users,          label: 'Registered Users',  value: stats.total_users ?? 0,        color: 'bg-green-500' },
    { icon: AlertTriangle,  label: 'Pending Reports',   value: stats.pending_reports ?? 0,    color: 'bg-orange-500' },
    { icon: Shield,         label: 'Published Outbreaks', value: stats.published_outbreaks ?? 0, color: 'bg-emerald-500' },
    { icon: HelpCircle,     label: 'Pending Info Requests', value: stats.pending_information_requests ?? 0, color: 'bg-indigo-500' },
    { icon: MessageSquare,  label: 'New Feedback',      value: stats.new_feedback_requests ?? 0, color: 'bg-violet-500' },
  ] : [];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back, {userData?.name || 'Admin'}
            </h1>
            <p className="mt-1 text-slate-500">Manage outbreak reports, information requests, feedback and published records.</p>
          </motion.div>

          {/* Stats strip */}
          {statsLoading && !stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white p-5 shadow-sm border border-slate-100 h-24" />
              ))}
            </div>
          )}
          {statCards.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {statCards.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-4">{s.label}</p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              // Badge counts from stats
              const badges = {
                reports:  stats?.pending_reports,
                info:     stats?.pending_information_requests,
                feedback: stats?.new_feedback_requests,
                alerts:   null,  // no auto-badge for alerts tab
              };
              const badge = badges[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {badge != null && badge > 0 && (
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? 'bg-white text-slate-900' : 'bg-orange-500 text-white'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'overview' && (
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Quick actions */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: AlertTriangle, label: 'Review Reports', tab: 'reports', color: 'border-orange-200 hover:bg-orange-50 text-orange-600' },
                      { icon: HelpCircle,    label: 'Info Requests', tab: 'info', color: 'border-indigo-200 hover:bg-indigo-50 text-indigo-600' },
                      { icon: MessageSquare, label: 'Feedback', tab: 'feedback', color: 'border-violet-200 hover:bg-violet-50 text-violet-600' },
                      { icon: Bell,          label: 'Disease Alerts', tab: 'alerts', color: 'border-rose-200 hover:bg-rose-50 text-rose-600' },
                      { icon: Upload,        label: 'Add Case Data', tab: 'add', color: 'border-slate-200 hover:bg-slate-50 text-slate-700' },
                    ].map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.tab}
                          onClick={() => setActiveTab(a.tab)}
                          className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${a.color}`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-sm font-semibold text-slate-800">{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* System notices */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">System Notes</h2>
                  <ul className="space-y-3 text-sm text-slate-600">
                    {[
                      { dot: 'bg-emerald-500', text: 'Approved reports are published automatically to the public feed and heatmap.' },
                      { dot: 'bg-amber-500',   text: 'Pending and under-review reports are never visible to regular users.' },
                      { dot: 'bg-blue-500',    text: 'AI evidence assistance is advisory only. Human review is always required.' },
                      { dot: 'bg-violet-500',  text: 'Information requests may be pre-answered by RAG; review those too.' },
                      { dot: 'bg-rose-500',    text: 'Records without latitude/longitude will not appear on the map.' },
                      { dot: 'bg-slate-500',   text: 'Use "Add Case Data → Seed Static Data" to populate the heatmap with verified district-level outbreak data.' },
                      { dot: 'bg-orange-500',  text: 'Disease Alerts tab: create and send admin anomaly alerts to all registered users.' },
                    ].map((n, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.dot}`} />
                        {n.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'reports'  && <OutbreakReportsTab token={token} />}
            {activeTab === 'info'     && <InformationRequestsTab token={token} />}
            {activeTab === 'feedback' && <FeedbackTab token={token} />}
            {activeTab === 'alerts'   && <AlertsTab token={token} onSaved={loadStats} />}
            {activeTab === 'add'      && <AddCaseTab token={token} onSaved={loadStats} />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
