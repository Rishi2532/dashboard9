# Chatbot Historical Data Export - Complete Prompt Guide

## 📅 Date Format Support

The chatbot now supports **all** these date formats for historical data downloads:

### Natural Language Dates (NEW! ✨)
- **"24th november to 27th november"** ← Works without year!
- **"1st january to 31st december"**
- **"5th june to 10th june"**

### Month Names with Year
- **"24th november 2024 to 27th november 2024"**
- **"1 January 2024 to 31 December 2024"**
- **"2nd june 2024 to 9th june 2024"**

### Numeric Formats
- **"24/11/2024 to 27/11/2024"** (DD/MM/YYYY)
- **"24-11-2024 to 27-11-2024"** (DD-MM-YYYY)
- **"2024-11-24 to 2024-11-27"** (ISO format)

### Relative Dates
- **"today"** - Downloads data for today
- **"yesterday"** - Downloads yesterday's data
- **"last week"** - Downloads last 7 days
- **"last month"** - Downloads last 30 days

---

## 💧 LPCD Dashboard Historical Data

### Basic Export
```
Download LPCD data from 24th november to 27th november
Export LPCD historical data from 1st january to 31st december
Give me LPCD data from 2024-11-24 to 2024-11-27
Download water scheme data from last month
Export LPCD data from yesterday to today
```

### With Region Filter
```
Download LPCD data for Nagpur from 24th november to 27th november
Export LPCD data for Pune region from 1st january to 31st december
Give me LPCD historical data for Amravati from last week
Download LPCD data for Mumbai region from 1/11/2024 to 30/11/2024
```

### With Excel Export
```
Export LPCD data to excel from 24th november to 27th november
Download LPCD excel report from 1st january to 31st december
Give me LPCD data in excel from last month for Nagpur region
```

---

## 🧪 Chlorine Dashboard Historical Data

### Basic Export
```
Download chlorine data from 24th november to 27th november
Export chlorine historical data from 1st january to 31st december
Give me chlorine data from 2024-11-24 to 2024-11-27
Download chlorine data from last week
```

### With Region Filter
```
Download chlorine data for Nagpur from 24th november to 27th november
Export chlorine data for Pune from 1/11/2024 to 30/11/2024
Give me chlorine historical data for Nashik from last month
```

### With Excel Export
```
Export chlorine data to excel from 24th november to 27th november
Download chlorine excel from 1st january to 31st december
Give me chlorine data in excel from 1-11-2024 to 30-11-2024
```

---

## 📏 Pressure Dashboard Historical Data

### Basic Export
```
Download pressure data from 24th november to 27th november
Export pressure historical data from 1st january to 31st december
Give me pressure data from 2024-11-24 to 2024-11-27
Download pressure data from last month
```

### With Region Filter
```
Download pressure data for Nagpur from 24th november to 27th november
Export pressure data for Konkan from 1/11/2024 to 30/11/2024
Give me pressure historical data for Chhatrapati Sambhajinagar from last week
```

### With Excel Export
```
Export pressure data to excel from 24th november to 27th november
Download pressure excel report from 1st january to 31st december
Give me pressure data in excel from yesterday to today
```

---

## 🌊 Water Consumption Historical Data

### Basic Export
```
Download water consumption data from 24th november to 27th november
Export water scheme data from 1st january to 31st december
Give me water data from last month
```

### With Region Filter
```
Download water consumption for Nagpur from 24th november to 27th november
Export water scheme data for Pune from 1/11/2024 to 30/11/2024
```

---

## 📊 Current Dashboard Data (Without Historical)

### LPCD Data
```
Download LPCD data
Export LPCD to excel
Give me current LPCD data
Export LPCD data for Nagpur
```

### Chlorine Data
```
Download chlorine data
Export chlorine to excel
Give me current chlorine data
Export chlorine data for Pune
```

### Pressure Data
```
Download pressure data
Export pressure to excel
Give me current pressure data
Export pressure data for Nashik
```

---

## 🎯 Advanced Prompts

### Multiple Dashboards
The chatbot will automatically detect which dashboard you're on and download the correct data type:

**On LPCD Dashboard:**
```
Download historical data from 24th november to 27th november
→ Downloads LPCD historical data
```

**On Chlorine Dashboard:**
```
Download historical data from 24th november to 27th november
→ Downloads Chlorine historical data
```

**On Pressure Dashboard:**
```
Download historical data from 24th november to 27th november
→ Downloads Pressure historical data
```

### Smart Date Recognition
```
Download data from 24 november to 27 november
→ Automatically adds current/last year

Download data from nov 24 to nov 27
→ Recognizes abbreviated month names

Download data from 24/11 to 27/11
→ Adds year automatically
```

---

## 🌍 Supported Regions

All region filters work with historical data:

- **Amravati**
- **Nagpur**
- **Nashik** (or "Nasik")
- **Pune** (or "Poona")
- **Konkan**
- **Mumbai** (or "Bombay")
- **Chhatrapati Sambhajinagar** (or "Sambhajinagar", "Aurangabad")

---

## 📝 Example Combinations

```
Download chlorine data for Nagpur from 24th november to 27th november
Export LPCD historical data for Pune from 1st january to 31st december
Give me pressure data for Mumbai from last week
Download water consumption for Nashik from 1/11/2024 to 30/11/2024
Export chlorine data to excel for Amravati from yesterday to today
Download LPCD data for Konkan from 2024-11-01 to 2024-11-30
Give me pressure historical data for Chhatrapati Sambhajinagar from last month
```

---

## ✅ What the Chatbot Does Automatically

1. **Detects Dashboard Type** - Knows which data to export based on current page
2. **Parses Date Formats** - Handles natural language, numeric, and ISO formats
3. **Intelligent Year Detection** - Adds year if missing (uses current or last year)
4. **Region Filtering** - Applies region filter if specified
5. **Excel Export** - Generates .xlsx file with proper formatting
6. **Fallback Mechanism** - If API fails, tries UI-based export
7. **Download Notification** - Shows confirmation after successful download

---

## 🚀 Quick Reference

| What You Want | Example Prompt |
|---------------|----------------|
| **LPCD Data** | `Download LPCD data from 24th november to 27th november` |
| **Chlorine Data** | `Export chlorine data from 1st january to 31st december` |
| **Pressure Data** | `Give me pressure data from last month` |
| **With Region** | `Download chlorine data for Nagpur from 24th november to 27th november` |
| **Current Data** | `Export LPCD to excel` |
| **Relative Dates** | `Download pressure data from yesterday to today` |

---

## 🎓 Tips for Best Results

1. **Always specify date range** for historical data (from X to Y)
2. **Mention dashboard type** (LPCD, chlorine, pressure) for clarity
3. **Use region names** exactly as shown above
4. **Include keywords** like "download", "export", "excel", "historical"
5. **Be on the correct dashboard** before asking for data

---

## ⚠️ Important Notes

- Historical data exports may take a few seconds for large date ranges
- The chatbot automatically limits exports to prevent server overload
- All dates are interpreted as DD/MM/YYYY unless ISO format (YYYY-MM-DD)
- If no year is specified, chatbot intelligently determines current or last year
- Region names are case-insensitive ("nagpur", "Nagpur", "NAGPUR" all work)

---

Generated: November 2024
Dashboard Version: v2.0
