import React, { useState } from 'react';
import ChargeList from './ChargeList'; // Import the component above

export default function ProcessingTab() {
  const [subTab, setSubTab] = useState('Processing');
  
  const [processingCharges, setProcessingCharges] = useState([
    { id: 1, name: 'Standard Assembly', value: '1.50' }
  ]);
  
  const [receivingCharges, setReceivingCharges] = useState([
    { id: 1, name: 'Unloading Fee', value: '50.00' }
  ]);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <div className="flex gap-2 p-1 bg-white/20 rounded-xl w-fit">
        {['Processing', 'Receiving'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setSubTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase ${subTab === tab ? 'bg-white text-slate-900' : 'text-slate-500'}`}
          >
            {tab} Charges
          </button>
        ))}
      </div>

      {/* Conditional View */}
      {subTab === 'Processing' ? (
        <ChargeList 
          title="Order Processing Fees" 
          charges={processingCharges} 
          setCharges={setProcessingCharges} 
        />
      ) : (
        <ChargeList 
          title="Order Receiving Fees" 
          charges={receivingCharges} 
          setCharges={setReceivingCharges} 
        />
      )}
    </div>
  );
}