'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface NumberValidation {
  number: string;
  status?: boolean;
  error?: string;
  isProcessing?: boolean;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validations, setValidations] = useState<NumberValidation[]>([]);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination calculations
  const totalPages = Math.ceil(validations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentValidations = validations.slice(startIndex, endIndex);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError('');
    setCurrentPage(1); // Reset to first page
    
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
      // Mark current number as processing
      newValidations[i] = {
        ...newValidations[i],
        isProcessing: true,
      };
      setValidations([...newValidations]);
      
      try {
        const response = await fetch(`/api/validate?number=${encodeURIComponent(validations[i].number)}&apiKey=${encodeURIComponent(apiKey)}`);
        const data = await response.json();
        
        newValidations[i] = {
          ...newValidations[i],
          status: data.numberstatus,
          error: data.error,
          isProcessing: false,
        };
        
        setValidations([...newValidations]);
        setProgress(Math.round(((i + 1) / validations.length) * 100));
      } catch (error) {
        newValidations[i] = {
          ...newValidations[i],
          status: false,
          error: 'Failed to validate',
          isProcessing: false,
        };
        setValidations([...newValidations]);
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

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusDisplay = (validation: NumberValidation) => {
    if (validation.isProcessing) {
      return (
        <span className="flex items-center text-blue-600">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processing...
        </span>
      );
    }
    
    if (validation.status !== undefined) {
      return (
        <span className={validation.status ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {validation.status ? '✓ Valid' : '✗ Invalid'}
        </span>
      );
    }
    
    return <span className="text-gray-400">—</span>;
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
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

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Validation Progress</span>
                      <span className="text-sm text-gray-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentValidations.map((validation, index) => (
                        <tr key={startIndex + index} className={validation.isProcessing ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {validation.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {getStatusDisplay(validation)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(endIndex, validations.length)} of {validations.length} numbers
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-2 text-sm rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}

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