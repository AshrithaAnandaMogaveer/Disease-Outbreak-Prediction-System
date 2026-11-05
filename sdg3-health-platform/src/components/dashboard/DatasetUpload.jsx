/**
 * DatasetUpload — CSV/Excel upload with column mapping and bulk import.
 * Supports drag-and-drop, validates data, previews records, and imports to backend.
 */
import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const API = 'http://localhost:8000';

// Column mapping configuration
const FIELD_MAPPINGS = {
  disease: ['disease', 'disease_name', 'disease name', 'illness'],
  state: ['state', 'state_name', 'state name', 'province'],
  district: ['district', 'district_name', 'district name'],
  locality: ['locality', 'location', 'area', 'place'],
  reported_cases: ['reported_cases', 'cases', 'total_cases', 'total cases', 'confirmed'],
  active_cases: ['active_cases', 'active', 'current_cases'],
  recoveries: ['recoveries', 'recovered', 'recovery'],
  deaths: ['deaths', 'fatalities', 'deceased'],
  risk_level: ['risk_level', 'risk', 'severity'],
  reporting_start: ['reporting_start', 'start_date', 'date', 'report_date'],
  reporting_end: ['reporting_end', 'end_date'],
  source_name: ['source_name', 'source', 'data_source'],
  source_reference: ['source_reference', 'reference', 'url', 'link'],
  description: ['description', 'notes', 'details', 'summary'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon', 'long'],
};

// Detect column mapping from headers
function detectMapping(headers) {
  const mapping = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const [field, variants] of Object.entries(FIELD_MAPPINGS)) {
    for (const variant of variants) {
      const idx = normalizedHeaders.indexOf(variant);
      if (idx !== -1) {
        mapping[field] = headers[idx];
        break;
      }
    }
  }
  
  return mapping;
}

// Validate a single record
function validateRecord(record, rowNum) {
  const errors = [];
  
  // Required fields
  if (!record.disease?.trim()) errors.push(`Row ${rowNum}: Missing disease name`);
  if (!record.state?.trim()) errors.push(`Row ${rowNum}: Missing state`);
  if (!record.description?.trim()) errors.push(`Row ${rowNum}: Missing description`);
  
  // Numeric validations
  if (record.reported_cases && (isNaN(record.reported_cases) || record.reported_cases < 0)) {
    errors.push(`Row ${rowNum}: Invalid reported_cases`);
  }
  if (record.active_cases && (isNaN(record.active_cases) || record.active_cases < 0)) {
    errors.push(`Row ${rowNum}: Invalid active_cases`);
  }
  if (record.recoveries && (isNaN(record.recoveries) || record.recoveries < 0)) {
    errors.push(`Row ${rowNum}: Invalid recoveries`);
  }
  if (record.deaths && (isNaN(record.deaths) || record.deaths < 0)) {
    errors.push(`Row ${rowNum}: Invalid deaths`);
  }
  
  // Coordinate validations (India range)
  if (record.latitude) {
    const lat = parseFloat(record.latitude);
    if (isNaN(lat) || lat < 6 || lat > 38) {
      errors.push(`Row ${rowNum}: Latitude out of India range (6-38°N)`);
    }
  }
  if (record.longitude) {
    const lng = parseFloat(record.longitude);
    if (isNaN(lng) || lng < 68 || lng > 98) {
      errors.push(`Row ${rowNum}: Longitude out of India range (68-98°E)`);
    }
  }
  
  // Case count consistency
  if (record.reported_cases && record.active_cases && record.recoveries && record.deaths) {
    const reported = Number(record.reported_cases);
    const active = Number(record.active_cases);
    const recovered = Number(record.recoveries);
    const dead = Number(record.deaths);
    if (active + recovered + dead !== reported) {
      errors.push(`Row ${rowNum}: Case count inconsistency (active + recoveries + deaths ≠ reported)`);
    }
  }
  
  return errors;
}

export default function DatasetUpload({ token, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [records, setRecords] = useState([]);
  const [mapping, setMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile) => {
    setFile(selectedFile);
    setParsing(true);
    setErrors([]);
    setRecords([]);
    setMapping({});
    setImportResult(null);

    const fileName = selectedFile.name.toLowerCase();
    
    try {
      if (fileName.endsWith('.csv')) {
        // Parse CSV
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processData(results.data, results.meta.fields);
            setParsing(false);
          },
          error: (error) => {
            setErrors([`CSV parsing error: ${error.message}`]);
            setParsing(false);
          }
        });
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            if (jsonData.length < 2) {
              setErrors(['Excel file is empty or has no data rows']);
              setParsing(false);
              return;
            }
            
            const headers = jsonData[0];
            const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
            const objects = rows.map(row => {
              const obj = {};
              headers.forEach((header, idx) => {
                obj[header] = row[idx];
              });
              return obj;
            });
            
            processData(objects, headers);
            setParsing(false);
          } catch (error) {
            setErrors([`Excel parsing error: ${error.message}`]);
            setParsing(false);
          }
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        setErrors(['Unsupported file type. Please upload CSV or Excel (.xlsx, .xls)']);
        setParsing(false);
        setFile(null);
      }
    } catch (error) {
      setErrors([`File processing error: ${error.message}`]);
      setParsing(false);
    }
  };

  const processData = (data, headers) => {
    const detectedMapping = detectMapping(headers);
    setMapping(detectedMapping);
    
    // Transform records using mapping
    const transformed = data.map((row, idx) => {
      const record = {};
      for (const [field, columnName] of Object.entries(detectedMapping)) {
        record[field] = row[columnName];
      }
      return record;
    });
    
    // Validate all records
    const allErrors = [];
    transformed.forEach((record, idx) => {
      const recordErrors = validateRecord(record, idx + 2); // +2 for header row and 0-index
      allErrors.push(...recordErrors);
    });
    
    setRecords(transformed);
    setErrors(allErrors);
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      alert('Please fix validation errors before importing');
      return;
    }
    
    if (records.length === 0) {
      alert('No valid records to import');
      return;
    }
    
    if (!window.confirm(`Import ${records.length} record(s) to the database?\n\nThey will be published immediately.`)) {
      return;
    }
    
    setImporting(true);
    setImportResult(null);
    
    try {
      const responses = [];
      for (const record of records) {
        // Prepare payload
        const payload = {
          disease: record.disease?.trim() || '',
          state: record.state?.trim() || '',
          district: record.district?.trim() || null,
          locality: record.locality?.trim() || null,
          reported_cases: record.reported_cases ? Number(record.reported_cases) : null,
          active_cases: record.active_cases ? Number(record.active_cases) : null,
          recoveries: record.recoveries ? Number(record.recoveries) : null,
          deaths: record.deaths ? Number(record.deaths) : null,
          risk_level: record.risk_level || 'Medium',
          reporting_start: record.reporting_start || null,
          reporting_end: record.reporting_end || null,
          source_name: record.source_name?.trim() || 'Dataset import',
          source_reference: record.source_reference?.trim() || null,
          description: record.description?.trim() || '',
          latitude: record.latitude ? parseFloat(record.latitude) : null,
          longitude: record.longitude ? parseFloat(record.longitude) : null,
        };
        
        const res = await fetch(`${API}/api/admin/case-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) {
          responses.push({ success: true, record: await res.json() });
        } else {
          const error = await res.json();
          responses.push({ success: false, error: error.detail || 'Unknown error', payload });
        }
      }
      
      const successful = responses.filter(r => r.success).length;
      const failed = responses.filter(r => !r.success).length;
      
      setImportResult({
        total: records.length,
        successful,
        failed,
        failures: responses.filter(r => !r.success),
      });
      
      if (successful > 0 && onImportComplete) {
        onImportComplete();
      }
      
      // Clear on success
      if (failed === 0) {
        setTimeout(() => {
          setFile(null);
          setRecords([]);
          setMapping({});
          setErrors([]);
        }, 3000);
      }
    } catch (error) {
      setErrors([`Import error: ${error.message}`]);
    } finally {
      setImporting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setRecords([]);
    setMapping({});
    setErrors([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!file && (
        <div
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            id="dataset-upload"
          />
          <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Upload Dataset</h3>
          <p className="mb-4 text-sm text-slate-600">
            Drag and drop a CSV or Excel file here, or click to browse
          </p>
          <label
            htmlFor="dataset-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FileText className="h-4 w-4" />
            Choose File
          </label>
          <p className="mt-4 text-xs text-slate-500">Supported: CSV, XLSX, XLS (max 5MB)</p>
        </div>
      )}

      {/* Parsing State */}
      {parsing && (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-slate-700">Parsing file...</span>
        </div>
      )}

      {/* File Info & Preview */}
      {file && !parsing && (
        <div className="space-y-4">
          {/* File Details */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {records.length} row(s) • {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Column Mapping */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Detected Column Mapping
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(mapping).map(([field, column]) => (
                <div key={field} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span className="font-medium text-slate-700">{field}:</span>
                  <span className="text-slate-600">{column}</span>
                </div>
              ))}
            </div>
            {Object.keys(mapping).length === 0 && (
              <p className="text-sm text-amber-600">
                ⚠️ No columns mapped automatically. Check your column names.
              </p>
            )}
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h4 className="font-semibold text-rose-900">
                  {errors.length} Validation Error(s)
                </h4>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto text-sm text-rose-700">
                {errors.slice(0, 10).map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
                {errors.length > 10 && (
                  <div className="font-semibold">... and {errors.length - 10} more</div>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Preview (first 5 rows)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Disease</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">State</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Cases</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 5).map((record, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {record.disease || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{record.state || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {record.reported_cases || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{record.risk_level || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length > 5 && (
              <p className="mt-2 text-xs text-slate-500">
                Showing 5 of {records.length} records
              </p>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div
              className={`rounded-xl border p-4 ${
                importResult.failed === 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <h4
                  className={`font-semibold ${
                    importResult.failed === 0 ? 'text-emerald-900' : 'text-amber-900'
                  }`}
                >
                  Import Complete
                </h4>
              </div>
              <p
                className={`text-sm ${
                  importResult.failed === 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                Successfully imported {importResult.successful} of {importResult.total} record(s).
                {importResult.failed > 0 && ` ${importResult.failed} failed.`}
              </p>
            </div>
          )}

          {/* Import Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={importing || errors.length > 0 || records.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {records.length} Record(s)
                </>
              )}
            </button>
            <button
              onClick={clearFile}
              disabled={importing}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
