import React, { useState, useRef } from 'react';
import { Upload, X, Building2, MapPin, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../utils/api'; // Adjust the import path to your axios instance

export default function BulkUserUploadModal({ onClose, customers, availableDivisionsForFilter, onSuccess }) {
  const [bulkCustomer, setBulkCustomer] = useState('');
  const [bulkDivision, setBulkDivision] = useState('');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const contextualDivisions = bulkCustomer
    ? availableDivisionsForFilter.filter(d => {
        const custId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
        return String(custId) === String(bulkCustomer);
      })
    : [];

  const handleDownloadTemplate = () => {
    if (!bulkCustomer || !bulkDivision) {
      return toast.error('Required Step', { description: 'Please select both a Target Customer and a Target Division first so we can pre-fill the IDs in your template.' });
    }

    const headers = [
      'Name', 
      'Email', 
      'Password',
      'Phone', 
      'Street1', 
      'Street2', 
      'City', 
      'State', 
      'ZipCode', 
      'Country',
      'Portal (admin | order)',
      'Role (super_admin | admin | super_user | manager | standard)', 
      'ChargeCode', 
      'OrderLimit',
      'ShowCostsInCp (true | false)',
      'IsActive (true | false)',
      'Customer_ID', 
      'Division_ID'
    ];

    const sampleRow = [
      'John Doe', 
      'john.doe@example.com', 
      'jdoe12', 
      '555-0100', 
      '123 Main St', 
      'Suite 100', 
      'New York', 
      'NY', 
      '10001', 
      'US',
      'order',
      'standard', 
      'CHG-001', 
      '1', 
      'false',
      'true',
      bulkCustomer,
      bulkDivision
    ];

    const csvContent = [
      headers.join(','),
      sampleRow.map(val => `"${val}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.setAttribute('download', 'COBRA_Bulk_User_Template.csv');
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template Downloaded', { description: 'Please strictly follow the column headers when filling out the spreadsheet.' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error("Invalid file type", { description: "Please upload a valid .csv file." });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", { description: "Maximum file size is 5MB." });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleProcessUpload = async () => {
    if (!selectedFile) {
      return toast.error("Missing File", { description: "Please select a CSV file to upload." });
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Handle 207 Partial Success
      if (response.status === 207) {
        toast.warning(response.data.message, { 
          duration: 10000,
          description: "Check the console for detailed row errors." 
        });
        
        const partialErrors = response.data.data?.errors;
        if (partialErrors && Array.isArray(partialErrors)) {
          partialErrors.slice(0, 4).forEach((err, idx) => {
            setTimeout(() => toast.error(err, { duration: 6000 }), (idx + 1) * 600);
          });
        }
      } else {
        toast.success('Upload Successful', { description: `Successfully imported ${response.data.data.count} users.` });
      }
      
      if (onSuccess) onSuccess(); 
      onClose();
      
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      const errMsg = error.response?.data?.message || error.message || 'Failed to upload users.';
      
      toast.error('Upload Failed', { description: errMsg, duration: 8000 });
      
      // Clearly display specific row errors to the user sequentially
      if (serverErrors && Array.isArray(serverErrors)) {
        serverErrors.slice(0, 4).forEach((err, idx) => {
          setTimeout(() => toast.error(err, { duration: 8000 }), (idx + 1) * 600);
        });
        if (serverErrors.length > 4) {
           setTimeout(() => toast.info(`...and ${serverErrors.length - 4} more errors.`), 3500);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isUploading && onClose()} />
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Bulk User Upload</h2>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">Spreadsheet Import</p>
            </div>
          </div>
          <button 
            onClick={() => !isUploading && onClose()} 
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 ml-1">
                <Building2 size={12} /> Target Customer
              </label>
              <select 
                value={bulkCustomer}
                onChange={(e) => {
                  setBulkCustomer(e.target.value);
                  setBulkDivision(''); 
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select a Customer...</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.customerName}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 ml-1">
                <MapPin size={12} /> Target Division
              </label>
              <select 
                value={bulkDivision}
                onChange={(e) => setBulkDivision(e.target.value)}
                disabled={!bulkCustomer}
                className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer ${!bulkCustomer ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <option value="">Select a Division...</option>
                {contextualDivisions.map(d => (
                  <option key={d._id} value={d._id}>{d.divisionName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-slate-800">1. Download Template</p>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-relaxed pr-2">
                  Download the CSV template. Fill in the details adhering to the column formatting constraints.
                </p>
              </div>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm active:scale-95"
            >
              <Download size={14} /> Download Template.csv
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800 ml-1">2. Upload Completed File</p>
            
            <input 
              type="file" 
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div 
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer group
                ${selectedFile ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-300'}
              `}
            >
              <Upload size={24} className={`mb-3 transition-colors ${selectedFile ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
              
              {selectedFile ? (
                <>
                  <p className="text-xs font-bold text-blue-700">{selectedFile.name}</p>
                  <p className="text-[10px] font-medium text-blue-500 mt-1 uppercase tracking-widest">Click to change file</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-700">Click to browse or drag file here</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Supports .csv up to 5MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleProcessUpload}
            disabled={!selectedFile || isUploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:active:scale-100"
          >
            {isUploading && <Loader2 size={14} className="animate-spin" />}
            {isUploading ? 'Processing...' : 'Process Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}