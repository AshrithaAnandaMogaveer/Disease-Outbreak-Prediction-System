# Admin Panel Edit & Delete Fixes

## Issues Fixed

### 1. ✅ Edit Functionality Fixed
**Problem**: When admin clicked "Save" after editing a record, it showed "Failed to update record"

**Root Cause**: The frontend was using `POST /api/admin/case-data` which creates or updates based on disease+state+district+locality match. This caused issues when editing existing records because it tried to match by location instead of by record ID.

**Solution**: 
- Added new backend endpoint: `PUT /api/admin/outbreak-records/{record_id}`
- Updated frontend to use the correct UPDATE endpoint with record ID
- Now updates the specific record by its unique ID

### 2. ✅ Delete Functionality Added
**Problem**: No delete option was available for outbreak records

**Solution**:
- Added backend endpoint: `DELETE /api/admin/outbreak-records/{record_id}`
- Added delete button in the ManageExistingCases table
- Includes confirmation dialog before deletion
- Shows loading state during deletion

### 3. ✅ Cascading Deletion
**Feature**: When admin deletes a record, it's removed from all user views automatically

**How it works**:
- Record is deleted from `published_outbreak_records` table
- Since users query this table to view outbreaks, deletion immediately removes it from:
  - User dashboard
  - Heatmap
  - Outbreak list
  - Search results
  - All other user-facing views

## Changes Made

### Backend Changes

**File**: `backend/app/routes/admin_routes.py`

#### 1. Added UPDATE Endpoint
```python
@router.put("/outbreak-records/{record_id}", response_model=PublishedOutbreakResponse)
def update_outbreak_record(
    record_id: str,
    payload: PublishedOutbreakCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update an existing published outbreak record by ID."""
    record = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Update all fields
    record.disease = payload.disease
    record.state = payload.state
    # ... (all other fields)
    
    db.commit()
    return record
```

**Features**:
- Updates by record ID (not by location match)
- Updates all editable fields
- Tracks audit events
- Checks case count threshold for notifications
- Returns updated record

#### 2. Added DELETE Endpoint
```python
@router.delete("/outbreak-records/{record_id}")
def delete_outbreak_record(
    record_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a published outbreak record by ID."""
    record = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    # Log audit event
    _add_audit_event(db, None, record.id, current_user.id, "deleted", ...)
    
    db.delete(record)
    db.commit()
    
    return {"success": True, "message": "Record deleted"}
```

**Features**:
- Deletes by record ID
- Logs audit event before deletion
- Returns success message
- Removes from all user views automatically

### Frontend Changes

**File**: `sdg3-health-platform/src/components/dashboard/ManageExistingCases.jsx`

#### 1. Fixed Edit/Save Logic
```javascript
const handleSave = async () => {
  const payload = {
    disease: editForm.disease.trim(),
    state: editForm.state.trim(),
    // ... all fields
  };

  const res = await fetch(`${API}/api/admin/outbreak-records/${editingId}`, {
    method: 'PUT',  // Changed from POST
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    setSuccess('Record updated successfully');
    await loadRecords();
  }
};
```

**Changes**:
- Uses `PUT` method instead of `POST`
- Targets specific record by ID: `/outbreak-records/{editingId}`
- Properly constructs payload with all fields
- Shows success/error messages

#### 2. Added Delete Functionality
```javascript
const handleDelete = async (recordId, recordName) => {
  if (!window.confirm(`Are you sure you want to delete "${recordName}"?`)) {
    return;
  }

  setDeleting(recordId);

  const res = await fetch(`${API}/api/admin/outbreak-records/${recordId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    setSuccess('Record deleted successfully');
    await loadRecords();
  }
};
```

**Features**:
- Confirmation dialog before deletion
- Shows loading state during deletion
- Refreshes table after deletion
- Error handling

#### 3. Updated UI
```javascript
<td className="px-4 py-3 text-center">
  <div className="flex items-center justify-center gap-2">
    <button onClick={() => startEdit(record)}>
      <Edit2 className="h-3.5 w-3.5" />
      Edit
    </button>
    <button 
      onClick={() => handleDelete(record.id, `${record.disease} in ${record.state}`)}
      disabled={deleting === record.id}
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
```

**Features**:
- Delete button next to Edit button
- Shows spinner while deleting
- Disabled state during deletion
- Red color for danger action

## API Endpoints Summary

### Update Outbreak Record
```
PUT /api/admin/outbreak-records/{record_id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "disease": "string",
  "state": "string",
  "district": "string | null",
  "locality": "string | null",
  "reported_cases": "number | null",
  "active_cases": "number | null",
  "recoveries": "number | null",
  "deaths": "number | null",
  "risk_level": "string",
  "source_name": "string",
  "source_reference": "string | null",
  "description": "string",
  "latitude": "number | null",
  "longitude": "number | null",
  "reporting_start": "string | null",
  "reporting_end": "string | null"
}

Response: 200 OK
{
  "id": "string",
  "disease": "string",
  "state": "string",
  // ... all record fields
  "updated_at": "datetime"
}
```

### Delete Outbreak Record
```
DELETE /api/admin/outbreak-records/{record_id}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Record deleted: Dengue in Maharashtra",
  "deleted_id": "record_id"
}
```

## How It Works

### Edit Flow
1. Admin clicks **Edit** button on a record
2. Form opens with all fields pre-filled
3. Admin modifies fields
4. Admin clicks **Save Changes**
5. Frontend sends `PUT` request with record ID
6. Backend updates the specific record by ID
7. Success message shown, table refreshes
8. Changes visible immediately to all users

### Delete Flow
1. Admin clicks **Delete** button on a record
2. Confirmation dialog appears
3. Admin confirms deletion
4. Frontend sends `DELETE` request with record ID
5. Backend logs audit event
6. Backend deletes record from database
7. Success message shown, table refreshes
8. Record removed from all user views immediately

## User Impact

### When Record is Edited
- ✅ Changes appear immediately in user dashboard
- ✅ Heatmap updates with new data
- ✅ Search results reflect new values
- ✅ Predictions use updated case counts
- ✅ Notifications triggered if cases exceed thresholds

### When Record is Deleted
- ✅ Removed from user dashboard
- ✅ Removed from heatmap
- ✅ Removed from search results
- ✅ Not included in predictions
- ✅ Historical data preserved in audit log
- ❌ Users cannot see deleted record anymore

## Security & Audit

### Permissions
- ✅ Both endpoints require admin authentication
- ✅ Regular users cannot edit or delete
- ✅ Admin token validated on each request

### Audit Trail
- ✅ All updates logged with timestamp
- ✅ All deletions logged before removal
- ✅ Actor (admin) ID recorded
- ✅ Action details preserved
- ✅ Original record info saved in audit

### Data Integrity
- ✅ Validation on all fields
- ✅ Required fields enforced
- ✅ Number fields type-checked
- ✅ Null values handled correctly
- ✅ Database constraints respected

## Testing

### Test Edit Functionality
1. Login as admin (username: `SDG3_ADMIN`, password: `SDG3_ADMIN_2026`)
2. Navigate to "Add New Cases" → "Manage Existing Cases"
3. Click **Edit** on any record
4. Modify some fields (e.g., change case count)
5. Click **Save Changes**
6. ✅ Should show "Record updated successfully"
7. ✅ Changes should persist after refresh
8. ✅ Verify changes visible in user view

### Test Delete Functionality
1. Login as admin
2. Navigate to "Add New Cases" → "Manage Existing Cases"
3. Click **Delete** on a test record
4. ✅ Confirmation dialog appears
5. Confirm deletion
6. ✅ Should show "Record deleted successfully"
7. ✅ Record removed from table
8. ✅ Verify record not visible in user view
9. ✅ Logout and login as user to confirm

### Test Error Handling
1. Edit with invalid data (e.g., negative cases)
2. ✅ Should show validation error
3. Try to delete non-existent record
4. ✅ Should show "Record not found"
5. Edit without auth token
6. ✅ Should show "Unauthorized"

## Database Schema

### published_outbreak_records Table
```sql
CREATE TABLE published_outbreak_records (
  id UUID PRIMARY KEY,
  disease VARCHAR NOT NULL,
  state VARCHAR NOT NULL,
  district VARCHAR,
  locality VARCHAR,
  reported_cases INTEGER,
  active_cases INTEGER,
  recoveries INTEGER,
  deaths INTEGER,
  risk_level VARCHAR,
  source_name VARCHAR,
  source_reference VARCHAR,
  description TEXT,
  latitude FLOAT,
  longitude FLOAT,
  reporting_start TIMESTAMP,
  reporting_end TIMESTAMP,
  publication_status VARCHAR,
  reviewer_id UUID,
  created_by_admin_id UUID,
  published_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### outbreak_audit_events Table
```sql
CREATE TABLE outbreak_audit_events (
  id UUID PRIMARY KEY,
  report_id UUID,  -- nullable
  published_record_id UUID,  -- nullable
  actor_user_id UUID NOT NULL,
  action VARCHAR NOT NULL,  -- 'updated', 'deleted', etc.
  details TEXT,
  created_at TIMESTAMP
);
```

## Rollback Plan

If issues occur:

1. **Backend rollback**: Revert `admin_routes.py` changes
2. **Frontend rollback**: Revert `ManageExistingCases.jsx` changes
3. **Database**: Check `outbreak_audit_events` for deleted records
4. **Restore data**: Use audit log to recreate deleted records if needed

## Future Enhancements

- [ ] Bulk delete (select multiple records)
- [ ] Soft delete (mark as deleted instead of removing)
- [ ] Restore deleted records
- [ ] Version history (track all edits)
- [ ] Compare versions (before/after view)
- [ ] Export audit log
- [ ] Email notification on deletion

---
**Status**: ✅ Implemented and Tested  
**Version**: 1.0  
**Date**: 2024-03-21  
**Affects**: Admin users only  
**User Impact**: Records deleted by admin are immediately removed from all user views
