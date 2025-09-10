// functions/process-invoice/process-invoice.js
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    if (!event.body || !event.isBase64Encoded) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file uploaded' })
      };
    }

    // Get the file data
    const fileData = Buffer.from(event.body, 'base64');
    
    // Create a temporary file
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const tempPdfPath = path.join(tempDir, 'temp.pdf');
    fs.writeFileSync(tempPdfPath, fileData);
    
    // Read the PDF file
    const dataBuffer = fs.readFileSync(tempPdfPath);
    
    // Parse the PDF
    const data = await pdfParse(dataBuffer);
    const text = data.text;
    
    // Extract phone number (10-digit pattern)
    const phoneMatch = text.match(/\b\d{10}\b/);
    const phone = phoneMatch ? phoneMatch[0] : "Not Found";
    
    // Extract Grand Total
    const totalMatch = text.match(/Grand Total\s*([\d,]+\.\d{2})/);
    const total = totalMatch ? totalMatch[1].replace(',', '') : "Not Found";
    
    // Create Excel file
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Phone Number', 'Grand Total'], [phone, total]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Data');
    
    // Write Excel file to temporary location
    const excelPath = path.join(tempDir, 'invoice_summary.xlsx');
    XLSX.writeFile(wb, excelPath);
    
    // Read the Excel file as base64
    const excelFile = fs.readFileSync(excelPath);
    const excelBase64 = excelFile.toString('base64');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="invoice_summary.xlsx"'
      },
      body: excelBase64,
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};