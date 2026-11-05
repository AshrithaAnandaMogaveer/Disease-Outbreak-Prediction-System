/**
 * ReportOutbreakModal — Section 1 of the three communication cards.
 * Allows authenticated users to submit a possible outbreak report for admin review.
 * The submission is persisted as Pending and never appears in the public feed until approved.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, X, Upload, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:8000';

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const DEFAULT_FORM = {
  disease_name: '',
  state: '',
  district: '',
  locality: '',
  observation_date: '',
  reported_cases: '',
  description: '',
  source_reference: '',
};

const Field = ({ label, error, required, children }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
      {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
  </div>
);

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-emerald-400 ${
    err ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'
  }`;

export default function ReportOutbreakModal({ onClose, onSuccess }) {
  const { token } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parseError, setParseError] = useState('');

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setUploadedFile(file);

    const ext = file.name.toLowerCase();
    
    try {
      if (ext.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV file must have headers and at least one data row');
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const values = lines[1].split(',').map(v => v.trim());
        
        const data = {};
        headers.forEach((h, i) => {
          data[h] = values[i] || '';
        });

        // Map common CSV column names to form fields
        const mapping = {
          'disease': 'disease_name',
          'disease_name': 'disease_name',
          'disease name': 'disease_name',
          'state': 'state',
          'district': 'district',
          'city': 'district',
          'locality': 'locality',
          'area': 'locality',
          'location': 'locality',
          'date': 'observation_date',
          'observation_date': 'observation_date',
          'observation date': 'observation_date',
          'cases': 'reported_cases',
          'case_count': 'reported_cases',
          'case count': 'reported_cases',
          'reported_cases': 'reported_cases',
          'count': 'reported_cases',
          'description': 'description',
          'details': 'description',
          'observations': 'description',
          'source': 'source_reference',
          'reference': 'source_reference',
          'source_reference': 'source_reference',
        };

        const newForm = { ...form };
        Object.entries(data).forEach(([key, value]) => {
          const formField = mapping[key];
          if (formField && value) {
            newForm[formField] = value;
          }
        });

        setForm(newForm);
        
      } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (array of objects)
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          throw new Error('Excel file must have at least one data row');
        }
        
        // Use first row of data
        const data = jsonData[0];
        
        // Normalize keys to lowercase for mapping
        const normalizedData = {};
        Object.keys(data).forEach(key => {
          normalizedData[key.toLowerCase().trim()] = data[key];
        });
        
        // Map Excel column names to form fields
        const mapping = {
          'disease': 'disease_name',
          'disease_name': 'disease_name',
          'disease name': 'disease_name',
          'state': 'state',
          'district': 'district',
          'city': 'district',
          'locality': 'locality',
          'area': 'locality',
          'location': 'locality',
          'date': 'observation_date',
          'observation_date': 'observation_date',
          'observation date': 'observation_date',
          'cases': 'reported_cases',
          'case_count': 'reported_cases',
          'case count': 'reported_cases',
          'reported_cases': 'reported_cases',
          'count': 'reported_cases',
          'description': 'description',
          'details': 'description',
          'observations': 'description',
          'source': 'source_reference',
          'reference': 'source_reference',
          'source_reference': 'source_reference',
        };

        const newForm = { ...form };
        Object.entries(normalizedData).forEach(([key, value]) => {
          const formField = mapping[key];
          if (formField && value !== undefined && value !== null) {
            // Handle Excel dates
            if (formField === 'observation_date' && typeof value === 'number') {
              // Excel dates are stored as numbers (days since 1900-01-01)
              const excelDate = XLSX.SSF.parse_date_code(value);
              const date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
              newForm[formField] = date.toISOString().split('T')[0];
            } else {
              newForm[formField] = String(value);
            }
          }
        });

        setForm(newForm);
        
      } else if (ext.endsWith('.json')) {
        // Parse JSON
        const text = await file.text();
        const data = JSON.parse(text);
        
        const newForm = {
          disease_name: data.disease_name || data.disease || data.Disease || '',
          state: data.state || data.State || '',
          district: data.district || data.city || data.District || data.City || '',
          locality: data.locality || data.area || data.location || data.Locality || '',
          observation_date: data.observation_date || data.date || data.Date || '',
          reported_cases: data.reported_cases || data.cases || data.case_count || data.Cases || '',
          description: data.description || data.details || data.observations || data.Description || '',
          source_reference: data.source_reference || data.source || data.reference || data.Source || '',
        };

        setForm(newForm);
        
      } else {
        throw new Error('Unsupported file format. Please upload CSV, Excel (.xlsx, .xls), or JSON file.');
      }
      
    } catch (err) {
      setParseError(err.message || 'Failed to parse file. Please check the format.');
      setUploadedFile(null);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setParseError('');
  };

  const validate = () => {
    const e = {};
    if (!form.disease_name.trim()) e.disease_name = 'Disease name is required.';
    if (!form.state) e.state = 'State is required.';
    if (!form.description.trim() || form.description.trim().length < 20)
      e.description = 'Please provide at least 20 characters describing what you observed.';
    if (form.reported_cases && (isNaN(Number(form.reported_cases)) || Number(form.reported_cases) < 0))
      e.reported_cases = 'Enter a valid non-negative number or leave blank.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setSubmitError('');

    const norm = (v) => (typeof v === 'string' ? (v.trim() || null) : v || null);

    const payload = {
      disease_name: form.disease_name.trim(),
      state: form.state,
      district: norm(form.district),
      locality: norm(form.locality),
      observation_date: norm(form.observation_date),
      description: form.description.trim(),
      reported_cases: form.reported_cases ? Number(form.reported_cases) : null,
      source_reference: norm(form.source_reference),
    };

    try {
      const res = await fetch(`${API_BASE}/api/outbreaks/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed.');
      setSuccessData(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Report a Possible Outbreak</h2>
              <p className="text-xs text-slate-500">Your submission goes to admin review — not the public feed.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success state */}
        {successData ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </span>
            <h3 className="text-xl font-bold text-slate-900">Report Submitted</h3>
            <p className="max-w-sm text-sm text-slate-600">
              Your report has been received and is pending administrator review. It will not appear
              in the public outbreak feed until it has been reviewed and approved.
            </p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm">
              <span className="font-semibold text-emerald-700">Reference ID:</span>{' '}
              <span className="font-mono text-emerald-800">{successData.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <p className="text-xs text-slate-400">Status: <strong className="text-amber-600">Pending Review</strong></p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-5">
            {/* Warning banner */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Your submission will be reviewed by an administrator.{' '}
                <strong>Submitting a report does not confirm an outbreak.</strong>
              </span>
            </div>

            {/* File Upload Section */}
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Upload className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">
                    Upload Dataset (Optional)
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Upload a CSV, Excel, or JSON file with outbreak data to auto-fill the form fields
                  </p>
                  
                  {uploadedFile ? (
                    <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-slate-700 flex-1">{uploadedFile.name}</span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition">
                      <Upload className="h-4 w-4" />
                      Choose File
                      <input
                        type="file"
                        accept=".csv,.json,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {parseError && (
                    <p className="mt-2 text-xs text-rose-600">{parseError}</p>
                  )}

                  <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                      Expected file format
                    </summary>
                    <div className="mt-2 text-xs text-slate-600 space-y-2">
                      <p className="font-medium">Excel (.xlsx, .xls) Example:</p>
                      <div className="bg-white rounded p-2 text-[10px]">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="border px-2 py-1 text-left">disease_name</th>
                              <th className="border px-2 py-1 text-left">state</th>
                              <th className="border px-2 py-1 text-left">district</th>
                              <th className="border px-2 py-1 text-left">cases</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border px-2 py-1">Dengue</td>
                              <td className="border px-2 py-1">Maharashtra</td>
                              <td className="border px-2 py-1">Mumbai</td>
                              <td className="border px-2 py-1">25</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      <p className="font-medium mt-3">CSV Example:</p>
                      <pre className="bg-white rounded p-2 text-[10px] overflow-x-auto">
disease_name,state,district,locality,date,cases,description,source{'\n'}
Dengue,Maharashtra,Mumbai,Andheri,2024-03-15,25,Fever cases reported,Local Hospital
                      </pre>
                      
                      <p className="font-medium mt-2">JSON Example:</p>
                      <pre className="bg-white rounded p-2 text-[10px] overflow-x-auto">
{`{
  "disease_name": "Dengue",
  "state": "Maharashtra",
  "district": "Mumbai",
  "locality": "Andheri",
  "observation_date": "2024-03-15",
  "reported_cases": "25",
  "description": "Fever cases reported",
  "source_reference": "Local Hospital"
}`}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Disease name" required error={errors.disease_name}>
                <input
                  value={form.disease_name}
                  onChange={set('disease_name')}
                  placeholder='e.g. Dengue, Cholera, "Unknown / Not sure"'
                  className={inputCls(errors.disease_name)}
                />
              </Field>

              <Field label="State" required error={errors.state}>
                <select value={form.state} onChange={set('state')} className={inputCls(errors.state)}>
                  <option value="">Select state…</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <Field label="District / City" error={errors.district}>
                <input
                  value={form.district}
                  onChange={set('district')}
                  placeholder="Optional — district or city"
                  className={inputCls(errors.district)}
                />
              </Field>

              <Field label="Locality / Area" error={errors.locality}>
                <input
                  value={form.locality}
                  onChange={set('locality')}
                  placeholder="Optional — neighbourhood or village"
                  className={inputCls(errors.locality)}
                />
              </Field>

              <Field label="Observation date" error={errors.observation_date}>
                <input
                  type="date"
                  value={form.observation_date}
                  onChange={set('observation_date')}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputCls(errors.observation_date)}
                />
              </Field>

              <Field label="Approximate case count" error={errors.reported_cases}>
                <input
                  type="number"
                  min="0"
                  value={form.reported_cases}
                  onChange={set('reported_cases')}
                  placeholder="Optional — if known"
                  className={inputCls(errors.reported_cases)}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Source / Reference" error={errors.source_reference}>
                  <input
                    value={form.source_reference}
                    onChange={set('source_reference')}
                    placeholder="Optional — news URL, hospital name, official report reference"
                    className={inputCls(errors.source_reference)}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Describe what you observed" required error={errors.description}>
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    placeholder="Describe the situation: symptoms observed, number of people affected, local conditions, any unusual patterns..."
                    rows={4}
                    className={`${inputCls(errors.description)} resize-none`}
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{form.description.length}/2000</p>
                </Field>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
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
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
