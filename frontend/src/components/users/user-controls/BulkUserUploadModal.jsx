import React, { useState } from 'react';
import { Upload, X, Building2, MapPin, FileSpreadsheet, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkUserUploadModal({ onClose, customers, availableDivisionsForFilter }) {
  const [bulkCustomer, setBulkCustomer] = useState('');
  const [bulkDivision, setBulkDivision] = useState('');

  // Contextually filter divisions based on the selected customer
  const contextualDivisions = bulkCustomer
    ? availableDivisionsForFilter.filter(d => {
        const custId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
        return String(custId) === String(bulkCustomer);
      })
    : [];

  const handleDownloadTemplate = () => {
    // Require BOTH customer and division
    if (!bulkCustomer || !bulkDivision) {
      return toast.error('Required Step', { description: 'Please select both a Target Customer and a Target Division first so we can pre-fill the IDs in your template.' });
    }

    // Embed strict formatting rules directly into the CSV headers
    const headers = [
      'Name', 
      'Email', 
      'Phone', 
      'Password', 
      'Role (standard | manager | super_user)', 
      'ChargeCode', 
      'OrderLimit',
      'Street1', 
      'Street2', 
      'City', 
      'State (2-char UPPERCASE)', 
      'ZipCode', 
      'Country',
      'Customer_ID', 
      'Division_ID'
    ];

    // Create a sample row guiding the user, pre-filled with their active dropdown selections
    const sampleRow = [
      'John Doe', 
      'john.doe@example.com', 
      '555-0100', 
      'SecurePass123!', 
      'standard', 
      'CHG-001', 
      '10',
      '123 Main St', 
      'Suite 100', 
      'New York', 
      'NY', 
      '10001', 
      'US',
      bulkCustomer,
      bulkDivision
    ];

    // Build the CSV string (wrapping values in quotes safely handles any rogue commas)
    const csvContent = [
      headers.join(','),
      sampleRow.map(val => `"${val}"`).join(',')
    ].join('\n');

    // Create a Blob and trigger the download programmatically
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.setAttribute('download', 'COBRA_Bulk_User_Template.csv');
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template Downloaded', { description: 'Please strictly follow the column headers when filling out the spreadsheet.' });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
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
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Context Selection */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 ml-1">
                <Building2 size={12} /> Target Customer
              </label>
              <select 
                value={bulkCustomer}
                onChange={(e) => {
                  setBulkCustomer(e.target.value);
                  setBulkDivision(''); // Reset division when customer changes to avoid orphaned selections
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

          {/* Template Download Section */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-slate-800">1. Download Template</p>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-relaxed pr-2">
                  Download the CSV template. Fill in the details adhering to the column formatting constraints (e.g., standard / manager / super_user).
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

          {/* File Upload Section */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800 ml-1">2. Upload Completed File</p>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-blue-300 transition-all cursor-pointer group">
              <Upload size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-3" />
              <p className="text-xs font-bold text-slate-700">Click to browse or drag file here</p>
              <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Supports .csv, .xlsx up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            Process Upload
          </button>
        </div>
      </div>
    </div>
  );
}