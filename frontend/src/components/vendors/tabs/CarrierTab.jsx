import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Truck, Loader2, Settings2, Server, Search, 
  ToggleRight, ToggleLeft, Key, X, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Redux Actions
import { fetchCarriers, addCarrier, updateCarrierConfig } from '../../../store/slices/carrierSlice';

// 1. HARDCODED OFFICIAL CATALOG
const DEFAULT_SERVICES = {
  FedEx: [
    { serviceCode: 'FIRST_OVERNIGHT', serviceName: 'First Overnight' },
    { serviceCode: 'PRIORITY_OVERNIGHT', serviceName: 'Priority Overnight' },
    { serviceCode: 'STANDARD_OVERNIGHT', serviceName: 'Standard Overnight' },
    { serviceCode: 'FEDEX_2_DAY_AM', serviceName: 'FedEx 2Day AM' },
    { serviceCode: 'FEDEX_2_DAY', serviceName: 'FedEx 2Day' },
    { serviceCode: 'EXPRESS_SAVER', serviceName: 'FedEx Express Saver' },
    { serviceCode: 'FEDEX_GROUND', serviceName: 'FedEx Ground' },
    { serviceCode: 'GROUND_HOME_DELIVERY', serviceName: 'FedEx Home Delivery' },
    { serviceCode: 'INTERNATIONAL_FIRST', serviceName: 'FedEx International First' },
    { serviceCode: 'INTERNATIONAL_PRIORITY', serviceName: 'FedEx International Priority' },
    { serviceCode: 'INTERNATIONAL_ECONOMY', serviceName: 'FedEx International Economy' }
  ],
  USPS: [
    { serviceCode: 'USPS_GROUND_ADVANTAGE', serviceName: 'USPS Ground Advantage' },
    { serviceCode: 'PRIORITY_MAIL', serviceName: 'Priority Mail' },
    { serviceCode: 'PRIORITY_MAIL_EXPRESS', serviceName: 'Priority Mail Express' },
    { serviceCode: 'MEDIA_MAIL', serviceName: 'Media Mail' },
    { serviceCode: 'FIRST_CLASS_MAIL_INTERNATIONAL', serviceName: 'First-Class Package International' }
  ],
  UPS: [
    { serviceCode: 'UPS_GROUND', serviceName: 'UPS Ground' },
    { serviceCode: 'UPS_3_DAY_SELECT', serviceName: 'UPS 3 Day Select' },
    { serviceCode: 'UPS_2ND_DAY_AIR', serviceName: 'UPS 2nd Day Air' },
    { serviceCode: 'UPS_NEXT_DAY_AIR', serviceName: 'UPS Next Day Air' },
    { serviceCode: 'UPS_STANDARD_INTERNATIONAL', serviceName: 'UPS Standard' }
  ],
  LTL: [
    { serviceCode: 'LTL_STANDARD', serviceName: 'Standard LTL Freight' },
    { serviceCode: 'LTL_EXPEDITED', serviceName: 'Expedited LTL Freight' }
  ]
};

const PLATFORMS = [
  { type: 'FedEx', name: 'FedEx', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { type: 'UPS', name: 'UPS', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { type: 'USPS', name: 'USPS', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { type: 'LTL', name: 'LTL Freight', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
];

export default function CarrierTab({ division }) {
  const dispatch = useDispatch();
  
  const { items: allCarriers = [], status: carrierStatus } = useSelector(state => state.carriers || {});
  
  // --- UI State ---
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('settings'); // 'settings' | 'services'
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');

  // --- Form State ---
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (carrierStatus === 'idle' || carrierStatus === 'failed') {
      dispatch(fetchCarriers());
    }
  }, [carrierStatus, dispatch]);

  // Filter ONLY carriers belonging to this specific Division
  const divisionCarriers = useMemo(() => {
    return allCarriers.filter(c => String(c.division?._id || c.division) === String(division?._id));
  }, [allCarriers, division]);

  // --- Handlers ---
  const openIntegrationPanel = (platform) => {
    const existingDoc = divisionCarriers.find(c => c.carrierType === platform.type);
    setSelectedPlatform(platform);
    
    if (existingDoc) {
      // Reconcile saved services with the master list to ensure new services show up
      const reconciledServices = DEFAULT_SERVICES[platform.type].map(defaultSvc => {
        const saved = existingDoc.enabledServices?.find(s => s.serviceCode === defaultSvc.serviceCode);
        return saved ? saved : { ...defaultSvc, isActive: false };
      });

      setFormData({
        _id: existingDoc._id,
        accountName: existingDoc.accountName || `${division.divisionName} - ${platform.name}`,
        isActive: existingDoc.isActive !== false,
        activeEnvironment: existingDoc.activeEnvironment || 'test',
        credentials: {
          test: { accountNumber: '', clientId: '', clientSecret: '', ...(existingDoc.credentials?.test || {}) },
          live: { accountNumber: '', clientId: '', clientSecret: '', ...(existingDoc.credentials?.live || {}) }
        },
        enabledServices: reconciledServices
      });
    } else {
      // Initialize fresh blank template
      setFormData({
        _id: null,
        accountName: `${division.divisionName} - ${platform.name}`,
        isActive: true,
        activeEnvironment: 'test',
        credentials: {
          test: { accountNumber: '', clientId: '', clientSecret: '' },
          live: { accountNumber: '', clientId: '', clientSecret: '' }
        },
        enabledServices: DEFAULT_SERVICES[platform.type].map(s => ({ ...s, isActive: false }))
      });
    }
    
    setServiceSearch('');
    setPanelTab('settings');
    setIsPanelOpen(true);
  };

  const handleCredentialChange = (env, field, value) => {
    setFormData(prev => ({
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
    
    // Exact schema match
    const payload = {
      division: division._id,
      carrierType: selectedPlatform.type,
      accountName: formData.accountName.trim(),
      isActive: formData.isActive,
      activeEnvironment: formData.activeEnvironment,
      credentials: formData.credentials,
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

  if (carrierStatus === 'loading') {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-4 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
        <span className="text-xs font-black uppercase tracking-widest">Loading Integrations...</span>
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
            Configure direct carrier accounts, API credentials, and allowed shipping services explicitly for <span className="text-slate-800">{division?.divisionName}</span>.
          </p>
        </div>
      </div>

      {/* Integration Hub Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLATFORMS.map(platform => {
          const config = divisionCarriers.find(c => c.carrierType === platform.type);
          const activeServicesCount = config ? config.enabledServices.filter(s => s.isActive).length : 0;
          
          return (
            <div key={platform.type} className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${config?.isActive ? platform.border : 'border-slate-200'}`}>
              
              {/* Top Accent Line */}
              <div className={`absolute top-0 left-0 w-full h-1 ${config?.isActive ? platform.bg.replace('bg-', 'bg-').replace('50', '400') : 'bg-slate-100'}`} />
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${platform.bg} ${platform.color}`}>
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg leading-tight">{platform.name}</h4>
                  {config ? (
                    <span className={`text-[9px] font-black uppercase tracking-widest inline-block mt-0.5 ${config.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
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
                    <span className="text-slate-500 font-bold">Environment</span>
                    <span className={`font-black uppercase tracking-widest text-[10px] px-2 py-0.5 rounded border ${config.activeEnvironment === 'live' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      {config.activeEnvironment}
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
                    Connect API credentials to enable automated label generation.
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

      {/* Slide-Over Panel for Configuring Credentials & Services */}
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
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedPlatform.bg} ${selectedPlatform.color}`}>
                      <Truck size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">{selectedPlatform.name} Integration</h3>
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
                    Settings & Credentials
                  </button>
                  <button 
                    onClick={() => setPanelTab('services')}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${panelTab === 'services' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Shipping Services
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
                
                {/* SETTINGS TAB */}
                {panelTab === 'settings' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* General Settings */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-black text-slate-800">Enable Integration</p>
                          <p className="text-[10px] text-slate-500 font-bold">Allow system to interface with {selectedPlatform.name}</p>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Active Environment</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, activeEnvironment: 'test' }))}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.activeEnvironment === 'test' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Test (Sandbox)
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, activeEnvironment: 'live' }))}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.activeEnvironment === 'live' ? 'bg-white shadow-sm text-red-600 border border-red-100' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Live (Prod)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Credentials Blocks */}
                    {['test', 'live'].map((env) => (
                      <div key={env} className={`bg-white p-5 rounded-2xl border shadow-sm space-y-4 ${formData.activeEnvironment === env ? 'border-brand-gold/50 ring-4 ring-brand-gold/5' : 'border-slate-200 opacity-60 grayscale-[30%]'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Key size={16} className={env === 'live' ? 'text-red-500' : 'text-slate-500'} />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{env} Credentials</h4>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Account Number</label>
                          <input 
                            type="text" placeholder={`Enter ${env} account number`}
                            value={formData.credentials[env].accountNumber} 
                            onChange={(e) => handleCredentialChange(env, 'accountNumber', e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Client ID / API Key</label>
                          <input 
                            type="text" placeholder="Client ID"
                            value={formData.credentials[env].clientId} 
                            onChange={(e) => handleCredentialChange(env, 'clientId', e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Client Secret / Password</label>
                          <input 
                            type="password" placeholder="Client Secret"
                            value={formData.credentials[env].clientSecret} 
                            onChange={(e) => handleCredentialChange(env, 'clientSecret', e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none"
                          />
                        </div>
                      </div>
                    ))}
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

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-slate-100">
                      {formData.enabledServices
                        .filter(s => s.serviceName.toLowerCase().includes(serviceSearch.toLowerCase()) || s.serviceCode.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .map(service => (
                          <div key={service.serviceCode} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="text-sm font-black text-slate-800">{service.serviceName}</p>
                              <p className="text-[10px] font-mono text-slate-500 tracking-widest mt-0.5">{service.serviceCode}</p>
                            </div>
                            <button onClick={() => handleServiceToggle(service.serviceCode)} className="p-1">
                              {service.isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-300" />}
                            </button>
                          </div>
                      ))}
                    </div>
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