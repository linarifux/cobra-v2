import React, { useState } from 'react';
import { PlusCircle, Edit, Trash2, Check, X } from 'lucide-react';

export default function RatesTab({ rates, setRates }) {
  const [newRate, setNewRate] = useState({ name: '', value: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', value: '' });

  const handleAddRate = () => {
    if (!newRate.name || !newRate.value) return;
    setRates([...rates, { id: Date.now(), name: newRate.name, value: newRate.value }]);
    setNewRate({ name: '', value: '' });
  };

  const startEdit = (rate) => {
    setEditingId(rate.id);
    setEditData({ name: rate.name, value: rate.value });
  };

  const saveEdit = (id) => {
    setRates(rates.map(r => r.id === id ? { ...r, ...editData } : r));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Add New Rate */}
      <div className="p-4 bg-white/60 rounded-2xl border border-white/50 flex gap-4 items-center">
        <input placeholder="Rate Name" className="flex-1 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl" value={newRate.name} onChange={(e) => setNewRate({...newRate, name: e.target.value})} />
        <input type="number" placeholder="$0.00" className="w-24 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl text-right" value={newRate.value} onChange={(e) => setNewRate({...newRate, value: e.target.value})} />
        <button onClick={handleAddRate} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"><PlusCircle size={18} /></button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {rates.map((rate) => (
          <div key={rate.id} className="group flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
            {editingId === rate.id ? (
              <div className="flex flex-1 gap-4 items-center">
                <input className="flex-1 bg-white p-2 rounded-lg text-sm font-bold border border-slate-200" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                <input className="w-24 bg-white p-2 rounded-lg text-sm font-bold border border-slate-200" value={editData.value} onChange={(e) => setEditData({...editData, value: e.target.value})} />
              </div>
            ) : (
              <p className="font-bold text-sm">{rate.name}</p>
            )}
            
            <div className="flex items-center gap-2 pl-4">
              {editingId === rate.id ? (
                <><button onClick={() => saveEdit(rate.id)} className="text-emerald-600 p-2"><Check size={16} /></button><button onClick={() => setEditingId(null)} className="text-slate-400 p-2"><X size={16} /></button></>
              ) : (
                <><span className="font-black text-lg mr-2">${rate.value}</span><button onClick={() => startEdit(rate)} className="text-slate-400 opacity-0 group-hover:opacity-100 p-2"><Edit size={16} /></button><button onClick={() => setRates(rates.filter(r => r.id !== rate.id))} className="text-slate-400 opacity-0 group-hover:opacity-100 p-2"><Trash2 size={16} /></button></>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}