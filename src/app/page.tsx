'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface NumberValidation {
  number: string;
  status?: boolean;
  error?: string;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validations, setValidations] = useState<NumberValidation[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extract phone numbers from the first column and filter out empty rows
      const numbers = jsonData
        .slice(1) // Skip header row
        .filter((row: any) => row.length > 0 && row[0] && row[0].toString().trim() !== '') // Filter out empty rows
        .map((row: any) => ({
          number: row[0].toString().trim(),
        }));
      
      setValidations(numbers);
    };
    reader.readAsBinaryString(file);
  };

  const validateNumbers = async () => {
    if (!apiKey || validations.length === 0) return;
    
    setIsProcessing(true);
    const newValidations = [...validations];
    
    for (let i = 0; i < validations.length; i++) {
      try {
        const response = await fetch(`/api/validate?number=${encodeURIComponent(validations[i].number)}&apiKey=${encodeURIComponent(apiKey)}`);
        const data = await response.json();
        
        newValidations[i] = {
          ...newValidations[i],
          status: data.numberstatus,
          error: data.error,
        };
        
        setValidations(newValidations);
        setProgress(Math.round(((i + 1) / validations.length) * 100));
      } catch (error) {
        newValidations[i] = {
          ...newValidations[i],
          status: false,
          error: 'Failed to validate',
        };
      }
    }
    
    setIsProcessing(false);
    setProgress(0);
  };

  const downloadResults = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      validations.map(v => ({
        Number: v.number,
        Status: v.status ? 'Valid' : 'Invalid',
        Error: v.error || ''
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Results');
    XLSX.writeFile(workbook, 'whatsapp-validation-results.xlsx');
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">WhatsApp Number Validator</h1>
          <p>
          Check WhatsApp Numbers Easily
Use this tool to check if WhatsApp numbers are valid and active.<br></br>

Get your API key from proweblook.com.<br></br>

Upload your file to start validating.<br></br>

Need help? <a href="http://proweblook.com/sample-wa-sheet.csv" target="_blank" rel="noopener noreferrer"><u>Download a sample file here</u></a>

</p>
<p> &nbsp;</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your API key"
              />
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </button>
            </div>

            {validations.length > 0 && (
              <div className="mt-6">
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {validations.slice(0, 100).map((validation, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{validation.number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {validation.status !== undefined ? (
                              <span className={validation.status ? 'text-green-600' : 'text-red-600'}>
                                {validation.status ? 'Valid' : 'Invalid'}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={validateNumbers}
                    disabled={isProcessing}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing... {progress}%
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Validate Numbers
                      </>
                    )}
                  </button>

                  {validations.some(v => v.status !== undefined) && (
                    <button
                      onClick={downloadResults}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Results
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}