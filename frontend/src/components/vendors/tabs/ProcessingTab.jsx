import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, Save, ShieldAlert, FileText, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import ChargeList from './ChargeList'; 

// Redux Actions
import { fetchProcessingChargesByCustomer, updateProcessingCharge, createProcessingCharge } from '../../../store/slices/processingChargeSlice';

// Map structure containing exact rule definitions from Rick_Billing_Formula.xlsx
const CHARGE_MAP = [
  { id: 'baseProcessingFee', name: 'Base Processing Fee', rule: '≤ 10 lbs for 1st 3 line items ($5.07) or 11-20 lbs for 1st 3 line items ($5.68).' },
  { id: 'weightSurcharge', name: 'Weight Surcharge', rule: '.15 per lb over 20 lbs.' },
  { id: 'lineItemSurcharge', name: 'Line Item Surcharge', rule: '.81 cents per line item over 3 line items.' },
  { id: 'packageSurcharge', name: 'Package Surcharge', rule: '.71 per package over 1.' },
  { id: 'pieceSurcharge', name: 'Piece Surcharge', rule: '.03 per piece.' },
  { id: 'cartonSurcharge', name: 'Carton Surcharge', rule: '2.05 per carton.' },
  { id: 'palletProcessingFee', name: 'Pallet Processing Fee', rule: '8.40 per pallet fee.' },
  { id: 'rushSurcharge', name: 'Rush Surcharge', rule: 'Applied if \'Rush\' status toggle is active.' },
  { id: 'internationalSurcharge', name: 'International Surcharge', rule: 'Applied if \'Intl\' status toggle is active.' },
];

const RECEIVING_CHARGE_MAP = [
  { id: 'unloadingFee', name: 'Unloading Fee', rule: 'Per Line item up to 100 lbs ($15.00).' },
  { id: 'weightSurcharge', name: 'Weight Surcharge', rule: '.15 each additional pound.' },
  { id: 'palletFee', name: 'Pallet Fee', rule: '8.40 per Pallet.' }
];

export default function ProcessingTab({ customerData }) {
  const dispatch = useDispatch();
  
  // Navigation State
  const [activeMainTab, setActiveMainTab] = useState('Processing');
  const [activeSubView, setActiveSubView] = useState('Form'); // 'Form' | 'Rules'
  
  const [isSaving, setIsSaving] = useState(false);

  // Derive Customer ID regardless of whether customerData is populated object or string
  const targetCustomerId = typeof customerData === 'object' ? customerData?._id : customerData;

  // Redux State
  const { user } = useSelector(state => state.auth);
  const { items: globalCharges = [], status } = useSelector(state => state.processingCharges);
  
  // Local Form State
  const [processingCharges, setProcessingCharges] = useState([]);
  const [receivingCharges, setReceivingCharges] = useState(
    RECEIVING_CHARGE_MAP.map(charge => ({ ...charge, value: '' }))
  );

  // Permission Evaluation
  const isOrderPortal = user?.portal === 'order';
  const isSuperUser = user?.role === 'super_user';
  const hasWriteAccess = !isOrderPortal && ['super_admin', 'admin', 'staff'].includes(user?.role);
  const hasReadAccess = hasWriteAccess || (isOrderPortal && isSuperUser);

  // Fetch initial data targeted for THIS customer
  useEffect(() => {
    if (targetCustomerId) {
      dispatch(fetchProcessingChargesByCustomer(targetCustomerId));
    }
  }, [targetCustomerId, dispatch]);

  // Sync DB data into local UI format with rules attached
  useEffect(() => {
    if (status === 'succeeded') {
      const activeConfig = globalCharges.length > 0 ? globalCharges[0] : null;
      
      const mappedUIArray = CHARGE_MAP.map(field => ({
        id: field.id,
        name: field.name,
        rule: field.rule, // Evaluated mapped rule definition for ChargeList UI
        value: activeConfig && activeConfig[field.id] !== undefined 
          ? Number(activeConfig[field.id]).toFixed(2) 
          : ''
      }));

      setProcessingCharges(mappedUIArray);
    }
  }, [globalCharges, status]);

  const handleSaveProcessing = async () => {
    if (!hasWriteAccess) return toast.error("You do not have permission to modify pricing.");
    if (!targetCustomerId) return toast.error("No active customer assigned to this division.");
    
    setIsSaving(true);
    
    // Transform UI Array back to DB Schema Object
    const payload = { customer: targetCustomerId };
    
    processingCharges.forEach(charge => {
      // Cast to Number, treating empty strings as 0 to prevent NaN backend errors
      payload[charge.id] = charge.value === '' ? 0 : Number(charge.value);
    });
    
    try {
      if (globalCharges.length > 0) {
        await dispatch(updateProcessingCharge({ id: globalCharges[0]._id, chargeData: payload })).unwrap();
        toast.success("Customer processing charges successfully updated.");
      } else {
        await dispatch(createProcessingCharge(payload)).unwrap();
        toast.success("Customer processing charges successfully initialized.");
      }
    } catch (error) {
      toast.error(`Failed to save configuration: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasReadAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white/40 rounded-3xl border border-white/60">
        <ShieldAlert size={48} className="mb-4 text-slate-300" />
        <h2 className="text-lg font-black text-slate-700">Access Restricted</h2>
        <p className="text-xs font-medium">You do not have the required permissions to view processing fees.</p>
      </div>
    );
  }

  // Helper component to render the rules text securely
  const RulesCard = ({ title, rulesMap }) => (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
        <FileText size={16} className="text-brand-gold" />
        {title} Rules
      </h3>
      <div className="space-y-4">
        {rulesMap.map((item, idx) => (
          <div key={idx} className="flex gap-4 p-4 bg-white/50 border border-white/80 rounded-2xl">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{item.name}</p>
              <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">{item.rule}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Main Navigation */}
        <div className="flex gap-2 p-1 bg-white/40 border border-white/60 rounded-xl w-fit shadow-sm backdrop-blur-md">
          {['Processing', 'Receiving'].map(tab => (
            <button 
              key={tab} 
              onClick={() => {
                setActiveMainTab(tab);
                setActiveSubView('Form'); // Reset to form view when switching main tabs
              }}
              className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                activeMainTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab} Charges
            </button>
          ))}
        </div>

        {/* Save Button for Admins (Only visible if looking at the Form) */}
        {activeMainTab === 'Processing' && activeSubView === 'Form' && hasWriteAccess && (
          <button 
            onClick={handleSaveProcessing}
            disabled={isSaving || status === 'loading'}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Configuration
          </button>
        )}
      </div>

      {/* Sub-View Toggles (Form vs Rules) */}
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
      {status === 'loading' ? (
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
              <RulesCard title="Processing" rulesMap={CHARGE_MAP} />
            )
          )}

          {/* Receiving Route */}
          {activeMainTab === 'Receiving' && (
            activeSubView === 'Form' ? (
              <ChargeList 
                title="Order Receiving Fees" 
                charges={receivingCharges} 
                setCharges={setReceivingCharges} 
              />
            ) : (
              <RulesCard title="Receiving" rulesMap={RECEIVING_CHARGE_MAP} />
            )
          )}

        </div>
      )}
    </div>
  );
}