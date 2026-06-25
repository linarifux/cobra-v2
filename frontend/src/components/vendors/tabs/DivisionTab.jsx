import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Layers, Plus, Users, ToggleLeft, ToggleRight, Trash2, Tag, 
  Edit2, Check, X, Loader2, Mail, Phone, MapPin, UserCircle 
} from 'lucide-react';
import { toast } from 'sonner';

import { createDivision, updateDivision, deleteDivision } from '../../../store/slices/divisionSlice';
import { fetchUsers, updateUser } from '../../../store/slices/userSlice';
import { fetchCategories } from '../../../store/slices/categorySlice'; 
import { useConfirm } from '../../../providers/ConfirmProvider';
import AddDivisionForm from '../../division/AddDivisionForm';

const formatErrorMessage = (err) => {
  const errorString = typeof err === 'string' ? err : (err?.message || '');
  if (errorString.includes('E11000') || errorString.includes('duplicate key')) {
    return 'This Division Code is already in use. Please use a unique identifier.';
  }
  return errorString || 'An unexpected server error occurred.';
};

const INITIAL_FORM_STATE = { 
  divisionName: '', divisionCode: '', managers: [], status: 'Active',
  contactName: '', contactEmail: '', contactNumber: '', 
  line1: '', line2: '', city: '', state: '', zip: ''
};

export default function DivisionTab({ divisions = [], customerData }) {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newDivision, setNewDivision] = useState(INITIAL_FORM_STATE);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState(INITIAL_FORM_STATE);

  const { items: apiUsers = [], status: userStatus } = useSelector(state => state.users || {});
  const { items: apiCategories = [], status: catStatus } = useSelector(state => state.categories || {});

  useEffect(() => {
    if (userStatus === 'idle') dispatch(fetchUsers());
    if (catStatus === 'idle') dispatch(fetchCategories()); 
  }, [userStatus, catStatus, dispatch]);

  const orderPortalStaff = useMemo(() => {
    return apiUsers.filter(user => user.portal === 'order');
  }, [apiUsers]);

  const formatFullAddress = (address) => {
    if (!address) return null;
    const parts = [address.line1, address.line2, address.city, address.state, address.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // --- CRUD Handlers ---
  const handleToggleStatus = async (div) => {
    try {
      const newStatus = div.status === 'Active' ? 'Inactive' : 'Active';
      const actionPromise = dispatch(updateDivision({ 
        id: div._id, 
        divisionData: { status: newStatus } 
      })).unwrap();

      toast.promise(actionPromise, {
        loading: 'Updating division status...',
        success: `Status updated to ${newStatus}.`,
        error: (err) => formatErrorMessage(err)
      });

      await actionPromise;
    } catch (err) {}
  };

  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivision.divisionName || !newDivision.divisionCode) {
      return toast.warning('Missing Data', { description: 'Division Name and Internal Code are required.' });
    }
    
    setIsSubmitting(true);
    
    const payload = {
      divisionName: newDivision.divisionName.trim(),
      divisionCode: newDivision.divisionCode.trim().toUpperCase(),
      customer: customerData._id, 
      status: newDivision.status || 'Active',
      contactName: newDivision.contactName?.trim() || undefined,
      contactEmail: newDivision.contactEmail?.trim().toLowerCase() || undefined,
      contactNumber: newDivision.contactNumber?.trim() || undefined,
      address: { 
        line1: newDivision.line1?.trim() || undefined, 
        line2: newDivision.line2?.trim() || undefined, 
        city: newDivision.city?.trim() || undefined, 
        state: newDivision.state?.trim() || undefined, 
        zip: newDivision.zip?.trim() || undefined 
      }
    };

    const syncProcess = async () => {
      const createdDiv = await dispatch(createDivision(payload)).unwrap();

      if (newDivision.managers.length > 0 && createdDiv._id) {
        const updatePromises = newDivision.managers.map(async (userId) => {
          const selectedUser = orderPortalStaff.find(u => String(u._id) === String(userId));
          if (selectedUser) {
            const currentDivIds = (selectedUser.divisions || []).map(d => String(d._id || d));
            const updatedDivs = [...new Set([...currentDivIds, String(createdDiv._id)])];
            return dispatch(updateUser({ id: selectedUser._id, userData: { divisions: updatedDivs } })).unwrap();
          }
        });
        await Promise.all(updatePromises);
        dispatch(fetchUsers()); 
      }
    };

    try {
      // FIX: Trigger syncProcess EXACTLY ONCE and store it in a variable
      const actionPromise = syncProcess();

      toast.promise(actionPromise, {
        loading: 'Provisioning division and syncing staff access...',
        success: 'Division architecture successfully deployed.',
        error: (err) => formatErrorMessage(err)
      });

      // Wait for that exact same promise to finish
      await actionPromise;
      
      // If it succeeds, clear the form and close it
      setNewDivision(INITIAL_FORM_STATE);
      setShowAddForm(false);
    } catch (err) {
      // If it fails (e.g. duplicate code), it catches silently, leaving the form OPEN so the user can fix it
    } finally {
      setIsSubmitting(false); // Always unlock the submit button
    }
  };

  const startEditing = (div) => {
    setEditingId(div._id);
    
    const assignedUserIds = orderPortalStaff
      .filter(u => u.divisions?.some(d => String(d._id || d) === String(div._id)))
      .map(u => String(u._id));

    setEditFormData({
      divisionName: div.divisionName || '',
      divisionCode: div.divisionCode || div.code || '', 
      managers: assignedUserIds, 
      contactName: div.contactName || '',
      contactEmail: div.contactEmail || '',
      contactNumber: div.contactNumber || '',
      line1: div.address?.line1 || '',
      line2: div.address?.line2 || '',
      city: div.address?.city || '',
      state: div.address?.state || '',
      zip: div.address?.zip || ''
    });
  };

  const handleAddEditManager = (userId) => {
    if (!userId || editFormData.managers.includes(userId)) return;
    setEditFormData(prev => ({ ...prev, managers: [...prev.managers, userId] }));
  };

  const handleRemoveEditManager = (userId) => {
    setEditFormData(prev => ({ ...prev, managers: prev.managers.filter(id => id !== userId) }));
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.divisionName || !editFormData.divisionCode) {
      return toast.warning('Missing Data', { description: 'Division Name and Internal Code are required.' });
    }
    
    setIsSubmitting(true);
    
    const payload = {
      divisionName: editFormData.divisionName.trim(), 
      divisionCode: editFormData.divisionCode.trim().toUpperCase(),
      contactName: editFormData.contactName?.trim() || undefined,
      contactEmail: editFormData.contactEmail?.trim().toLowerCase() || undefined,
      contactNumber: editFormData.contactNumber?.trim() || undefined,
      address: { 
        line1: editFormData.line1?.trim() || undefined, 
        line2: editFormData.line2?.trim() || undefined, 
        city: editFormData.city?.trim() || undefined, 
        state: editFormData.state?.trim() || undefined, 
        zip: editFormData.zip?.trim() || undefined 
      }
    };

    const syncProcess = async () => {
      await dispatch(updateDivision({ id, divisionData: payload })).unwrap();

      const oldManagerIds = orderPortalStaff
        .filter(u => u.divisions?.some(d => String(d._id || d) === String(id)))
        .map(u => String(u._id));
      
      const newManagerIds = editFormData.managers;

      const usersToRemove = oldManagerIds.filter(uid => !newManagerIds.includes(uid));
      const usersToAdd = newManagerIds.filter(uid => !oldManagerIds.includes(uid));

      const removePromises = usersToRemove.map(async (userId) => {
        const user = orderPortalStaff.find(u => String(u._id) === userId);
        if (user) {
          const updatedDivs = (user.divisions || []).map(d => String(d._id || d)).filter(dId => dId !== String(id));
          return dispatch(updateUser({ id: userId, userData: { divisions: updatedDivs } })).unwrap();
        }
      });

      const addPromises = usersToAdd.map(async (userId) => {
        const user = orderPortalStaff.find(u => String(u._id) === userId);
        if (user) {
          const currentDivs = (user.divisions || []).map(d => String(d._id || d));
          const updatedDivs = [...new Set([...currentDivs, String(id)])];
          return dispatch(updateUser({ id: userId, userData: { divisions: updatedDivs } })).unwrap();
        }
      });

      await Promise.all([...removePromises, ...addPromises]);
      dispatch(fetchUsers()); 
    };

    try {
      // FIX: Trigger exactly once
      const actionPromise = syncProcess();

      toast.promise(actionPromise, {
        loading: 'Saving modifications & syncing staff access...',
        success: 'Division updated successfully.',
        error: (err) => formatErrorMessage(err)
      });

      await actionPromise;
      
      // Close inline editing
      setEditingId(null);
    } catch (err) {
      // Caught silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Decouple Division?',
      message: 'Are you sure you want to permanently delete this division? Any associated items must be reassigned.',
      confirmText: 'Delete Division',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      const syncProcess = async () => {
        await dispatch(deleteDivision(id)).unwrap();
        
        const usersToUpdate = orderPortalStaff.filter(u => u.divisions?.some(d => String(d._id || d) === String(id)));
        
        const updatePromises = usersToUpdate.map(async (user) => {
          const updatedDivs = user.divisions.map(d => String(d._id || d)).filter(dId => dId !== String(id));
          return dispatch(updateUser({ id: user._id, userData: { divisions: updatedDivs } })).unwrap();
        });

        await Promise.all(updatePromises);
        dispatch(fetchUsers()); 
      };

      try {
        // FIX: Trigger exactly once
        const actionPromise = syncProcess();

        toast.promise(actionPromise, {
          loading: 'Decoupling division and cleaning databases...',
          success: 'Division permanently removed from network.',
          error: (err) => `Delete Failed: ${formatErrorMessage(err)}`
        });

        await actionPromise;
      } catch (err) {}
    }
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all";

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

      {showAddForm && (
        <AddDivisionForm 
          newDivision={newDivision} 
          setNewDivision={setNewDivision} 
          onSubmit={handleAddDivision} 
          staffList={orderPortalStaff} 
          isSubmitting={isSubmitting}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {divisions.length === 0 && !showAddForm ? (
        <div className="text-center py-10 bg-white/40 border border-slate-200 border-dashed rounded-[2rem] text-slate-400 font-bold text-sm shadow-sm">
          No divisions registered for this customer yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {divisions.map((div) => {
            const isEditing = editingId === div._id;
            
            const assignedUsers = orderPortalStaff.filter(u => u.divisions?.some(d => String(d._id || d) === String(div._id)));
            const totalCategories = apiCategories.filter(cat => String(cat.division?._id || cat.division) === String(div._id)).length;
            const fullAddress = formatFullAddress(div.address);

            return (
              <div key={div._id} className={`border rounded-[2rem] p-6 bg-white/60 backdrop-blur-xl transition-all shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between ${div.status === 'Active' ? 'border-slate-200/80 hover:border-slate-300/80' : 'border-slate-200/40 opacity-70 hover:opacity-100'}`}>
                <div>
                  {isEditing ? (
                    <div className="space-y-4 mb-4">
                      {/* Edit Core Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Division Code</label>
                          <input type="text" value={editFormData.divisionCode} onChange={e => setEditFormData({...editFormData, divisionCode: e.target.value})} disabled={isSubmitting} className={`${inputClass} font-mono uppercase`} />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Division Name</label>
                          <input type="text" value={editFormData.divisionName} onChange={e => setEditFormData({...editFormData, divisionName: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Authorized Staff</label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editFormData.managers.map(userId => {
                              const staff = orderPortalStaff.find(s => String(s._id) === userId);
                              if (!staff) return null;
                              return (
                                <span key={userId} className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold shadow-sm">
                                  {staff.name}
                                  <X size={12} className="cursor-pointer hover:text-red-500 transition-colors text-slate-400" onClick={() => handleRemoveEditManager(userId)} />
                                </span>
                              );
                            })}
                          </div>
                          <select 
                            value="" 
                            onChange={e => handleAddEditManager(e.target.value)} 
                            disabled={isSubmitting} 
                            className={`${inputClass} cursor-pointer`}
                          >
                            <option value="">+ Assign Staff Member...</option>
                            {orderPortalStaff.filter(s => !editFormData.managers.includes(String(s._id))).map(member => (
                              <option key={member._id} value={member._id}>{member.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Edit Contact & Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Contact Name</label>
                          <input type="text" value={editFormData.contactName} onChange={e => setEditFormData({...editFormData, contactName: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Contact Email</label>
                          <input type="email" value={editFormData.contactEmail} onChange={e => setEditFormData({...editFormData, contactEmail: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Phone</label>
                          <input type="text" value={editFormData.contactNumber} onChange={e => setEditFormData({...editFormData, contactNumber: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Address Line 1</label>
                          <input type="text" value={editFormData.line1} onChange={e => setEditFormData({...editFormData, line1: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Address Line 2</label>
                          <input type="text" value={editFormData.line2} onChange={e => setEditFormData({...editFormData, line2: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">City</label>
                          <input type="text" value={editFormData.city} onChange={e => setEditFormData({...editFormData, city: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">State / Region</label>
                          <input type="text" value={editFormData.state} onChange={e => setEditFormData({...editFormData, state: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Zip Code</label>
                          <input type="text" value={editFormData.zip} onChange={e => setEditFormData({...editFormData, zip: e.target.value})} disabled={isSubmitting} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div>
                          <span className="text-[10px] font-mono font-black text-slate-600 uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                            {div.divisionCode || div.code || 'NO-CODE'}
                          </span>
                          <h4 className="font-black text-slate-900 text-lg mt-2 leading-tight tracking-tight">{div.divisionName}</h4>
                        </div>
                        <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg tracking-widest uppercase border shadow-sm shrink-0 ${div.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {div.status || 'Active'}
                        </span>
                      </div>

                      {/* Display Contact Info Block */}
                      {(div.contactName || div.contactEmail || div.contactNumber || fullAddress) && (
                        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm mb-4 space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Directory Profile</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-bold text-slate-600">
                            {div.contactName && <div className="flex items-center gap-1.5 truncate"><UserCircle size={13} className="text-brand-gold shrink-0"/> <span className="truncate">{div.contactName}</span></div>}
                            {div.contactEmail && <div className="flex items-center gap-1.5 truncate"><Mail size={13} className="text-slate-400 shrink-0"/> <a href={`mailto:${div.contactEmail}`} className="truncate hover:text-brand-gold transition-colors">{div.contactEmail}</a></div>}
                            {div.contactNumber && <div className="flex items-center gap-1.5 truncate"><Phone size={13} className="text-slate-400 shrink-0"/> <span className="truncate">{div.contactNumber}</span></div>}
                            {fullAddress && <div className="flex items-start gap-1.5 sm:col-span-2"><MapPin size={13} className="text-slate-400 shrink-0 mt-0.5"/> <span className="leading-tight">{fullAddress}</span></div>}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                        
                        <div className="flex items-start gap-2 font-medium">
                          <Users size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <div className="w-full flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Authorized Staff:</span>
                            {assignedUsers.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {assignedUsers.map(u => (
                                  <span key={u._id} className="text-slate-800 text-[10px] font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                    {u.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-bold italic">No staff assigned</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 font-medium">
                          <Tag size={14} className="text-slate-400 shrink-0" />
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Categories:</span>
                            <strong className="text-slate-900 font-black bg-white px-2 py-0.5 rounded-md text-[11px] border border-slate-200 shadow-sm">
                              {totalCategories}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions Footer Section */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-200/60">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full justify-end">
                      <button type="button" onClick={() => setEditingId(null)} disabled={isSubmitting} className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50">
                        <X size={12} /> Cancel
                      </button>
                      <button type="button" onClick={() => handleSaveEdit(div._id)} disabled={isSubmitting} className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors shadow-md disabled:opacity-70">
                        {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Updates
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => handleToggleStatus(div)} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${div.status === 'Active' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-emerald-600'}`}>
                        {div.status === 'Active' ? (
                          <><ToggleRight size={18} className="text-emerald-500" /> Deactivate</>
                        ) : (
                          <><ToggleLeft size={18} /> Activate</>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditing(div)} className="p-1.5 text-slate-400 hover:text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-all" title="Edit Division Architecture">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(div._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remove Division">
                          <Trash2 size={14} />
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