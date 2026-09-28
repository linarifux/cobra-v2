import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, Save, ShieldAlert, FileText, Settings2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import ChargeList from './ChargeList'; 

// Redux Actions
import { fetchProcessingChargesByCustomer, updateProcessingCharge, createProcessingCharge } from '../../../store/slices/processingChargeSlice';
import { fetchReceivingCharges, updateReceivingCharge, createReceivingCharge } from '../../../store/slices/receivingChargeSlice';

// Map structure containing exact rule definitions.
const CHARGE_MAP = [
  { id: 'baseFeeUpTo10lbs', name: 'Base Fee (≤ 10 lbs)', ruleFn: (v) => `Applied to the 1st 3 line items if total weight is 10 lbs or less ($${v}).` },
  { id: 'baseFee11To20lbs', name: 'Base Fee (11-20 lbs)', ruleFn: (v) => `Applied to the 1st 3 line items if total weight is between 11 and 20 lbs ($${v}).` },
  { id: 'weightSurcharge', name: 'Weight Surcharge', ruleFn: (v) => `$${v} per lb over 20 lbs.` },
  { id: 'lineItemSurcharge', name: 'Line Item Surcharge', ruleFn: (v) => `$${v} per line item over 3 line items.` },
  { id: 'packageSurcharge', name: 'Package Surcharge', ruleFn: (v) => `$${v} per package over 1.` },
  { id: 'pieceSurcharge', name: 'Piece Surcharge', ruleFn: (v) => `$${v} per piece.` },
  { id: 'cartonSurcharge', name: 'Carton Surcharge', ruleFn: (v) => `$${v} per carton.` },
  { id: 'palletProcessingFee', name: 'Pallet Processing Fee', ruleFn: (v) => `$${v} per pallet fee.` },
  { id: 'rushSurcharge', name: 'Rush Surcharge', ruleFn: (v) => `Applied if 'Rush' status toggle is active ($${v}).` },
  { id: 'internationalSurcharge', name: 'International Surcharge', ruleFn: (v) => `Applied if 'Intl' status toggle is active ($${v}).` },
];

const RECEIVING_CHARGE_MAP = [
  { id: 'baseRatePerLineItem', name: 'Base Rate Per Line Item', ruleFn: (v) => `Base fee applied per line item ($${v}).` },
  { id: 'baseWeightAllowance', name: 'Base Weight Allowance', ruleFn: (v) => `Weight included before overage triggers (${Number(v || 0).toFixed(0)} lbs).` },
  { id: 'overageRatePerPound', name: 'Overage Rate Per Pound', ruleFn: (v) => `Fee per pound over the weight allowance ($${v}).` },
  { id: 'palletProcessingFeeRate', name: 'Pallet Processing Fee Rate', ruleFn: (v) => `Processing fee for client-provided pallets ($${v}).` },
  { id: 'providedPalletFeeRate', name: 'Provided Pallet Fee Rate', ruleFn: (v) => `Fee for pallets provided to the client ($${v}).` }
];

export default function ProcessingTab({ customerData }) {
  const dispatch = useDispatch();
  
  // Navigation State
  const [activeMainTab, setActiveMainTab] = useState('Processing');
  const [activeSubView, setActiveSubView] = useState('Form'); 
  
  const [isSaving, setIsSaving] = useState(false);

  // Simulation State for Receiving Calculator (Mapped strictly to spreadsheet inputs)
  const [simWeight, setSimWeight] = useState(2116);
  const [simLineItems, setSimLineItems] = useState(1);
  const [simPPF, setSimPPF] = useState(2);
  const [simPallet, setSimPallet] = useState(0);

  const targetCustomerId = typeof customerData === 'object' ? customerData?._id : customerData;

  const { user } = useSelector(state => state.auth);
  const { items: globalCharges = [], status: processingStatus } = useSelector(state => state.processingCharges);
  const { items: globalReceiving = [], status: receivingStatus } = useSelector(state => state.receivingCharges);
  
  // Initialize with mapped arrays to ensure fields always render even if API is empty
  const [processingCharges, setProcessingCharges] = useState(() => CHARGE_MAP.map(c => ({...c, value: ''})));
  const [receivingCharges, setReceivingCharges] = useState(() => RECEIVING_CHARGE_MAP.map(c => ({...c, value: ''})));

  const isOrderPortal = user?.portal === 'order';
  const isSuperUser = user?.role === 'super_user';
  const hasWriteAccess = !isOrderPortal && ['super_admin', 'admin', 'staff'].includes(user?.role);
  const hasReadAccess = hasWriteAccess || (isOrderPortal && isSuperUser);

  useEffect(() => {
    if (targetCustomerId) {
      dispatch(fetchProcessingChargesByCustomer(targetCustomerId));
      dispatch(fetchReceivingCharges(targetCustomerId));
    }
  }, [targetCustomerId, dispatch]);

  // Continuously map incoming global Redux data without waiting strictly for a 'succeeded' flag
  useEffect(() => {
    const activeConfig = globalCharges.length > 0 ? globalCharges[0] : null;
    const mappedUIArray = CHARGE_MAP.map(field => ({
      id: field.id,
      name: field.name,
      ruleFn: field.ruleFn, 
      value: activeConfig && activeConfig[field.id] !== undefined && activeConfig[field.id] !== null
        ? Number(activeConfig[field.id]).toFixed(2) 
        : ''
    }));
    setProcessingCharges(mappedUIArray);
  }, [globalCharges]);

  useEffect(() => {
    const activeConfig = globalReceiving.length > 0 ? globalReceiving[0] : null;
    const mappedUIArray = RECEIVING_CHARGE_MAP.map(field => ({
      id: field.id,
      name: field.name,
      ruleFn: field.ruleFn, 
      value: activeConfig && activeConfig[field.id] !== undefined && activeConfig[field.id] !== null
        ? field.id === 'baseWeightAllowance' 
          ? Number(activeConfig[field.id]).toString()
          : Number(activeConfig[field.id]).toFixed(2) 
        : ''
    }));
    setReceivingCharges(mappedUIArray);
  }, [globalReceiving]);

  const handleSaveConfiguration = async () => {
    if (!hasWriteAccess) return toast.error("You do not have permission to modify pricing.");
    if (!targetCustomerId) return toast.error("No active customer assigned to this division.");
    
    setIsSaving(true);
    
    try {
      if (activeMainTab === 'Processing') {
        const payload = { customer: targetCustomerId };
        processingCharges.forEach(charge => {
          payload[charge.id] = charge.value === '' ? 0 : Number(charge.value);
        });
        
        if (globalCharges.length > 0) {
          await dispatch(updateProcessingCharge({ id: globalCharges[0]._id, chargeData: payload })).unwrap();
        } else {
          await dispatch(createProcessingCharge(payload)).unwrap();
        }
        toast.success("Processing pricing successfully updated.");

      } else if (activeMainTab === 'Receiving') {
        const payload = { customer: targetCustomerId };
        receivingCharges.forEach(charge => {
          payload[charge.id] = charge.value === '' ? 0 : Number(charge.value);
        });

        if (globalReceiving.length > 0) {
          await dispatch(updateReceivingCharge({ id: globalReceiving[0]._id, updateData: payload })).unwrap();
        } else {
          await dispatch(createReceivingCharge(payload)).unwrap();
        }
        toast.success("Receiving pricing successfully updated.");
      }
    } catch (error) {
      toast.error(`Failed to save configuration: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Dynamic Simulator Calculation (Replicates Excel Math) ---
  const simulationTotal = useMemo(() => {
    const getRate = (id) => Number(receivingCharges.find(c => c.id === id)?.value || 0);

    const baseRate = getRate('baseRatePerLineItem');
    const allowance = getRate('baseWeightAllowance');
    const overageRate = getRate('overageRatePerPound');
    const ppfRate = getRate('palletProcessingFeeRate');
    const palletRate = getRate('providedPalletFeeRate');

    const baseTotal = baseRate * simLineItems;
    // IF(D4>=100, E6*(D4-100), 0)
    const overageTotal = simWeight >= allowance ? (simWeight - allowance) * overageRate : 0;
    const ppfTotal = ppfRate * simPPF;
    const palletTotal = palletRate * simPallet;

    return baseTotal + overageTotal + ppfTotal + palletTotal;
  }, [receivingCharges, simWeight, simLineItems, simPPF, simPallet]);

  if (!hasReadAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white/40 rounded-3xl border border-white/60">
        <ShieldAlert size={48} className="mb-4 text-slate-300" />
        <h2 className="text-lg font-black text-slate-700">Access Restricted</h2>
        <p className="text-xs font-medium">You do not have the required permissions to view processing fees.</p>
      </div>
    );
  }

  const RulesCard = ({ title, chargesData }) => (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
        <FileText size={16} className="text-brand-gold" />
        {title} Rules
      </h3>
      <div className="space-y-4">
        {chargesData.map((item, idx) => {
          const displayVal = item.value !== '' && !isNaN(item.value) 
            ? item.id === 'baseWeightAllowance' ? Number(item.value).toFixed(0) : Number(item.value).toFixed(2) 
            : '0';
          
          return (
            <div key={idx} className="flex gap-4 p-4 bg-white/50 border border-white/80 rounded-2xl shadow-sm hover:shadow transition-all">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                  {item.ruleFn ? item.ruleFn(displayVal) : 'Rule not defined.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const isDataLoading = processingStatus === 'loading' || receivingStatus === 'loading';
  const inputClass = "w-full bg-white/60 border border-slate-200 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 text-center";

  return (
    <div className="space-y-6">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-white/40 border border-white/60 rounded-xl w-fit shadow-sm backdrop-blur-md">
          {['Processing', 'Receiving'].map(tab => (
            <button 
              key={tab} 
              onClick={() => {
                setActiveMainTab(tab);
                setActiveSubView('Form'); 
              }}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                activeMainTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab} Charges
            </button>
          ))}
        </div>

        {activeSubView === 'Form' && hasWriteAccess && (
          <button 
            onClick={handleSaveConfiguration}
            disabled={isSaving || isDataLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Configuration
          </button>
        )}
      </div>

      {/* Sub-View Toggles */}
      <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
        <button 
          onClick={() => setActiveSubView('Form')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-lg ${
            activeSubView === 'Form' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Settings2 size={14} /> Pricing Form
        </button>
        <button 
          onClick={() => setActiveSubView('Rules')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-lg ${
            activeSubView === 'Rules' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <FileText size={14} /> Calculation Rules
        </button>
      </div>

      {/* View Content Logic */}
      {isDataLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-gold" />
        </div>
      ) : (
        <div className={(!hasWriteAccess && activeSubView === 'Form') ? "pointer-events-none opacity-90" : ""}>
          
          {/* Processing Route */}
          {activeMainTab === 'Processing' && (
            activeSubView === 'Form' ? (
              <ChargeList 
                title="Processing Fees Breakdown" 
                charges={processingCharges} 
                setCharges={setProcessingCharges} 
              />
            ) : (
              <RulesCard title="Processing" chargesData={processingCharges} />
            )
          )}

          {/* Receiving Route */}
          {activeMainTab === 'Receiving' && (
            activeSubView === 'Form' ? (
              <div className="space-y-8">
                <ChargeList 
                  title="Receiving Configuration Rates" 
                  charges={receivingCharges} 
                  setCharges={setReceivingCharges} 
                />

                {/* --- Interactive Pricing Simulator --- */}
                <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Calculator size={16} className="text-brand-gold" />
                    Receiving Simulator
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block text-center">Weight (lbs)</label>
                      <input 
                        type="number" 
                        value={simWeight}
                        onChange={(e) => setSimWeight(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block text-center"># of Line Items</label>
                      <input 
                        type="number" 
                        value={simLineItems}
                        onChange={(e) => setSimLineItems(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block text-center">PPF</label>
                      <input 
                        type="number" 
                        value={simPPF}
                        onChange={(e) => setSimPPF(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block text-center">Pallet</label>
                      <input 
                        type="number" 
                        value={simPallet}
                        onChange={(e) => setSimPallet(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Result Bar */}
                  <div className="bg-[#0f172a] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#1e293b] shadow-inner">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Calculated Total Cost</span>
                    <span className="text-3xl font-black text-emerald-400 tracking-tight">
                      ${simulationTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <RulesCard title="Receiving" chargesData={receivingCharges} />
            )
          )}
        </div>
      )}
    </div>
  );
}