import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCarriers, addCarrier, removeCarrierProfile } from '../store/slices/carrierSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import CarrierSettingsModal from '../components/carrier/CarrierSettingsModal';
import { Loader2, Building2 } from 'lucide-react';

// IMPORT THE CONFIRM HOOK
import { useConfirm } from '../providers/ConfirmProvider';

const AVAILABLE_CARRIERS = ['FedEx', 'USPS', 'UPS', 'LTL'];

export default function CarrierManagement() {
  const dispatch = useDispatch();
  
  // INITIALIZE THE HOOK
  const confirm = useConfirm();

  // Safely access Redux state
  const { items: configuredCarriers = [], status } = useSelector((state) => state.carriers || {});
  const { items: divisions = [], status: divStatus } = useSelector((state) => state.divisions || {});
  
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [activeModalCarrier, setActiveModalCarrier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    if (status === 'idle') dispatch(fetchCarriers());
    if (divStatus === 'idle') dispatch(fetchDivisions());
  }, [status, divStatus, dispatch]);

  const handleAddCarrier = async () => {
    if (!selectedCarrier || !selectedDivision) return;
    setIsSubmitting(true);
    
    const basePayload = {
      carrierType: selectedCarrier,
      division: selectedDivision, // <--- Binding the carrier to the division
      accountName: `${selectedCarrier} Corporate Account`,
      activeEnvironment: 'test',
      isActive: true,
      credentials: { 
        test: { accountNumber: '', clientId: '', clientSecret: '' },
        live: { accountNumber: '', clientId: '', clientSecret: '' }
      }
    };

    try {
      await dispatch(addCarrier(basePayload)).unwrap();
      setSelectedCarrier('');
    } catch (error) {
      alert(`Failed to add carrier: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Using the custom glassmorphic confirm modal
  const handleUnlink = async (id) => {
    const isConfirmed = await confirm({
      title: 'Disconnect Carrier?',
      message: 'Are you sure you want to disconnect this carrier integration? All API keys and routing configurations will be permanently deleted.',
      confirmText: 'Disconnect Carrier',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      dispatch(removeCarrierProfile(id));
    }
  };

  // Filter list to only show options that haven't been added to the CURRENTLY SELECTED division yet
  const unconfiguredOptions = useMemo(() => {
    if (!selectedDivision) return AVAILABLE_CARRIERS;
    return AVAILABLE_CARRIERS.filter(
      (type) => !configuredCarriers.some(
        (configured) => 
          configured.carrierType === type && 
          (configured.division?._id || configured.division) === selectedDivision
      )
    );
  }, [selectedDivision, configuredCarriers]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Carrier Integrations</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage API connections, environment parameters, and active services for order fulfillments.</p>
        </div>
        
        {/* Dropdown Add System */}
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          
          {/* Division Selector */}
          <select
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(e.target.value);
              setSelectedCarrier(''); // Reset carrier selection when division changes
            }}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all disabled:opacity-50"
          >
            <option value="">1. Select Target Division...</option>
            {divisions.map((div) => (
              <option key={div._id} value={div._id}>{div.divisionName}</option>
            ))}
          </select>

          {/* Carrier Selector */}
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            disabled={!selectedDivision || isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all disabled:opacity-50"
          >
            <option value="">2. Select a Carrier...</option>
            {unconfiguredOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <button
            onClick={handleAddCarrier}
            disabled={!selectedCarrier || !selectedDivision || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white shadow-md hover:bg-slate-800 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed uppercase tracking-wider min-w-[150px]"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Connect'}
          </button>
        </div>
      </div>

      {(status === 'loading' || divStatus === 'loading') && configuredCarriers.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {configuredCarriers.map((carrier) => {
            // Resolve the division name for the UI
            const divRef = carrier.division?._id || carrier.division;
            const carrierDivision = divisions.find(d => d._id === divRef);
            const displayDivisionName = carrierDivision ? carrierDivision.divisionName : 'Unassigned Division';

            return (
              <div key={carrier._id} className="relative flex flex-col justify-between rounded-3xl border border-slate-200/60 bg-white/40 backdrop-blur-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                      carrier.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {carrier.carrierType}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${carrier.activeEnvironment === 'live' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-slate-100 text-slate-500'}`}>
                      {carrier.activeEnvironment}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-900 tracking-tight">{carrier.accountName}</h3>
                  <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={12} className="text-brand-gold" /> {displayDivisionName}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200/60 pt-5">
                  <button
                    type="button"
                    onClick={() => handleUnlink(carrier._id)}
                    className="rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalCarrier(carrier)}
                    className="inline-flex items-center rounded-xl bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all hover:text-brand-gold hover:border-brand-gold/30"
                  >
                    Settings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {configuredCarriers.length === 0 && status !== 'loading' && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-semibold bg-white/20">
          No live shipping carriers mapped to this network context yet.<br/>Select a division and carrier type above to bind tracking keys.
        </div>
      )}

      {activeModalCarrier && (
        <CarrierSettingsModal
          carrier={activeModalCarrier}
          divisions={divisions} // Pass divisions down so the modal can update the division if needed
          onClose={() => setActiveModalCarrier(null)}
        />
      )}
    </div>
  );
}