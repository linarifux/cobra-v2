import React, { useState } from 'react';
import { PlusCircle, Edit, Trash2, Check, X, Layers } from 'lucide-react';

export default function CategoryPage() {
  const [categories, setCategories] = useState([
    { id: 1, name: 'Nutrition', level: 1, parent: 'None' },
    { id: 2, name: 'Dog Food', level: 2, parent: 'Nutrition' },
  ]);

  const [formData, setFormData] = useState({ name: '', level: 1, parent: 'None' });
  const [editingId, setEditingId] = useState(null);

  const handleAddOrUpdate = () => {
    if (!formData.name) return;
    
    if (editingId) {
      setCategories(categories.map(c => c.id === editingId ? { ...c, ...formData } : c));
      setEditingId(null);
    } else {
      setCategories([...categories, { id: Date.now(), ...formData }]);
    }
    setFormData({ name: '', level: 1, parent: 'None' });
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setFormData(cat);
  };

  const deleteCategory = (id) => setCategories(categories.filter(c => c.id !== id));

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Categories</h1>
        <p className="text-slate-500 text-sm">Define and organize product hierarchy levels.</p>
      </div>

      {/* Input Form Area */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-6 rounded-3xl flex gap-4 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-black uppercase text-slate-500">Category Name</label>
          <input className="w-full bg-white p-3 rounded-xl border border-white/50 text-sm font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dry Food" />
        </div>
        <div className="w-32 space-y-1">
          <label className="text-xs font-black uppercase text-slate-500">Level</label>
          <select className="w-full bg-white p-3 rounded-xl border border-white/50 text-sm font-bold" value={formData.level} onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}>
            {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-black uppercase text-slate-500">Parent Category</label>
          <select className="w-full bg-white p-3 rounded-xl border border-white/50 text-sm font-bold" value={formData.parent} onChange={(e) => setFormData({...formData, parent: e.target.value})}>
            <option value="None">None (Root)</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={handleAddOrUpdate} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2">
           {editingId ? <Check size={16}/> : <PlusCircle size={16} />} {editingId ? 'Save Changes' : 'Add Category'}
        </button>
        {editingId && <button onClick={() => {setEditingId(null); setFormData({name: '', level: 1, parent: 'None'})}} className="p-3 bg-slate-200 rounded-xl"><X size={16}/></button>}
      </div>

      {/* Table List */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-black/5">
            <tr>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Category</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Level</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Parent</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-white/30 transition-colors">
                <td className="p-6 font-bold text-slate-900">{cat.name}</td>
                <td className="p-6">
                    <span className="bg-white px-3 py-1 rounded-lg text-xs font-black border border-white/50 text-slate-600">Lvl {cat.level}</span>
                </td>
                <td className="p-6 font-bold text-slate-500">{cat.parent}</td>
                <td className="p-6 flex justify-end gap-2">
                  <button onClick={() => startEdit(cat)} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"><Edit size={16} /></button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}