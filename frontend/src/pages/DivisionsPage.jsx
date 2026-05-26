import React, { useState } from 'react';
import { LayoutGrid, PlusCircle, Edit, Trash2, Check, X, Save } from 'lucide-react';

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState([
    { id: 1, name: 'Animal Nutrition', inventory: 581, categoryCount: 4, manager: 'Sarah J.' },
    { id: 2, name: 'Human Nutrition', inventory: 0, categoryCount: 0, manager: 'Mike T.' },
    { id: 3, name: 'Food & Beverage', inventory: 43, categoryCount: 2, manager: 'Alex R.' },
  ]);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '' });
  const [newDivName, setNewDivName] = useState('');

  const handleAdd = () => {
    if (!newDivName) return;
    setDivisions([...divisions, { id: Date.now(), name: newDivName, inventory: 0, categoryCount: 0 }]);
    setNewDivName('');
  };

  const startEdit = (div) => {
    setEditingId(div.id);
    setEditData({ name: div.name });
  };

  const saveEdit = (id) => {
    setDivisions(divisions.map(d => d.id === id ? { ...d, name: editData.name } : d));
    setEditingId(null);
  };

  const deleteDivision = (id) => setDivisions(divisions.filter(d => d.id !== id));

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Divisions</h1>
          <p className="text-slate-500 text-sm">Manage organizational units, inventory, and category associations.</p>
        </div>
        
        {/* Add New Bar */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-2 rounded-2xl flex gap-2">
            <input 
              placeholder="New Division Name" 
              className="bg-transparent px-4 py-2 text-sm font-bold border-r border-white/20 outline-none" 
              value={newDivName} 
              onChange={(e) => setNewDivName(e.target.value)} 
            />
            <button onClick={handleAdd} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700">
                <PlusCircle size={14} /> Add Division
            </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-black/5">
            <tr>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Division</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Inventory Items</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Categories</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {divisions.map((div) => (
              <tr key={div.id} className="hover:bg-white/30 transition-colors">
                <td className="p-6">
                  {editingId === div.id ? (
                    <input 
                      className="bg-white p-2 rounded-lg text-sm font-bold border border-slate-300 w-full"
                      value={editData.name}
                      onChange={(e) => setEditData({ name: e.target.value })}
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{div.name}</span>
                  )}
                </td>
                <td className="p-6 font-mono font-bold text-slate-600">{div.inventory}</td>
                <td className="p-6 font-mono font-bold text-slate-600">{div.categoryCount}</td>
                <td className="p-6 flex justify-end gap-2">
                  {editingId === div.id ? (
                    <button onClick={() => saveEdit(div.id)} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                      <Check size={16} />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(div)} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                      <Edit size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteDivision(div.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}