import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Truck, Loader2, Settings2, Search, 
  ToggleRight, ToggleLeft, X, Save, Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import api from '../../../utils/api'; // Ensure this points to your Axios instance
import { fetchCarriers, addCarrier, updateCarrierConfig } from '../../../store/slices/carrierSlice';

// Dynamic branding helper based on ShipStation carrier codes
const getPlatformBranding = (code) => {
  const c = String(code).toLowerCase();
  if (c.includes('fedex')) return { color: '#7c3aed', bg: '#f3e8ff', border: '#e9d5ff' }; // Purple
  if (c.includes('ups')) return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' }; // Amber
  if (c.includes('usps') || c.includes('stamps')) return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; // Blue
  if (c.includes('dhl')) return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }; // Red
  return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }; // Emerald default
};

export default function CarrierTab({ division }) {
  const dispatch = useDispatch();
  
  // Local Configured Carriers from Redux
  const { items: allCarriers = [], status: carrierStatus } = useSelector(state => state.carriers || {});
  
  // Live ShipStation Carriers
  const [ssCarriers, setSsCarriers] = useState([]);
  const [isFetchingSS, setIsFetchingSS] = useState(true);

  // --- UI State ---
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('settings'); // 'settings' | 'services'
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  // --- Form State ---
  const [formData, setFormData] = useState({});

  // 1. Fetch Local Redux Configs explicitly tied to the current division context
  useEffect(() => {
    if (division?._id) {
      dispatch(fetchCarriers(division._id));
    }
  }, [dispatch, division?._id]);

  // 2. Fetch Live ShipStation Carriers
  useEffect(() => {
    const getShipStationData = async () => {
      try {
        const res = await api.get('/shipstation/carriers');
        setSsCarriers(res.data.data || []);
      } catch (err) {
        toast.error('Failed to load ShipStation carriers. Check API connection.');
      } finally {
        setIsFetchingSS(false);
      }
    };
    getShipStationData();
  }, []);

  // Filter ONLY local carrier configs belonging to this specific Division
  const divisionCarriers = useMemo(() => {
    return allCarriers.filter(c => String(c.division?._id || c.division) === String(division?._id));
  }, [allCarriers, division]);

  // --- Handlers ---
  const openIntegrationPanel = (platform) => {
    // Check if we already have a configuration saved in the DB for this exact carrier
    const existingDoc = divisionCarriers.find(c => c.carrierType === platform.code);
    setSelectedPlatform(platform);
    
    // Dynamically build the services list based on ShipStation's live response
    const ssServices = platform.services || [];
    
    const reconciledServices = ssServices.map(ssSvc => {
      const saved = existingDoc?.enabledServices?.find(s => s.serviceCode === ssSvc.code);
      return saved ? saved : { serviceCode: ssSvc.code, serviceName: ssSvc.name, isActive: false };
    });

    if (existingDoc) {
      setFormData({
        _id: existingDoc._id,
        accountName: existingDoc.accountName || `${division?.divisionName || 'Division'} - ${platform.name}`,
        isActive: existingDoc.isActive !== false,
        enabledServices: reconciledServices
      });
    } else {
      setFormData({
        _id: null,
        accountName: `${division?.divisionName || 'Division'} - ${platform.name}`,
        isActive: true,
        enabledServices: reconciledServices
      });
    }
    
    setServiceSearch('');
    setPanelTab('settings');
    setIsPanelOpen(true);
  };

  const handleServiceToggle = (code) => {
    setFormData(prev => ({
      ...prev,
      enabledServices: prev.enabledServices.map(s => 
        s.serviceCode === code ? { ...s, isActive: !s.isActive } : s
      )
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.accountName.trim()) {
      return toast.warning('Missing Data', { description: 'Account Display Name is required.' });
    }

    setIsSubmitting(true);
    
    // Exact schema payload mapping
    const payload = {
      division: division._id,
      carrierType: selectedPlatform.code,
      shipStationId: selectedPlatform.id,
      accountName: formData.accountName.trim(),
      accountNumber: selectedPlatform.accountNumber || '',
      isActive: formData.isActive,
      enabledServices: formData.enabledServices
    };

    try {
      let actionPromise;
      if (formData._id) {
        actionPromise = dispatch(updateCarrierConfig({ id: formData._id, updatedData: payload })).unwrap();
      } else {
        actionPromise = dispatch(addCarrier(payload)).unwrap();
      }
      
      toast.promise(actionPromise, {
        loading: 'Deploying integration...',
        success: `${selectedPlatform.name} integration saved!`,
        error: 'Failed to deploy integration.'
      });
      
      await actionPromise;
      setIsPanelOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (carrierStatus === 'loading' || isFetchingSS) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-4 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
        <span className="text-xs font-black uppercase tracking-widest">Syncing ShipStation Catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="text-brand-gold" size={20} />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Division Integrations</h3>
          </div>
          <p className="text-xs text-slate-500 font-bold max-w-md leading-relaxed">
            Configure direct carrier accounts and allowed shipping services explicitly for <span className="text-slate-800">{division?.divisionName}</span>.
          </p>
        </div>
      </div>

      {ssCarriers.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl text-center font-bold text-sm shadow-sm">
          No active carriers found. Please connect your carrier accounts inside your ShipStation dashboard first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ssCarriers.map(platform => {
            const config = divisionCarriers.find(c => c.carrierType === platform.code);
            const activeServicesCount = config ? config.enabledServices.filter(s => s.isActive).length : 0;
            const branding = getPlatformBranding(platform.code);
            
            return (
              <div 
                key={platform.id} 
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group border"
                style={{ borderColor: config?.isActive ? branding.border : '#e2e8f0' }}
              >
                
                {/* Top Accent Line */}
                <div 
                  className="absolute top-0 left-0 w-full h-1" 
                  style={{ backgroundColor: config?.isActive ? branding.color : '#f1f5f9' }} 
                />
                
                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: branding.bg, color: branding.color }}
                  >
                    <Truck size={24} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-lg leading-tight truncate" title={platform.name}>{platform.name}</h4>
                    {config ? (
                      <span className="text-[9px] font-black uppercase tracking-widest inline-block mt-0.5 text-emerald-500">
                        {config.isActive ? 'Active Integration' : 'Disabled'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest inline-block mt-0.5">Unconfigured</span>
                    )}
                  </div>
                </div>

                {config ? (
                  <div className="space-y-3 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Account</span>
                      <span className="font-black text-slate-700 truncate max-w-[120px]" title={platform.accountNumber || 'Primary'}>
                        {platform.accountNumber || 'Primary'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Services</span>
                      <span className="font-black text-slate-700">{activeServicesCount} Enabled</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      Configure allowed shipping methods to enable label generation.
                    </p>
                  </div>
                )}

                <button 
                  onClick={() => openIntegrationPanel(platform)}
                  className={`w-full py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${config ? 'border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900' : 'border-dashed border-slate-300 text-slate-500 hover:border-brand-gold hover:text-brand-gold hover:bg-brand-gold/5'}`}
                >
                  {config ? 'Manage Integration' : 'Setup Account'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-Over Panel for Configuring Local Rules & Services */}
      <AnimatePresence>
        {isPanelOpen && selectedPlatform && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isSubmitting && setIsPanelOpen(false)}
            />
            
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[500px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: getPlatformBranding(selectedPlatform.code).bg, color: getPlatformBranding(selectedPlatform.code).color }}
                    >
                      <Truck size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">{selectedPlatform.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{division?.divisionName}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsPanelOpen(false)} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                    <X size={20} />
                  </button>
                </div>

                {/* Panel Tabs */}
                <div className="flex gap-6 mt-4">
                  <button 
                    onClick={() => setPanelTab('settings')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${panelTab === 'settings' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Configuration
                  </button>
                  <button 
                    onClick={() => setPanelTab('services')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${panelTab === 'services' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Allowed Services
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
                
                {/* SETTINGS TAB */}
                {panelTab === 'settings' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
                      <LinkIcon size={24} className="shrink-0" />
                      <p>This account is securely linked via your central ShipStation credentials. No local API keys are required.</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-black text-slate-800">Enable for Division</p>
                          <p className="text-[10px] text-slate-500 font-bold">Allow staff to generate rates for this carrier</p>
                        </div>
                        <button 
                          onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                          className="p-1"
                        >
                          {formData.isActive ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} className="text-slate-300" />}
                        </button>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Account Display Name</label>
                        <input 
                          type="text" required
                          value={formData.accountName} 
                          onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">ShipStation Account Number</label>
                        <input 
                          type="text"
                          value={selectedPlatform.accountNumber || 'Primary Account'} 
                          readOnly disabled
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SERVICES TAB */}
                {panelTab === 'services' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative mb-4">
                      <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" placeholder="Search services to enable..." 
                        value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                      />
                    </div>

                    {formData.enabledServices.length === 0 ? (
                      <p className="text-center text-sm font-bold text-slate-400 py-10">No services provided by this carrier.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-slate-100">
                        {formData.enabledServices
                          .filter(s => (s.serviceName || '').toLowerCase().includes(serviceSearch.toLowerCase()) || (s.serviceCode || '').toLowerCase().includes(serviceSearch.toLowerCase()))
                          .map(service => (
                            <div key={service.serviceCode} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                              <div className="pr-4 min-w-0">
                                <p className="text-sm font-black text-slate-800 truncate" title={service.serviceName}>{service.serviceName}</p>
                                <p className="text-[10px] font-mono text-slate-500 tracking-widest mt-0.5 truncate">{service.serviceCode}</p>
                              </div>
                              <button onClick={() => handleServiceToggle(service.serviceCode)} className="p-1 shrink-0">
                                {service.isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-300" />}
                              </button>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-6 border-t border-slate-100 bg-white">
                <button 
                  onClick={handleSave} 
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70 text-xs uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Deploy Configuration</>}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}