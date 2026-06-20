import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layers, Plus, User, ToggleLeft, ToggleRight, Trash2, Tag, Edit2, Check, X, Loader2 } from 'lucide-react';

// Redux Thunks
import { createDivision, updateDivision, deleteDivision } from '../../../store/slices/divisionSlice';
import { fetchUsers, updateUser } from '../../../store/slices/userSlice';
import { fetchCategories } from '../../../store/slices/categorySlice'; // NEW: Import categories

export default function DivisionTab({ divisions = [], customerData }) {
  const dispatch = useDispatch();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Creation state
  const [newDivision, setNewDivision] = useState({ divisionName: '', divisionCode: '', manager: '', status: 'Active' });

  // Inline Editing States
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ divisionName: '', divisionCode: '', manager: '' });

  // --- Redux State & Fetching ---
  const { items: apiUsers = [], status: userStatus } = useSelector(state => state.users || {});
  const { items: apiCategories = [], status: catStatus } = useSelector(state => state.categories || {}); // NEW: Categories State

  useEffect(() => {
    if (userStatus === 'idle') dispatch(fetchUsers());
    if (catStatus === 'idle') dispatch(fetchCategories()); // NEW: Fetch Categories
  }, [userStatus, catStatus, dispatch]);

  // 1. FILTER STAFF: Only allow Order Portal users to be assigned as division heads
  const orderPortalStaff = useMemo(() => {
    return apiUsers.filter(user => user.portal === 'order');
  }, [apiUsers]);

  // --- CRUD Handlers ---

  const handleToggleStatus = async (div) => {
    try {
      await dispatch(updateDivision({ 
        id: div._id, 
        divisionData: { status: div.status === 'Active' ? 'Inactive' : 'Active' } 
      })).unwrap();
    } catch (err) {
      alert(`Failed to update status: ${err}`);
    }
  };

  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivision.divisionName || !newDivision.divisionCode) return;
    
    setIsSubmitting(true);
    try {
      // 1. Create the Division
      const createdDiv = await dispatch(createDivision({
        divisionName: newDivision.divisionName,
        divisionCode: newDivision.divisionCode.toUpperCase(),
        customer: customerData._id, 
        status: newDivision.status || 'Active'
      })).unwrap();

      // 2. Synchronize User Array: Attach this new division to the selected manager's profile
      if (newDivision.manager && createdDiv._id) {
        const selectedUser = orderPortalStaff.find(u => u._id === newDivision.manager);
        if (selectedUser) {
          const currentDivIds = (selectedUser.divisions || []).map(d => d._id || d);
          const updatedDivs = [...new Set([...currentDivIds, createdDiv._id])];
          await dispatch(updateUser({ id: selectedUser._id, userData: { divisions: updatedDivs } })).unwrap();
          dispatch(fetchUsers()); // Re-fetch to keep UI in sync
        }
      }
      
      setNewDivision({ divisionName: '', divisionCode: '', manager: '', status: 'Active' });
      setShowAddForm(false);
    } catch (err) {
      alert(`Failed to add division: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (div) => {
    setEditingId(div._id);
    
    // Reverse lookup: Find which order portal user has this division ID in their array
    const assignedUser = orderPortalStaff.find(u => 
      u.divisions?.some(d => (d._id || d) === div._id)
    );

    setEditFormData({
      divisionName: div.divisionName || '',
      divisionCode: div.divisionCode || div.code || '', 
      manager: assignedUser ? assignedUser._id : '' // Set exact MongoDB ObjectId
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.divisionName || !editFormData.divisionCode) return;
    
    setIsSubmitting(true);
    try {
      // 1. Update the Division details
      await dispatch(updateDivision({ 
        id, 
        divisionData: { 
          divisionName: editFormData.divisionName, 
          divisionCode: editFormData.divisionCode.toUpperCase() 
        } 
      })).unwrap();
      
      // 2. Synchronize User Arrays if the Manager changed
      const oldManager = orderPortalStaff.find(u => u.divisions?.some(d => (d._id || d) === id));
      const oldManagerId = oldManager ? oldManager._id : null;
      const newManagerId = editFormData.manager;

      if (oldManagerId !== newManagerId) {
        // Remove division from the OLD manager's array
        if (oldManagerId) {
          const updatedDivs = (oldManager.divisions || []).map(d => d._id || d).filter(divId => divId !== id);
          await dispatch(updateUser({ id: oldManagerId, userData: { divisions: updatedDivs } }));
        }
        
        // Add division to the NEW manager's array
        if (newManagerId) {
          const newUser = orderPortalStaff.find(u => u._id === newManagerId);
          if (newUser) {
            const currentDivs = (newUser.divisions || []).map(d => d._id || d);
            const updatedDivs = [...new Set([...currentDivs, id])];
            await dispatch(updateUser({ id: newManagerId, userData: { divisions: updatedDivs } }));
          }
        }
        dispatch(fetchUsers()); // Re-fetch to sync UI
      }

      setEditingId(null);
    } catch (err) {
      alert(`Failed to save changes: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this division? Any associated items must be reassigned.")) {
      try {
        await dispatch(deleteDivision(id)).unwrap();
        dispatch(fetchUsers()); // Refresh users just in case it clears references
      } catch (err) {
        alert(`Failed to delete division: ${err}`);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-brand-gold" /> Customer Divisions & Operational Units
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Control organizational boundaries, organizational metadata, and assigned structural heads.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
        >
          {showAddForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Division</>}
        </button>
      </div>

      {/* Add New Division Form Panel */}
      {showAddForm && (
        <form onSubmit={handleAddDivision} className="bg-white/60 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end shadow-sm">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Division Name</label>
            <input 
              type="text" 
              placeholder="e.g. North American Supply"
              value={newDivision.divisionName}
              onChange={e => setNewDivision({...newDivision, divisionName: e.target.value})}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Internal Code</label>
            <input 
              type="text" 
              placeholder="e.g. DIV-NAS"
              value={newDivision.divisionCode}
              onChange={e => setNewDivision({...newDivision, divisionCode: e.target.value})}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all"
              required
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Division Head / Manager</label>
              <select 
                value={newDivision.manager}
                onChange={e => setNewDivision({...newDivision, manager: e.target.value})}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all h-[34px] cursor-pointer"
              >
                <option value="">Unassigned</option>
                {orderPortalStaff.map(member => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="flex justify-center items-center w-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl h-[34px] tracking-wider shrink-0 transition-colors disabled:opacity-70">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Grid List of Divisions */}
      {divisions.length === 0 && !showAddForm ? (
        <div className="text-center py-10 bg-white/40 border border-slate-200 border-dashed rounded-2xl text-slate-400 font-bold text-sm">
          No divisions registered for this customer yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {divisions.map((div) => {
            const isEditing = editingId === div._id;
            
            // Resolve Manager Name dynamically via User schema's divisions array
            const assignedUser = orderPortalStaff.find(u => 
              u.divisions?.some(d => (d._id || d) === div._id)
            );

            // Dynamically count categories associated with this division
            const totalCategories = apiCategories.filter(cat => 
              (cat.division?._id || cat.division) === div._id
            ).length;

            return (
              <div 
                key={div._id} 
                className={`border rounded-2xl p-5 bg-white/50 backdrop-blur-sm transition-all shadow-sm flex flex-col justify-between ${div.status === 'Active' ? 'border-slate-200/80 hover:border-slate-300' : 'border-slate-200/40 opacity-60 hover:opacity-100'}`}
              >
                <div>
                  {/* Header Row */}
                  {isEditing ? (
                    <div className="space-y-3 mb-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400">Code</label>
                        <input 
                          type="text"
                          value={editFormData.divisionCode}
                          onChange={e => setEditFormData({...editFormData, divisionCode: e.target.value})}
                          disabled={isSubmitting}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400">Division Name</label>
                        <input 
                          type="text"
                          value={editFormData.divisionName}
                          onChange={e => setEditFormData({...editFormData, divisionName: e.target.value})}
                          disabled={isSubmitting}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                          {div.divisionCode || div.code || 'NO-CODE'}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm mt-1.5 leading-tight">{div.divisionName}</h4>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full tracking-wide uppercase border ${div.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {div.status || 'Active'}
                      </span>
                    </div>
                  )}

                  {/* Content Stats breakdown summary lines */}
                  <div className="space-y-2 pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2 font-medium min-h-[28px]">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="w-full flex items-center gap-1.5">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Head:</span>
                        {isEditing ? (
                          <select
                            value={editFormData.manager}
                            onChange={e => setEditFormData({...editFormData, manager: e.target.value})}
                            disabled={isSubmitting}
                            className="px-2 py-1 border border-slate-300 rounded-md text-xs outline-none bg-white font-semibold flex-1 focus:border-brand-gold"
                          >
                            <option value="">Unassigned</option>
                            {orderPortalStaff.map(member => (
                              <option key={member._id} value={member._id}>{member.name}</option>
                            ))}
                          </select>
                        ) : (
                          <strong className="text-slate-800 font-bold truncate">
                            {assignedUser?.name || 'Unassigned'}
                          </strong>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 font-medium">
                      <Tag size={13} className="text-slate-400" />
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Categories:</span>
                      <strong className="text-slate-900 font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px] border border-slate-200">
                        {totalCategories}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Actions Footer Section */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100/80">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full justify-end">
                      <button 
                        onClick={() => setEditingId(null)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        <X size={12} /> Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(div._id)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-sm disabled:opacity-70"
                      >
                        {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} 
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleToggleStatus(div)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${div.status === 'Active' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-emerald-600'}`}
                      >
                        {div.status === 'Active' ? (
                          <><ToggleRight size={18} className="text-emerald-500" /> Deactivate</>
                        ) : (
                          <><ToggleLeft size={18} /> Activate</>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEditing(div)}
                          className="p-1.5 text-slate-400 hover:text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-all"
                          title="Edit Division Architecture"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(div._id)}
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
      )}
    </div>
  );
}