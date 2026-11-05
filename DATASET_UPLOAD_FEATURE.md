# Dataset Upload Feature for Outbreak Reporting

## Overview
Users can now upload CSV or JSON datasets when reporting possible outbreaks. The system automatically parses the file and fills in the form fields, making it easy to submit structured data to admins for review.

## Features

### 1. **File Upload Support**
- **Supported Formats**: CSV, Excel (.xlsx, .xls), JSON
- **Location**: Report Outbreak Modal
- **Auto-fill**: Automatically populates form fields from uploaded data
- **Validation**: Parses and validates file structure before filling
- **Excel Date Support**: Automatically converts Excel date formats to standard dates

### 2. **Field Mapping**

The system intelligently maps common column/field names to form fields:

#### CSV Column Names (Case-insensitive)
| CSV Column | Maps To | Description |
|------------|---------|-------------|
| `disease`, `disease_name`, `disease name` | Disease Name | Name of the disease |
| `state` | State | Indian state |
| `district`, `city` | District/City | District or city name |
| `locality`, `area`, `location` | Locality/Area | Neighborhood or village |
| `date`, `observation_date`, `observation date` | Observation Date | When the outbreak was observed |
| `cases`, `case_count`, `case count`, `reported_cases`, `count` | Reported Cases | Number of cases |
| `description`, `details`, `observations` | Description | Detailed description |
| `source`, `reference`, `source_reference` | Source/Reference | Source information |

#### JSON Field Names (Case-sensitive and case-insensitive variants supported)
```json
{
  "disease_name": "string",       // or "disease", "Disease"
  "state": "string",              // or "State"
  "district": "string",           // or "city", "District", "City"
  "locality": "string",           // or "area", "location", "Locality"
  "observation_date": "string",   // or "date", "Date"
  "reported_cases": "number",     // or "cases", "case_count", "Cases"
  "description": "string",        // or "details", "observations", "Description"
  "source_reference": "string"    // or "source", "reference", "Source"
}
```

## Sample Files

### Excel Example (`sample_outbreak_data.xlsx`)
Excel spreadsheet with columns:
| disease_name | state | district | locality | observation_date | reported_cases | description | source_reference |
|--------------|-------|----------|----------|------------------|----------------|-------------|------------------|
| Dengue | Maharashtra | Mumbai | Andheri | 2024-03-15 | 25 | Multiple fever cases... | Local Hospital Report |

**Features:**
- First row contains column headers
- Multiple records supported (only first row used for auto-fill)
- Excel date formats automatically converted
- Supports both .xlsx and .xls formats
- Can be opened and edited in Microsoft Excel, Google Sheets, LibreOffice Calc

### CSV Example (`sample_outbreak_data.csv`)
```csv
disease_name,state,district,locality,observation_date,reported_cases,description,source_reference
Dengue,Maharashtra,Mumbai,Andheri,2024-03-15,25,Multiple fever cases reported in the area with mosquito breeding sites identified,Local Hospital Report
Malaria,Kerala,Thiruvananthapuram,Kazhakootam,2024-03-20,12,Fever and chills observed in several patients,Community Health Center
```

**Features:**
- First row must be headers
- Multiple records supported (only first row is used for auto-fill)
- Comma-separated values
- Standard date format: YYYY-MM-DD

### JSON Example (`sample_outbreak_data.json`)
```json
{
  "disease_name": "Dengue",
  "state": "Maharashtra",
  "district": "Mumbai",
  "locality": "Andheri",
  "observation_date": "2024-03-15",
  "reported_cases": "25",
  "description": "Multiple fever cases reported in the area with mosquito breeding sites identified. Residents complaining of high fever, body ache, and rash.",
  "source_reference": "Local Hospital Report - Andheri Medical Center"
}
```

**Features:**
- Single outbreak record per file
- Flexible field names (case-insensitive)
- Supports nested structures (root level only)

## How It Works

### User Flow
1. User opens "Report Outbreak" modal
2. User clicks "Choose File" in the upload section
3. System parses the file (CSV or JSON)
4. Form fields are automatically populated with data from the file
5. User can review and edit the auto-filled data
6. User submits the report to admin for review

### Technical Flow
```
User Upload → File Parsing → Field Mapping → Form Auto-fill → Manual Review → Submit to Admin
```

### Error Handling
- **Invalid format**: Shows error message
- **Parse error**: Displays specific error details
- **Missing headers**: CSV requires headers in first row
- **Unsupported file**: Only CSV and JSON accepted

## UI Components

### Upload Section
- **Icon**: Upload icon for visual clarity
- **File display**: Shows uploaded filename with remove option
- **Format help**: Expandable section showing expected format examples
- **Error display**: Shows parsing errors inline

### Auto-filled Form
- All form fields remain editable after auto-fill
- User can modify any field before submission
- Required fields still enforce validation
- Original validation rules apply

## API Integration

The feature uses the existing backend endpoint:
```
POST /api/outbreaks/reports
```

**Payload** (same as manual entry):
```json
{
  "disease_name": "string",
  "state": "string",
  "district": "string | null",
  "locality": "string | null",
  "observation_date": "string | null",
  "reported_cases": "number | null",
  "description": "string",
  "source_reference": "string | null"
}
```

**Response**:
- Status: `201 Created`
- Body: Created outbreak report with `id`, `status: "pending"`, etc.

## Admin Review Workflow

1. **User submits** report (via manual entry or dataset upload)
2. **Report status** = "Pending"
3. **Admin receives** notification badge in sidebar
4. **Admin reviews** in "Hallucination Detection" section
5. **Admin decides**: Approve or Reject
6. **If approved**: Report appears in public feed
7. **If rejected**: Report archived, not published

## Benefits

### For Users
- **Speed**: Faster data entry with bulk uploads
- **Accuracy**: Reduces manual typing errors
- **Convenience**: Can prepare data offline and upload
- **Flexibility**: Can edit auto-filled data before submission

### For Admins
- **Structured Data**: Receives well-formatted information
- **Better Quality**: Dataset uploads often more complete
- **Source Tracking**: Source reference field helps verification
- **Efficiency**: Less time spent on data cleanup

## File Size & Limits
- **Max file size**: 5 MB (browser default)
- **CSV rows**: First data row used for auto-fill
- **JSON**: Single object parsed
- **Character limits**: Same as manual entry (e.g., description: 2000 chars)

## Security Considerations
- Files parsed client-side (browser)
- No file uploaded to server
- Only extracted text data sent via API
- Standard API authentication required
- All reports go through admin review

## Testing

### Test Cases
1. **Valid CSV upload** → Fields auto-filled correctly
2. **Valid JSON upload** → Fields auto-filled correctly
3. **Invalid format** → Error message displayed
4. **Missing required fields** → Validation errors on submit
5. **Edit after upload** → User can modify auto-filled data
6. **Remove file** → Clears filename, keeps filled data
7. **Multiple uploads** → Later upload overwrites previous data

### Test Data
Sample files provided:
- `sample_outbreak_data.xlsx` - Excel spreadsheet with outbreak data
- `sample_outbreak_data.csv` - Multi-row CSV example
- `sample_outbreak_data.json` - Single outbreak JSON example

## Future Enhancements
- ~~Excel (.xlsx) file support~~ ✅ **Implemented!**
- Bulk upload (multiple reports at once)
- File validation preview before auto-fill
- Template download feature
- Field mapping customization
- Data quality scoring
- Support for multiple sheets in Excel files

## Technical Stack
- **Frontend**: React, JavaScript FileReader API
- **Parsing**: 
  - CSV: Native text parsing
  - Excel: `xlsx` library (SheetJS)
  - JSON: Native JSON.parse()
- **UI**: Lucide icons, Tailwind CSS
- **Backend**: FastAPI (no changes needed)

## Troubleshooting

### File Won't Parse
- Check file format (must be .csv or .json)
- Verify CSV has header row
- Ensure JSON is valid (use JSON validator)
- Check for special characters in CSV

### Fields Not Auto-filling
- Verify column/field names match mapping table
- Check for typos in header names
- Ensure data is in first row (CSV)
- Try case variations (e.g., "State" vs "state")

### Upload Button Not Working
- Check file size (< 5MB)
- Verify file extension (.csv or .json)
- Try clearing cache and reloading
- Check browser console for errors

## Support
For issues or questions about the dataset upload feature, contact the development team or refer to the main project documentation.

---
**Last Updated**: 2024-03-21  
**Feature Status**: ✅ Active  
**Version**: 1.0
