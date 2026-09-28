import React from 'react';

export default function ChargeList({ charges, setCharges, title }) {
  const handleValueChange = (id, newValue) => {
    setCharges(charges.map(c => c.id === id ? { ...c, value: newValue } : c));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase text-slate-400">{title}</h3>
      
      {/* Fixed Field Direct Input List */}
      <div className="space-y-2">
        {charges.map((charge) => (
          <div key={charge.id} className="group flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50 shadow-sm transition-all hover:bg-white/80">
            <p className="font-bold text-sm text-slate-800">{charge.name}</p>

            <div className="flex items-center gap-2 pl-4">
              <div className="relative">
                {charge.id !== 'baseWeightAllowance' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                )}
                <input 
                  type="number" 
                  step="any"
                  className={`w-28 bg-white p-2 ${charge.id !== 'baseWeightAllowance' ? 'pl-7' : 'pl-3'} rounded-lg text-sm font-bold text-slate-900 border border-slate-200 outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all`} 
                  value={charge.value} 
                  onChange={(e) => handleValueChange(charge.id, e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {charge.id === 'baseWeightAllowance' && (
                <span className="text-xs font-bold text-slate-500 ml-1">lbs</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}