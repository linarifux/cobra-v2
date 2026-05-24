import React, { useState } from 'react';
import { PlusCircle, Edit, Trash2, Check, X } from 'lucide-react';

export default function ChargeList({ charges, setCharges, title }) {
  const [newCharge, setNewCharge] = useState({ name: '', value: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', value: '' });

  const handleAdd = () => {
    if (!newCharge.name || !newCharge.value) return;
    setCharges([...charges, { id: Date.now(), name: newCharge.name, value: newCharge.value }]);
    setNewCharge({ name: '', value: '' });
  };

  const startEdit = (charge) => {
    setEditingId(charge.id);
    setEditData({ name: charge.name, value: charge.value });
  };

  const saveEdit = (id) => {
    setCharges(charges.map(c => c.id === id ? { ...c, ...editData } : c));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase text-slate-400">{title}</h3>
      
      {/* Input Row */}
      <div className="p-4 bg-white/60 rounded-2xl border border-white/50 flex gap-4 items-center">
        <input 
          placeholder="Charge Name" 
          className="flex-1 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl"
          value={newCharge.name}
          onChange={(e) => setNewCharge({...newCharge, name: e.target.value})}
        />
        <input 
          type="number" 
          placeholder="$0.00" 
          className="w-24 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl text-right"
          value={newCharge.value}
          onChange={(e) => setNewCharge({...newCharge, value: e.target.value})}
        />
        <button onClick={handleAdd} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
          <PlusCircle size={18} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {charges.map((charge) => (
          <div key={charge.id} className="group flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
            {editingId === charge.id ? (
              <div className="flex flex-1 gap-2 items-center">
                <input className="flex-1 bg-white p-2 rounded-lg text-sm font-bold border" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                <input className="w-20 bg-white p-2 rounded-lg text-sm font-bold border" value={editData.value} onChange={(e) => setEditData({...editData, value: e.target.value})} />
              </div>
            ) : (
              <p className="font-bold text-sm">{charge.name}</p>
            )}

            <div className="flex items-center gap-2 pl-4">
              {editingId === charge.id ? (
                <>
                  <button onClick={() => saveEdit(charge.id)} className="text-emerald-600 p-2"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 p-2"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="font-black text-lg mr-2">${charge.value}</span>
                  <button onClick={() => startEdit(charge)} className="text-slate-400 opacity-0 group-hover:opacity-100 p-2"><Edit size={16} /></button>
                  <button onClick={() => setCharges(charges.filter(c => c.id !== charge.id))} className="text-slate-400 opacity-0 group-hover:opacity-100 p-2"><Trash2 size={16} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}