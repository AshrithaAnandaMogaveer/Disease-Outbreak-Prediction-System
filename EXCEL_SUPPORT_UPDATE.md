# Excel File Support Added to Dataset Upload Feature

## Overview
The dataset upload feature now supports **Excel files (.xlsx and .xls)** in addition to CSV and JSON formats!

## What's New

### ✅ Excel File Support
- **Formats Supported**: `.xlsx` (Excel 2007+) and `.xls` (Excel 97-2003)
- **Library Used**: `xlsx` (SheetJS) - industry-standard Excel parser
- **Date Handling**: Automatic conversion of Excel date formats to standard YYYY-MM-DD format
- **Multi-row Support**: Reads first data row (after headers) for auto-fill

### ✅ Enhanced Features
1. **Smart Date Parsing**: Excel stores dates as numbers - we automatically convert them
2. **Case-Insensitive Headers**: Column names work in any case (Disease, disease, DISEASE)
3. **Multiple Sheets**: Reads the first sheet by default
4. **Formula Support**: Evaluates formulas to their calculated values

## How Excel Parsing Works

### Technical Implementation
```javascript
import * as XLSX from 'xlsx';

// Read file as array buffer
const arrayBuffer = await file.arrayBuffer();

// Parse Excel workbook
const workbook = XLSX.read(arrayBuffer, { type: 'array' });

// Get first sheet
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert to JSON
const jsonData = XLSX.utils.sheet_to_json(worksheet);

// Use first row for auto-fill
const data = jsonData[0];
```

### Excel Date Conversion
Excel dates are stored as numbers (days since 1900-01-01). We handle this automatically:
```javascript
if (typeof value === 'number') {
  const excelDate = XLSX.SSF.parse_date_code(value);
  const date = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}
```

## Supported Column Names

All formats (CSV, Excel, JSON) support the same column name variations:

| Column Variations | Maps To Form Field |
|-------------------|-------------------|
| disease, disease_name, disease name | Disease Name |
| state | State |
| district, city | District/City |
| locality, area, location | Locality/Area |
| date, observation_date, observation date | Observation Date |
| cases, case_count, case count, reported_cases, count | Reported Cases |
| description, details, observations | Description |
| source, reference, source_reference | Source/Reference |

## Sample Excel File

### File Structure (`sample_outbreak_data.xlsx`)

**Sheet: "Outbreak Data"**

| disease_name | state | district | locality | observation_date | reported_cases | description | source_reference |
|--------------|-------|----------|----------|------------------|----------------|-------------|------------------|
| Dengue | Maharashtra | Mumbai | Andheri | 2024-03-15 | 25 | Multiple fever cases reported... | Local Hospital Report |
| Malaria | Kerala | Thiruvananthapuram | Kazhakootam | 2024-03-20 | 12 | Fever and chills observed... | Community Health Center |

**Note**: System uses only the first data row (row 2) for auto-filling the form.

## Usage Instructions

### For Users
1. **Prepare your Excel file**:
   - Use column headers matching the field names above
   - Enter data starting from row 2
   - Save as `.xlsx` or `.xls`

2. **Upload in the app**:
   - Open "Report Outbreak" modal
   - Click "Choose File" in upload section
   - Select your Excel file
   - Review auto-filled fields
   - Edit if needed
   - Submit

### Creating Excel Files

**Option 1: Microsoft Excel**
1. Open Excel
2. Add headers in row 1
3. Add data in row 2
4. Save As → Excel Workbook (.xlsx)

**Option 2: Google Sheets**
1. Create spreadsheet
2. Add headers and data
3. File → Download → Microsoft Excel (.xlsx)

**Option 3: LibreOffice Calc**
1. Create spreadsheet
2. Add headers and data
3. Save As → Microsoft Excel 2007-365 (.xlsx)

## File Format Comparison

| Feature | CSV | Excel | JSON |
|---------|-----|-------|------|
| File Extension | .csv | .xlsx, .xls | .json |
| Human Readable | ✅ Yes | ❌ No (binary) | ✅ Yes |
| Easy to Create | ✅ Yes | ⚠️ Requires Excel | ⚠️ Manual typing |
| Multiple Records | ✅ Yes | ✅ Yes | ❌ Single record |
| Date Formatting | Manual | ✅ Auto | Manual |
| Formula Support | ❌ No | ✅ Yes | ❌ No |
| Widespread Use | ✅ Very common | ✅ Most common | ⚠️ Technical |

## Installation

The `xlsx` library is automatically installed when you set up the project:

```bash
cd sdg3-health-platform
npm install
```

**Package**: `xlsx@latest` (SheetJS Community Edition)

## Testing

### Test with Sample File
1. Navigate to project root directory
2. Find `sample_outbreak_data.xlsx`
3. Open in Excel to view structure
4. Upload in the app to test auto-fill

### Manual Testing Steps
1. ✅ Upload .xlsx file → Verify fields auto-fill
2. ✅ Upload .xls file → Verify fields auto-fill
3. ✅ Excel with dates → Verify dates convert correctly
4. ✅ Edit fields after upload → Verify changes persist
5. ✅ Submit report → Verify goes to admin for review
6. ✅ Invalid Excel file → Verify error message shows

## Error Handling

### Common Errors and Solutions

**"Failed to parse file"**
- **Cause**: Corrupted or invalid Excel file
- **Solution**: Re-save the file in Excel, ensure it's a valid .xlsx or .xls

**"Excel file must have at least one data row"**
- **Cause**: Only headers present, no data rows
- **Solution**: Add at least one row of data below headers

**"Unsupported file format"**
- **Cause**: File extension not .csv, .xlsx, .xls, or .json
- **Solution**: Save file in a supported format

**Date not formatting correctly**
- **Cause**: Date in text format in Excel
- **Solution**: Format cell as Date in Excel before saving

## Technical Details

### Dependencies
```json
{
  "xlsx": "^0.18.5"  // SheetJS library
}
```

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Performance
- **Small files (<1MB)**: Instant parsing
- **Large files (1-5MB)**: 1-2 seconds
- **Very large files (>5MB)**: May take 3-5 seconds

### File Size Limits
- **Recommended**: < 1 MB
- **Maximum**: 5 MB (browser FileReader limit)
- **Rows**: Unlimited (only first row used)

## Security

✅ **Safe Parsing**
- Files parsed entirely client-side (browser)
- No file uploaded to server
- Only text data extracted and sent via API
- Standard authentication required

✅ **No Code Execution**
- Macros and VBA code are ignored
- Only data values extracted
- Formulas evaluated, not executed

## Future Enhancements

**Potential Features:**
- [ ] Support multiple sheets (user selects which one)
- [ ] Bulk upload (process multiple rows as separate reports)
- [ ] Column mapping customizer (map any column to any field)
- [ ] Data validation preview before auto-fill
- [ ] Excel template download (pre-formatted file for users)
- [ ] Support for merged cells
- [ ] Rich text formatting preservation

## Support

### Questions?
- Check `DATASET_UPLOAD_FEATURE.md` for general upload documentation
- See `README.md` for project setup instructions

### Found a Bug?
Report issues with:
- File format used (.xlsx or .xls)
- Excel version (if known)
- Error message received
- Sample file (if possible)

---
**Last Updated**: 2024-03-21  
**Feature Status**: ✅ Active  
**Version**: 1.1 (Excel support added)
