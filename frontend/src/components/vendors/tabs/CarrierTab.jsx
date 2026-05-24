import React, { useState } from 'react';
import { Truck, PlusCircle, Edit, Trash2, Check, X } from 'lucide-react';

export default function CarrierTab({ carriers, setCarriers }) {
  const [newCarrier, setNewCarrier] = useState({ name: '', service: '', account: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', service: '', account: '' });

  const handleAddCarrier = () => {
    if (!newCarrier.name || !newCarrier.service) return;
    setCarriers([...carriers, { id: Date.now(), ...newCarrier }]);
    setNewCarrier({ name: '', service: '', account: '' });
  };

  const startEdit = (carrier) => {
    setEditingId(carrier.id);
    setEditData({ name: carrier.name, service: carrier.service, account: carrier.account });
  };

  const saveEdit = (id) => {
    setCarriers(carriers.map(c => c.id === id ? { ...c, ...editData } : c));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Add New Carrier Form */}
      <div className="p-4 bg-white/60 rounded-2xl border border-white/50 flex gap-3 items-center">
        <input placeholder="Carrier (e.g. UPS)" className="flex-1 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl" value={newCarrier.name} onChange={(e) => setNewCarrier({...newCarrier, name: e.target.value})} />
        <input placeholder="Service (e.g. Ground)" className="flex-1 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl" value={newCarrier.service} onChange={(e) => setNewCarrier({...newCarrier, service: e.target.value})} />
        <input placeholder="Acct #" className="w-24 bg-transparent text-sm font-bold border border-slate-200 px-4 py-2 rounded-xl" value={newCarrier.account} onChange={(e) => setNewCarrier({...newCarrier, account: e.target.value})} />
        <button onClick={handleAddCarrier} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"><PlusCircle size={18} /></button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {carriers.map((carrier) => (
          <div key={carrier.id} className="group flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
            {editingId === carrier.id ? (
              <div className="flex flex-1 gap-2 items-center">
                <input className="flex-1 bg-white p-2 rounded-lg text-sm font-bold border" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                <input className="flex-1 bg-white p-2 rounded-lg text-sm font-bold border" value={editData.service} onChange={(e) => setEditData({...editData, service: e.target.value})} />
                <input className="w-20 bg-white p-2 rounded-lg text-sm font-bold border" value={editData.account} onChange={(e) => setEditData({...editData, account: e.target.value})} />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/50 rounded-lg"><Truck size={16} /></div>
                <div>
                  <p className="font-bold text-sm">{carrier.name} <span className="text-slate-500 font-normal">({carrier.service})</span></p>
                  <p className="text-[10px] text-slate-400">Account: {carrier.account || 'N/A'}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pl-4">
              {editingId === carrier.id ? (
                <>
                  <button onClick={() => saveEdit(carrier.id)} className="text-emerald-600 p-2"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 p-2"><X size={16} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(carrier)} className="text-slate-400 opacity-0 group-hover:opacity-100 p-2"><Edit size={16} /></button>
                  <button onClick={() => setCarriers(carriers.filter(c => c.id !== carrier.id))} className="text-slate-400 opacity-0 group-hover:opacity-100 p-2"><Trash2 size={16} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}