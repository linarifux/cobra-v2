import React, { useState } from 'react';
import { Layers, Plus, User, ToggleLeft, ToggleRight, Trash2, Tag, Edit2, Check, X } from 'lucide-react';

export default function DivisionTab({ divisions, setDivisions, staff = [] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Creation state - only name, code, manager
  const [newDivision, setNewDivision] = useState({ name: '', code: '', manager: '', status: 'Active' });

  // Inline Editing States
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', code: '', manager: '' });

  // Fallback mock staff list if none is supplied via props
  const staffList = staff.length > 0 ? staff : [
    { id: 1, name: 'Sarah Jenkins' },
    { id: 2, name: 'Marcus Vance' },
    { id: 3, name: 'Lin Nguyen' },
    { id: 4, name: 'Amir Hossain' }
  ];

  const handleToggleStatus = (id) => {
    setDivisions(prev => prev.map(div => 
      div.id === id ? { ...div, status: div.status === 'Active' ? 'Inactive' : 'Active' } : div
    ));
  };

  const handleAddDivision = (e) => {
    e.preventDefault();
    if (!newDivision.name || !newDivision.code) return;
    
    setDivisions(prev => [...prev, { 
      id: Date.now(),
      name: newDivision.name,
      code: newDivision.code.toUpperCase(),
      manager: newDivision.manager || staffList[0]?.name || 'Unassigned',
      categories: [], // Initialized as empty; populated on their respective management pages
      status: 'Active' 
    }]);
    
    setNewDivision({ name: '', code: '', manager: '', status: 'Active' });
    setShowAddForm(false);
  };

  const startEditing = (div) => {
    setEditingId(div.id);
    setEditFormData({
      name: div.name,
      code: div.code,
      manager: div.manager
    });
  };

  const handleSaveEdit = (id) => {
    if (!editFormData.name || !editFormData.code) return;
    setDivisions(prev => prev.map(div => 
      div.id === id ? { ...div, ...editFormData, code: editFormData.code.toUpperCase() } : div
    ));
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if(confirm("Are you sure you want to decouple this division?")) {
      setDivisions(prev => prev.filter(div => div.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-brand-gold" /> Vendor Divisions & Operational Units
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Control organizational boundaries, organizational metadata, and assigned structural heads.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
        >
          <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add Division'}
        </button>
      </div>

      {/* Add New Division Form Panel */}
      {showAddForm && (
        <form onSubmit={handleAddDivision} className="bg-white/60 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end animate-in fade-in slide-in-from-top-3 duration-300">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Division Name</label>
            <input 
              type="text" 
              placeholder="e.g. North American Supply"
              value={newDivision.name}
              onChange={e => setNewDivision({...newDivision, name: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Internal Code</label>
            <input 
              type="text" 
              placeholder="e.g. DIV-NAS"
              value={newDivision.code}
              onChange={e => setNewDivision({...newDivision, code: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Division Head / Manager</label>
              <select 
                value={newDivision.manager}
                onChange={e => setNewDivision({...newDivision, manager: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900 h-[34px]"
              >
                <option value="">Select System Staff...</option>
                {staffList.map(member => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl h-[34px] tracking-wider shrink-0">
              Save
            </button>
          </div>
        </form>
      )}

      {/* Grid List of Divisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {divisions.map((div) => {
          const isEditing = editingId === div.id;

          return (
            <div 
              key={div.id} 
              className={`border rounded-2xl p-4 bg-white/50 backdrop-blur-sm transition-all shadow-sm flex flex-col justify-between ${div.status === 'Active' ? 'border-slate-200/80 hover:border-slate-400' : 'border-slate-200/40 opacity-60'}`}
            >
              <div>
                {/* Header Row: Displays form inputs if editing, else displays static layout metadata */}
                {isEditing ? (
                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Code</label>
                      <input 
                        type="text"
                        value={editFormData.code}
                        onChange={e => setEditFormData({...editFormData, code: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Division Name</label>
                      <input 
                        type="text"
                        value={editFormData.name}
                        onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">{div.code}</span>
                      <h4 className="font-black text-slate-900 text-sm mt-1">{div.name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-full tracking-wide uppercase ${div.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {div.status}
                    </span>
                  </div>
                )}

                {/* Content Stats breakdown summary lines */}
                <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-medium min-h-[28px]">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span className="w-full">
                      Head: {' '}
                      {isEditing ? (
                        <select
                          value={editFormData.manager}
                          onChange={e => setEditFormData({...editFormData, manager: e.target.value})}
                          className="px-2 py-0.5 border border-slate-300 rounded-md text-xs outline-none bg-white font-semibold"
                        >
                          {staffList.map(member => (
                            <option key={member.id} value={member.name}>{member.name}</option>
                          ))}
                        </select>
                      ) : (
                        <strong className="text-slate-800 font-bold">{div.manager || 'Unassigned'}</strong>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 font-medium">
                    <Tag size={13} className="text-slate-400" />
                    <span>Total Categories: <strong className="text-slate-900 font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]">{div.categories?.length || 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Footer Section */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100/60">
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full justify-end">
                    <button 
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider"
                    >
                      <X size={12} /> Cancel
                    </button>
                    <button 
                      onClick={() => handleSaveEdit(div.id)}
                      className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg uppercase tracking-wider"
                    >
                      <Check size={12} /> Save
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleToggleStatus(div.id)}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {div.status === 'Active' ? (
                        <>
                          <ToggleRight size={18} className="text-emerald-500" /> Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} className="text-slate-400" /> Activate
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => startEditing(div)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit Division Architecture"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDelete(div.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove Division"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}