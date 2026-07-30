import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, Truck, Check, Loader2, Globe, Hash, MapPin, Tag, ShieldCheck 
} from 'lucide-react';
import api from '../utils/api'; // Adjust the import path if your api utility is located elsewhere

export default function TestCarrier() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nickname: '',
    account_number: '',
    account_postal_code: '',
    account_country_code: 'US'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleConnectCarrier = async (e) => {
    e.preventDefault();
    
    if (!formData.nickname || !formData.account_number || !formData.account_postal_code) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    console.log(formData)

    try {
      // Assuming your express route is mounted at /api/v1/test-carriers
      const response = await api.post('/test-carriers', formData);
      
      toast.success('UPS Account Connected', {
        description: `Successfully linked ${formData.nickname} to ShipStation.`
      });
      
      // Reset form on success
      setFormData({
        nickname: '',
        account_number: '',
        account_postal_code: '',
        account_country_code: 'US'
      });

    } catch (err) {
      console.error('Carrier connection error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to connect UPS account.';
      setFormError(errorMessage);
      toast.error('Connection Failed', { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reusable UI Classes
  const inputClass = "w-full h-12 pl-10 pr-4 rounded-xl border border-white/60 bg-white/50 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1";

  return (
    <div className="relative max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700 px-4 pt-6 pb-12">
      
      {/* Background Decorative Orbs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/10 rounded-full mix-blend-multiply filter blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center gap-4 pb-2">
        <button 
          onClick={() => navigate(-1)}
          className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Connect UPS Account</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Configure your ShipStation carrier settings securely.</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white/40 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
        
        <div className="border-b border-white/50 px-6 sm:px-8 py-5 flex items-center gap-3 bg-white/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-100 to-orange-100 border border-white shadow-inner shrink-0">
            <Truck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">UPS Credentials</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier API Setup</p>
          </div>
        </div>

        <form onSubmit={handleConnectCarrier} className="p-6 sm:p-8 space-y-6">
          
          {formError && (
            <div className="p-4 bg-red-50/80 backdrop-blur-md border border-red-200/50 text-red-700 text-sm font-medium rounded-2xl flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className={labelClass}>Connection Nickname <span className="text-red-400">*</span></label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  name="nickname" 
                  value={formData.nickname} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Primary UPS Account" 
                  className={inputClass} 
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>UPS Account Number <span className="text-red-400">*</span></label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  name="account_number" 
                  value={formData.account_number} 
                  onChange={handleInputChange} 
                  placeholder="9-digit UPS Account Number" 
                  className={inputClass} 
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Postal Code <span className="text-red-400">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    name="account_postal_code" 
                    value={formData.account_postal_code} 
                    onChange={handleInputChange} 
                    placeholder="e.g. 10001" 
                    className={inputClass} 
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Country Code <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <select 
                    name="account_country_code" 
                    value={formData.account_country_code} 
                    onChange={handleInputChange} 
                    className={`${inputClass} appearance-none cursor-pointer`}
                    disabled={isSubmitting}
                  >
                    <option value="US">United States (US)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="AU">Australia (AU)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200/60">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-slate-900 text-brand-gold text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Connecting...</>
              ) : (
                <><Check className="h-5 w-5" /> Connect UPS Account</>
              )}
            </button>
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
              Secure API Connection to ShipStation
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}