// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('status');
    
    // Set PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) return;
        
        statusDiv.textContent = 'Processing...';
        
        try {
            // Read the file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Load the PDF document
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDocument = await loadingTask.promise;
            
            // Array to store results for each page
            const results = [];
            
            // Process each page
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                
                // Extract text
                let pageText = textContent.items.map(item => item.str).join(' ');
                
                // Extract phone number (10-digit pattern)
                const phoneMatch = pageText.match(/\b(\d{10})\b/);
                const phone = phoneMatch ? phoneMatch[1] : null;
                
                // Extract Grand Total
                const totalMatch = pageText.match(/Grand Total\s*([\d,]+\.\d{2})/);
                const total = totalMatch ? totalMatch[1].replace(',', '') : null;
                
                // Only add to results if both phone and total are found
                if (phone && total) {
                    results.push([phone, total]);
                }
            }
            
            // Check if we found any valid results
            if (results.length === 0) {
                statusDiv.textContent = 'No valid invoice data found. Please check your PDF.';
                return;
            }
            
            // Create Excel file
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([['Phone Number', 'Grand Total'], ...results]);
            
            // Format columns
            if (!ws['!cols']) ws['!cols'] = [];
            ws['!cols'][0] = { wch: 15 }; // Set phone number column width
            ws['!cols'][1] = { wch: 12 }; // Set grand total column width
            
            // Set the format for both columns
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let i = range.s.r + 1; i <= range.e.r; i++) {
                // Format phone number column (column A) as text
                const phoneCellAddress = XLSX.utils.encode_cell({ r: i, c: 0 });
                if (ws[phoneCellAddress]) {
                    ws[phoneCellAddress].t = 's'; // Set cell type to string (text)
                    ws[phoneCellAddress].z = '@'; // Set format to text
                }
                
                // Format grand total column (column B) as number
                const totalCellAddress = XLSX.utils.encode_cell({ r: i, c: 1 });
                if (ws[totalCellAddress]) {
                    ws[totalCellAddress].t = 'n'; // Set cell type to number
                    ws[totalCellAddress].z = '0.00'; // Set format to 2 decimal places
                }
            }
            
            XLSX.utils.book_append_sheet(wb, ws, 'Invoice Data');
            
            // Generate Excel file and download
            XLSX.writeFile(wb, 'invoice_summary.xlsx');
            
            statusDiv.textContent = `Processing complete. ${results.length} invoice(s) processed and downloaded.`;
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = `Error: ${error.message}`;
        }
    });
});

// Show selected filename inside the label
const fileInput = document.getElementById('file-input');
const fileLabelText = document.getElementById('file-label-text');

fileInput.addEventListener('change', function () {
    if (this.files && this.files.length > 0) {
        fileLabelText.textContent = this.files[0].name;
    } else {
        fileLabelText.textContent = "Choose PDF";
    }
});
