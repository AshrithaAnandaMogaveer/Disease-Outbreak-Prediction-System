/**
 * RequestInformationPanel — Section 2 of the three communication cards.
 * Users ask a disease/outbreak question. RAG answers automatically where
 * possible. If RAG cannot ground an answer the request routes to admin.
 */
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, CheckCircle2, ChevronDown, ExternalLink,
  HelpCircle, Loader2, Send, Sparkles, X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8000';

const DISEASE_SUGGESTIONS = [
  'Dengue', 'Malaria', 'Cholera', 'Tuberculosis', 'COVID-19',
  'Typhoid', 'Leptospirosis', 'Chikungunya', 'Hepatitis A', 'Japanese Encephalitis',
];

const STATUS_LABELS = {
  pending: { label: 'Processing', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  rag_answered: { label: 'Answered by AI', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  awaiting_admin: { label: 'Awaiting Admin', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  admin_replied: { label: 'Admin Replied', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  closed: { label: 'Closed', color: 'text-slate-600 bg-slate-100 border-slate-200' },
};

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-400 ${
    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'
  }`;

export default function RequestInformationPanel({ onClose, outbreaks = [] }) {
  const { token } = useAuth();

  // Form state
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [relatedOutbreakId, setRelatedOutbreakId] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Source expansion
  const [expandedSources, setExpandedSources] = useState(false);

  const questionRef = useRef(null);

  const fetchHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/information-requests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch { /* non-fatal */ }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, [token]);

  const validate = () => {
    const e = {};
    if (!question.trim() || question.trim().length < 10)
      e.question = 'Please enter at least 10 characters.';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setSubmitError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/information-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic: topic.trim() || null,
          question: question.trim(),
          related_outbreak_id: relatedOutbreakId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed.');
      setResult(data);
      fetchHistory();
      setTopic('');
      setQuestion('');
      setRelatedOutbreakId('');
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseSources = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };

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
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Request Outbreak Information</h2>
              <p className="text-xs text-slate-500">Ask about a disease or outbreak — AI answers where possible.</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Result card */}
          {result && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Response</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusMeta(result.status).color}`}>
                  {statusMeta(result.status).label}
                </span>
              </div>

              {result.rag_grounded === 'true' && result.rag_answer ? (
                <>
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <ReactMarkdown>{result.rag_answer}</ReactMarkdown>
                  </div>
                  {parseSources(result.rag_sources).length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedSources((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {expandedSources ? 'Hide sources' : `View ${parseSources(result.rag_sources).length} source(s)`}
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedSources ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSources && (
                        <ul className="mt-2 space-y-1.5">
                          {parseSources(result.rag_sources).map((src, i) => (
                            <li key={i} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700 border border-slate-100">
                              <BookOpen className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                              <div>
                                <span className="font-medium">{src.title || 'Document'}</span>
                                {src.source && <span className="text-slate-500"> — {src.source}</span>}
                                {src.url && (
                                  <a href={src.url} target="_blank" rel="noopener noreferrer"
                                    className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                                    Link <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Your question has been forwarded to the administrator for a detailed response.{' '}
                  <strong>Reference: {result.id?.slice(0, 8).toUpperCase()}</strong>
                </p>
              )}

              {result.admin_reply && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-600">Admin Reply</p>
                  <p className="text-sm text-violet-900">{result.admin_reply}</p>
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
              >
                Ask another question
              </button>
            </div>
          )}

          {/* Form */}
          {!result && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Topic / Disease <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder='e.g. "Dengue" or "Water-borne diseases in monsoon"'
                  className={inputCls(false)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DISEASE_SUGGESTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setTopic(d); questionRef.current?.focus(); }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {outbreaks.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Related published outbreak <span className="text-slate-400 normal-case font-normal">(optional)</span>
                  </label>
                  <select
                    value={relatedOutbreakId}
                    onChange={(e) => setRelatedOutbreakId(e.target.value)}
                    className={inputCls(false)}
                  >
                    <option value="">Not related to a specific outbreak</option>
                    {outbreaks.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.disease} — {o.state}{o.district ? `, ${o.district}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Your question <span className="text-rose-500">*</span>
                </label>
                <textarea
                  ref={questionRef}
                  value={question}
                  onChange={(e) => { setQuestion(e.target.value); if (errors.question) setErrors({}); }}
                  placeholder="Ask about symptoms, transmission, prevention, or request clarification about a published outbreak..."
                  rows={4}
                  className={`${inputCls(errors.question)} resize-none`}
                />
                {errors.question && <p className="mt-1 text-xs text-rose-600">{errors.question}</p>}
                <p className="mt-1 text-right text-xs text-slate-400">{question.length}/2000</p>
              </div>

              {submitError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400">
                  AI will try to answer from trusted health documents. Unanswered questions go to admin.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          )}

          {/* Request history */}
          <div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <span>My previous requests ({history.length})</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>

            {showHistory && (
              <div className="mt-2 max-h-64 overflow-y-auto space-y-2 rounded-xl border border-slate-100 p-3">
                {historyLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : history.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No previous requests.</p>
                ) : (
                  history.map((item) => {
                    const meta = statusMeta(item.status);
                    return (
                      <div key={item.id} className="rounded-lg border border-slate-100 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-slate-700 line-clamp-2">{item.question}</p>
                          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        {item.admin_reply && (
                          <p className="mt-1.5 text-xs text-violet-700 bg-violet-50 rounded-lg px-2 py-1.5">
                            <strong>Admin:</strong> {item.admin_reply}
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
    </div>
  );
}
