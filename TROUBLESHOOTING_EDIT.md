# Troubleshooting Edit Functionality - 422 Error

## Current Status
- ✅ Backend restarted: http://localhost:8000
- ✅ Frontend running: http://localhost:5174
- ✅ PUT endpoint exists: `/api/admin/outbreak-records/{record_id}`
- ✅ Description field added to form
- ✅ Console logging added

## Issue
Getting 422 (Unprocessable Entity) when trying to update a record.

## What 422 Means
The request reached the server but failed Pydantic validation. This means one or more fields don't meet the schema requirements.

## How to Debug

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click **Edit** on a record
4. Make a change
5. Click **Save Changes**
6. Look for these logs:

**Expected logs:**
```javascript
Sending payload: {
  "disease": "...",
  "state": "...",
  "description": "...",
  // ... all fields
}

Update failed: {
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "error message",
      "type": "value_error"
    }
  ]
}
```

The "loc" field tells you exactly which field is failing validation.
The "msg" field tells you why it's failing.

### Step 2: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to save again
4. Click on the failing request (should be red)
5. Look at:
   - **Headers** → Request URL (should end with `/outbreak-records/{uuid}`)
   - **Payload** → What data was sent
   - **Response** → The error details

### Step 3: Check Backend Logs
Open the backend terminal and look for error messages when you click Save.

## Common Validation Errors

### 1. Missing Required Fields
**Error**: `field required`
**Solution**: Ensure these fields are provided:
- `disease` (min 2 chars)
- `state` (min 2 chars)
- `description` (min 10 chars)
- `source_name`

### 2. Description Too Short
**Error**: `String should have at least 10 characters`
**Solution**: Description must be 10+ characters

### 3. Invalid Number Format
**Error**: `Input should be a valid number`
**Solution**: Ensure numeric fields are numbers, not strings

### 4. Latitude/Longitude Mismatch
**Error**: `Latitude and longitude must be provided together`
**Solution**: Either provide both or neither

### 5. Coordinates Out of Bounds
**Error**: `Latitude must be within India bounds`
**Solution**: 
- Latitude: 6°N to 38°N
- Longitude: 68°E to 98°E

## Expected Payload Structure

```json
{
  "disease": "string (required, min 2 chars)",
  "state": "string (required, min 2 chars)",
  "district": "string | null (optional)",
  "locality": "string | null (optional)",
  "reported_cases": "number | null (optional, >= 0)",
  "active_cases": "number | null (optional, >= 0)",
  "recoveries": "number | null (optional, >= 0)",
  "deaths": "number | null (optional, >= 0)",
  "risk_level": "string | null (optional)",
  "source_name": "string (required)",
  "source_reference": "string | null (optional)",
  "description": "string (required, min 10 chars)",
  "latitude": "number | null (optional)",
  "longitude": "number | null (optional)",
  "reporting_start": "datetime | null (optional)",
  "reporting_end": "datetime | null (optional)"
}
```

## Testing Steps

### Test 1: Simple Edit
1. Edit a record
2. Change only the "Reported Cases" from 500 to 600
3. Don't touch any other fields
4. Save
5. **Expected**: Success
6. **If fails**: Check which field validation failed

### Test 2: Description Edit
1. Edit a record
2. Clear the description field
3. Type exactly 9 characters
4. Save
5. **Expected**: Client-side validation error
6. Add one more character (total 10)
7. Save
8. **Expected**: Success

### Test 3: New Record Fields
1. Edit a record
2. Fill in ALL fields including:
   - Source Name
   - Description (10+ chars)
3. Save
4. **Expected**: Success

## Quick Fixes to Try

### Fix 1: Ensure Description is Set
The edit form should show a textarea for description. If it's missing:
1. Refresh the page (Ctrl+R or Cmd+R)
2. Frontend should have hot-reloaded with the new changes

### Fix 2: Check for Empty Strings
Empty strings ("") might be treated differently than null. The code now uses optional chaining (`?.`) to handle this.

### Fix 3: Clear Browser Cache
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

### Fix 4: Verify Token is Valid
1. Open DevTools → Application → Local Storage
2. Find `token`
3. If expired, logout and login again

## Manual API Test

You can test the endpoint directly using curl or Postman:

```bash
# Get your admin token from browser localStorage
# Then test:

curl -X PUT "http://localhost:8000/api/admin/outbreak-records/{RECORD_ID}" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @test_update_payload.json
```

## What to Report

If still failing after these steps, please provide:

1. **Browser console logs**:
   - The "Sending payload:" log
   - The "Update failed:" log

2. **Network tab details**:
   - Request payload (from Payload tab)
   - Response body (from Response tab)

3. **Backend logs**:
   - Any error messages when Save is clicked

4. **Which field is empty**:
   - Is Description field visible in the form?
   - Is Source Name field visible?

## Sample Valid Payload

See `test_update_payload.json` for a complete valid payload structure.

## Code Changes Made

### Frontend: `ManageExistingCases.jsx`
1. ✅ Added `description` textarea field
2. ✅ Added `source_name` text field  
3. ✅ Added validation before API call
4. ✅ Added console.log for debugging
5. ✅ Added error detail logging
6. ✅ Used optional chaining for safety

### Backend: `admin_routes.py`
1. ✅ Added `PUT /outbreak-records/{record_id}` endpoint
2. ✅ Updates record by ID
3. ✅ Uses `PublishedOutbreakCreate` schema for validation

## Next Steps

1. **Try editing again** with the latest code
2. **Check browser console** for the exact error
3. **Share the error details** if still failing

The console logs will tell us exactly which field is failing validation and why.
