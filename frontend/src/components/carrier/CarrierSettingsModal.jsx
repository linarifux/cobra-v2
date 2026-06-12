import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateCarrierConfig } from '../../store/slices/carrierSlice';
import { Loader2 } from 'lucide-react';

export default function CarrierSettingsModal({ carrier, onClose }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state with safe fallbacks
  const [formData, setFormData] = useState({
    accountName: carrier.accountName || '',
    activeEnvironment: carrier.activeEnvironment || 'test',
    isActive: carrier.isActive ?? true,
    credentials: {
      test: {
        accountNumber: carrier.credentials?.test?.accountNumber || '',
        clientId: carrier.credentials?.test?.clientId || '',
        clientSecret: carrier.credentials?.test?.clientSecret || ''
      },
      live: {
        accountNumber: carrier.credentials?.live?.accountNumber || '',
        clientId: carrier.credentials?.live?.clientId || '',
        clientSecret: carrier.credentials?.live?.clientSecret || ''
      }
    }
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCredChange = (env, field, value) => {
    setFormData((prev) => ({
      ...prev,
      credentials: { 
        ...prev.credentials, 
        [env]: {
          ...prev.credentials[env],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dispatch(updateCarrierConfig({ id: carrier._id, updatedData: formData })).unwrap();
      onClose();
    } catch (err) {
      alert(`Failed to save settings: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for rendering form rows
  const FormRow = ({ label, value, onChange, type = "text", placeholder = "" }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-slate-100 items-center">
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="md:col-span-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-mono text-slate-800 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all bg-white"
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Settings
            </h2>
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-slate-200">
              {carrier.carrierType} Profile
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-8 py-2 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-200 mb-2">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Active Target Environment</label>
              <select
                value={formData.activeEnvironment}
                onChange={(e) => handleInputChange('activeEnvironment', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all bg-white cursor-pointer"
              >
                <option value="test">Test (Sandbox)</option>
                <option value="live">Live (Production)</option>
              </select>
            </div>
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2 pt-4 border-b border-slate-200">
            <div className="text-sm font-bold text-slate-900">Setting</div>
            <div className="md:col-span-2 text-sm font-bold text-slate-900 pl-1">Value</div>
          </div>

          <form id="carrier-settings-form" onSubmit={handleSubmit} className="pb-6">
            
            {/* Test Credentials Block */}
            <FormRow 
              label="Test account number" 
              value={formData.credentials.test.accountNumber} 
              onChange={(val) => handleCredChange('test', 'accountNumber', val)} 
            />
            <FormRow 
              label="Test client ID" 
              value={formData.credentials.test.clientId} 
              onChange={(val) => handleCredChange('test', 'clientId', val)} 
            />
            <FormRow 
              label="Test client secret" 
              value={formData.credentials.test.clientSecret} 
              onChange={(val) => handleCredChange('test', 'clientSecret', val)} 
              type="password"
            />

            {/* Live Credentials Block */}
            <FormRow 
              label="Live account number" 
              value={formData.credentials.live.accountNumber} 
              onChange={(val) => handleCredChange('live', 'accountNumber', val)} 
            />
            <FormRow 
              label="Live client ID" 
              value={formData.credentials.live.clientId} 
              onChange={(val) => handleCredChange('live', 'clientId', val)} 
            />
            <FormRow 
              label="Live client secret" 
              value={formData.credentials.live.clientSecret} 
              onChange={(val) => handleCredChange('live', 'clientSecret', val)} 
              type="password"
            />

            <div className="pt-6">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-brand-gold focus:ring-brand-gold accent-brand-gold"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900 select-none block">Enable Carrier Routing Globally</span>
                  <span className="text-xs font-medium text-slate-500 select-none block mt-0.5">Allow the system to query this carrier. (Service-level restrictions are handled in Customer Settings).</span>
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="carrier-settings-form"
            disabled={isSubmitting}
            className="flex items-center justify-center min-w-[160px] bg-[#53617A] hover:bg-[#434F64] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Update Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}