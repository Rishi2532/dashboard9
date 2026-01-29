/**
 * Generate and Save Sample Water Scheme Data Excel File
 * 
 * This script creates a sample Excel file with water consumption and LPCD values
 * that can be used to test the import functionality.
 */

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Sample data for Amravati region
const sampleData = [
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Anakwadi",
    "Water Consumption (Latest)": 15000,
    "LPCD (Latest)": 70
  },
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Asegaon",
    "Water Consumption (Latest)": 12500,
    "LPCD (Latest)": 65
  },
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Ashti",
    "Water Consumption (Latest)": 18200,
    "LPCD (Latest)": 78
  },
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Bhalai",
    "Water Consumption (Latest)": 9800,
    "LPCD (Latest)": 55
  },
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Bhatkuli NP",
    "Water Consumption (Latest)": 25000,
    "LPCD (Latest)": 85
  },
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Chatur",
    "Water Consumption (Latest)": 11200,
    "LPCD (Latest)": 62
  },
  {
    "Region": "Amravati",
    "Scheme ID": "20003791",
    "Scheme Name": "105 Villages RRWSS",
    "Village": "Chimapur E",
    "Water Consumption (Latest)": 10500,
    "LPCD (Latest)": 58
  }
];

// Create a worksheet
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Create a workbook
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Amravati Water Data");

// Write the workbook to file
const outputPath = path.join(process.cwd(), 'sample_amravati_water_data.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Sample water data Excel file created at: ${outputPath}`);

// Also create a second format with positional columns
const positionalData = sampleData.map(item => ({
  0: item.Region,
  5: item["Scheme ID"],
  6: item["Scheme Name"],
  7: item.Village,
  10: item["Water Consumption (Latest)"],
  16: item["LPCD (Latest)"]
}));

// Create a worksheet for positional data
const positionalWorksheet = XLSX.utils.json_to_sheet(positionalData);

// Create a workbook for positional data
const positionalWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(positionalWorkbook, positionalWorksheet, "Amravati Positional");

// Write the positional workbook to file
const positionalOutputPath = path.join(process.cwd(), 'sample_amravati_positional.xlsx');
XLSX.writeFile(positionalWorkbook, positionalOutputPath);

console.log(`Sample positional format Excel file created at: ${positionalOutputPath}`);