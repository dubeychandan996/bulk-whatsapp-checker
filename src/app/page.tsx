'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
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
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError('');
    
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
      
      // Check if numbers exceed 5000 limit
      if (numbers.length > 5000) {
        setFileError(`Your file contains ${numbers.length} phone numbers. Please upload a file with maximum 5000 numbers at once.`);
        setValidations([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
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
            Check WhatsApp Numbers Easily<br />
            Use this tool to check if WhatsApp numbers are valid and active.<br />
            Get your API key from proweblook.com.<br />
            Upload your file to start validating (Maximum 5000 numbers per file).<br />
            Need help? <a href="http://proweblook.com/sample-wa-sheet.csv" target="_blank" rel="noopener noreferrer"><u>Download a sample file here</u></a>
          </p>
          <p>&nbsp;</p>

          {/* Processing Warning */}
          {isProcessing && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">⚠️ IMPORTANT: Do not close this window!</p>
                  <p>Processing is in progress. If you accidentally close the window or encounter any issues:</p>
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Create a ticket on <a href="https://proweblook.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">proweblook.com</a> to get your report</li>
                    <li>Or email us at <a href="mailto:info@proweblook.com" className="underline font-medium">info@proweblook.com</a></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your API key"
              />
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                disabled={isProcessing}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File (Max 5000 numbers)
              </button>
              <p className="text-xs text-gray-500 mt-1">Supported formats: CSV, XLS, XLSX</p>
            </div>

            {/* File Error Message */}
            {fileError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold">File Upload Error</p>
                    <p className="mt-1">{fileError}</p>
                  </div>
                </div>
              </div>
            )}

            {validations.length > 0 && (
              <div className="mt-6">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">File loaded successfully!</span> Found {validations.length} phone numbers ready for validation.
                  </p>
                </div>

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
                  {validations.length > 100 && (
                    <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                      Showing first 100 numbers. Total: {validations.length} numbers
                    </div>
                  )}
                </div>

                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={validateNumbers}
                    disabled={isProcessing || !apiKey}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={isProcessing}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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