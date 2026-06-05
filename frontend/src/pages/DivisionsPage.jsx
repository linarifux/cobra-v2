import React, { useState } from 'react';
import { Layers, Plus, User, ToggleLeft, ToggleRight, Trash2, Tag, Package, Edit2, Check, X, Filter, Search } from 'lucide-react';

export default function DivisionsPage({ staff = [] }) {
  // State populated with enriched version of your original division data
  const [divisions, setDivisions] = useState([
    { id: 1, name: 'Animal Nutrition', code: 'DIV-ANM', inventory: 581, categoryCount: 4, manager: 'Sarah Jenkins', status: 'Active' },
    { id: 2, name: 'Human Nutrition', code: 'DIV-HMN', inventory: 0, categoryCount: 0, manager: 'Marcus Vance', status: 'Active' },
    { id: 3, name: 'Food & Beverage', code: 'DIV-FNB', inventory: 43, categoryCount: 2, manager: 'Lin Nguyen', status: 'Active' },
  ]);

  // UI Visibility controls
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDivision, setNewDivision] = useState({ name: '', code: '', manager: '', status: 'Active' });

  // Inline Card Editing State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', code: '', manager: '' });

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');

  // Fallback system staff array matching earlier dropdown structure
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
      inventory: 0,      
      categoryCount: 0,
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
    if (confirm("Are you sure you want to decouple this division?")) {
      setDivisions(prev => prev.filter(div => div.id !== id));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setManagerFilter('All');
  };

  // Compute Filtered Divisions
  const filteredDivisions = divisions.filter(div => {
    const matchesSearch = searchQuery.trim() === '' || 
      div.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      div.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || div.status === statusFilter;
    const matchesManager = managerFilter === 'All' || div.manager === managerFilter;
    
    return matchesSearch && matchesStatus && matchesManager;
  });

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Dynamic Header Section */}
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Layers size={24} className="text-slate-800" /> Divisions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage operational organizational units, inventory holdings, and active category depths.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
        >
          <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add Division'}
        </button>
      </div>

      {/* Add New Division Slide Down Panel */}
      {showAddForm && (
        <form onSubmit={handleAddDivision} className="bg-white/60 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Division Name</label>
            <input 
              type="text" 
              placeholder="e.g. Animal Nutrition"
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
              placeholder="e.g. DIV-ANM"
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

      {/* Filter Board Panel */}
      <div className="bg-white/30 backdrop-blur-sm border border-slate-200/60 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider font-black shrink-0">
          <Filter size={14} /> Filter Board:
        </div>

        {/* Live Text Query Search */}
        <div className="relative flex items-center min-w-[200px]">
          <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            placeholder="Search name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-xs h-[28px]"
          />
        </div>
        
        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Manager Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Manager:</span>
          <select 
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]"
          >
            <option value="All">All Managers</option>
            {staffList.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.name}>{staffMember.name}</option>
            ))}
          </select>
        </div>
        
        {/* Reset Actions Trigger Button */}
        {(statusFilter !== 'All' || managerFilter !== 'All' || searchQuery !== '') && (
          <button 
            onClick={clearFilters}
            className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded-md transition-colors ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Elegant Layout Grid Portfolio of Divisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDivisions.length > 0 ? (
          filteredDivisions.map((div) => {
            const isEditing = editingId === div.id;

            return (
              <div 
                key={div.id} 
                className={`border rounded-2xl p-4 bg-white/50 backdrop-blur-sm transition-all shadow-sm flex flex-col justify-between ${div.status === 'Active' ? 'border-slate-200/80 hover:border-slate-400' : 'border-slate-200/40 opacity-60'}`}
              >
                <div>
                  {/* Header Section */}
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

                  {/* Operations & Metadata Breakdown Rows */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2 font-medium min-h-[28px]">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="w-full">
                        Head:{' '}
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

                    {/* Core Counter Metric Items */}
                    <div className="flex items-center gap-2 font-medium">
                      <Package size={13} className="text-slate-400" />
                      <span>Inventory Items: <strong className="text-slate-900 font-mono font-bold">{div.inventory}</strong></span>
                    </div>
                    
                    <div className="flex items-center gap-2 font-medium">
                      <Tag size={13} className="text-slate-400" />
                      <span>Total Categories: <strong className="text-slate-900 font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]">{div.categoryCount}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Minimalist Action Controls Footer */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100/60">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full justify-end">
                      <button 
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider"
                      >
                        <X size={12} /> Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSaveEdit(div.id)}
                        className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg uppercase tracking-wider"
                      >
                        <Check size={12} /> Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        type="button"
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
                          type="button"
                          onClick={() => startEditing(div)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit Division Information"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
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
          })
        ) : (
          <div className="col-span-full bg-white/40 border border-slate-200 rounded-2xl p-10 text-center font-semibold text-slate-400 text-sm">
            No organizational divisions found matching your selected search or configuration criteria.
          </div>
        )}
      </div>
    </div>
  );
}