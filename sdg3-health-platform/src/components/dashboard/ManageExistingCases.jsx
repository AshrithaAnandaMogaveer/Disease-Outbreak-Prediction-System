/**
 * ManageExistingCases — Table showing published outbreak records with edit capability.
 * Displays key information and allows inline editing of existing records.
 */
import { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2, Search, RefreshCw, Trash2 } from 'lucide-react';

const API = 'http://localhost:8000';

export default function ManageExistingCases({ token, onUpdate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/admin/outbreak-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        setError('Failed to load records');
      }
    } catch (err) {
      setError('Error loading records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRecords();
  }, [token]);

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditForm({
      disease: record.disease || '',
      state: record.state || '',
      district: record.district || '',
      locality: record.locality || '',
      reported_cases: record.reported_cases || '',
      active_cases: record.active_cases || '',
      recoveries: record.recoveries || '',
      deaths: record.deaths || '',
      risk_level: record.risk_level || 'Medium',
      source_name: record.source_name || 'Admin verified',
      source_reference: record.source_reference || '',
      description: record.description || '',
      latitude: record.latitude || '',
      longitude: record.longitude || '',
      reporting_start: record.reporting_start ? record.reporting_start.split('T')[0] : '',
      reporting_end: record.reporting_end ? record.reporting_end.split('T')[0] : '',
    });
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate required fields
    if (!editForm.disease || !editForm.disease.trim()) {
      setError('Disease name is required');
      setSaving(false);
      return;
    }
    if (!editForm.state || !editForm.state.trim()) {
      setError('State is required');
      setSaving(false);
      return;
    }
    if (!editForm.description || editForm.description.trim().length < 10) {
      setError('Description is required (minimum 10 characters)');
      setSaving(false);
      return;
    }
    if (!editForm.source_name || !editForm.source_name.trim()) {
      setError('Source name is required');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        disease: editForm.disease.trim(),
        state: editForm.state.trim(),
        district: editForm.district?.trim() || null,
        locality: editForm.locality?.trim() || null,
        reported_cases: editForm.reported_cases ? Number(editForm.reported_cases) : null,
        active_cases: editForm.active_cases ? Number(editForm.active_cases) : null,
        recoveries: editForm.recoveries ? Number(editForm.recoveries) : null,
        deaths: editForm.deaths ? Number(editForm.deaths) : null,
        latitude: editForm.latitude ? Number(editForm.latitude) : null,
        longitude: editForm.longitude ? Number(editForm.longitude) : null,
        risk_level: editForm.risk_level || 'Medium',
        source_name: editForm.source_name?.trim() || 'Admin verified',
        source_reference: editForm.source_reference?.trim() || null,
        description: editForm.description.trim(),
        reporting_start: editForm.reporting_start ? `${editForm.reporting_start}T00:00:00` : null,
        reporting_end: editForm.reporting_end ? `${editForm.reporting_end}T00:00:00` : null,
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${API}/api/admin/outbreak-records/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess('Record updated successfully');
        setEditingId(null);
        setEditForm({});
        await loadRecords();
        if (onUpdate) onUpdate();
      } else {
        const data = await res.json();
        console.error('Update failed:', data);
        setError(data.detail || JSON.stringify(data) || 'Failed to update record');
      }
    } catch (err) {
      setError('Error updating record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId, recordName) => {
    if (!window.confirm(`Are you sure you want to delete "${recordName}"? This will remove it from all user views and cannot be undone.`)) {
      return;
    }

    setDeleting(recordId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/admin/outbreak-records/${recordId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setSuccess('Record deleted successfully');
        await loadRecords();
        if (onUpdate) onUpdate();
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to delete record');
      }
    } catch (err) {
      setError('Error deleting record: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.disease.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.district && r.district.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Manage Existing Cases</h3>
        <button
          onClick={loadRecords}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by disease, state, or district..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Loading State */}
      {loading && records.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-slate-700">Loading records...</span>
        </div>
      )}

      {/* Table */}
      {!loading && filteredRecords.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Disease
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Location
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Cases
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Active
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Recovered
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Deaths
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">
                  Risk
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {editingId === record.id ? (
                    // Edit Mode
                    <td colSpan={8} className="p-4">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Disease *
                            </label>
                            <input
                              type="text"
                              value={editForm.disease}
                              onChange={(e) =>
                                setEditForm({ ...editForm, disease: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              State *
                            </label>
                            <input
                              type="text"
                              value={editForm.state}
                              onChange={(e) =>
                                setEditForm({ ...editForm, state: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              District
                            </label>
                            <input
                              type="text"
                              value={editForm.district}
                              onChange={(e) =>
                                setEditForm({ ...editForm, district: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Locality
                            </label>
                            <input
                              type="text"
                              value={editForm.locality}
                              onChange={(e) =>
                                setEditForm({ ...editForm, locality: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Reported Cases
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.reported_cases}
                              onChange={(e) =>
                                setEditForm({ ...editForm, reported_cases: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Active Cases
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.active_cases}
                              onChange={(e) =>
                                setEditForm({ ...editForm, active_cases: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Recoveries
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.recoveries}
                              onChange={(e) =>
                                setEditForm({ ...editForm, recoveries: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Deaths
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.deaths}
                              onChange={(e) =>
                                setEditForm({ ...editForm, deaths: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Risk Level
                            </label>
                            <select
                              value={editForm.risk_level}
                              onChange={(e) =>
                                setEditForm({ ...editForm, risk_level: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option>Low</option>
                              <option>Medium</option>
                              <option>High</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Source Name
                            </label>
                            <input
                              type="text"
                              value={editForm.source_name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, source_name: e.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Description *
                          </label>
                          <textarea
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            rows={3}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm resize-none"
                            required
                            minLength={10}
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Minimum 10 characters required
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    // View Mode
                    <>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {record.disease}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {record.district ? `${record.district}, ` : ''}
                        {record.state}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {record.reported_cases?.toLocaleString() || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {record.active_cases?.toLocaleString() || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {record.recoveries?.toLocaleString() || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {record.deaths?.toLocaleString() || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                            record.risk_level === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : record.risk_level === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {record.risk_level || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(record)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record.id, `${record.disease} in ${record.state}`)}
                            disabled={deleting === record.id}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deleting === record.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRecords.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            {searchTerm ? 'No records match your search.' : 'No published outbreak records yet.'}
          </p>
        </div>
      )}

      {/* Record Count */}
      {filteredRecords.length > 0 && (
        <p className="text-xs text-slate-500">
          Showing {filteredRecords.length} of {records.length} record(s)
        </p>
      )}
    </div>
  );
}
