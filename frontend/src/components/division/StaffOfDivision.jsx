import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  User as UserIcon, Mail, Shield, Trash2, Plus, 
  Search, AlertCircle, Loader2, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Redux Actions
import { updateUser, fetchUsers } from '../../store/slices/userSlice';
import { useConfirm } from '../../providers/ConfirmProvider';

export default function StaffOfDivision({ division, staff = [] }) {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedNewStaff, setSelectedNewStaff] = useState('');

  // --- Global State for Assignable Users ---
  const { items: allUsers = [], status: userStatus } = useSelector(state => state.users || {});
  
  // Filter for 'order' portal users who are NOT already assigned to this division
  const availableStaffToAssign = useMemo(() => {
    return allUsers.filter(u => 
      u.portal === 'order' && 
      !staff.some(assignedUser => String(assignedUser._id) === String(u._id))
    );
  }, [allUsers, staff]);

  // Filter assigned staff based on search input
  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staff;
    const lowerSearch = searchTerm.toLowerCase();
    return staff.filter(user => 
      user.name?.toLowerCase().includes(lowerSearch) || 
      user.email?.toLowerCase().includes(lowerSearch) ||
      user.role?.toLowerCase().includes(lowerSearch)
    );
  }, [staff, searchTerm]);

  // --- Handlers ---
  
  // Add Staff Member
  const handleAssignStaff = async () => {
    if (!selectedNewStaff) return toast.warning('Selection Required', { description: 'Please select a staff member to assign.' });
    if (!division) return toast.error('Division Error', { description: 'Division context lost. Please refresh.' });

    setIsAssigning(true);

    try {
      const userToUpdate = allUsers.find(u => String(u._id) === String(selectedNewStaff));
      if (!userToUpdate) throw new Error("User not found in global state.");

      // Append this division ID to the user's existing divisions
      const currentDivs = (userToUpdate.divisions || []).map(d => String(d._id || d));
      const updatedDivisions = [...new Set([...currentDivs, String(division._id)])];

      const actionPromise = dispatch(updateUser({ 
        id: selectedNewStaff, 
        userData: { divisions: updatedDivisions } 
      })).unwrap();

      toast.promise(actionPromise, {
        loading: 'Assigning staff member...',
        success: `${userToUpdate.name} assigned to division successfully.`,
        error: 'Failed to assign staff member.'
      });

      await actionPromise;
      
      // Refresh user list globally to update parent components
      dispatch(fetchUsers());
      setSelectedNewStaff('');
    } catch (err) {
      console.error("Assignment Error:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove Staff Member
  const handleRemoveStaff = async (user) => {
    if (!division) return;

    const isConfirmed = await confirm({
      title: 'Revoke Access?',
      message: `Are you sure you want to remove ${user.name} from the ${division.divisionName} division? They will lose access to all associated inventory and processing routes.`,
      confirmText: 'Revoke Access',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        // Filter out this division ID from the user's divisions
        const updatedDivisions = (user.divisions || [])
          .map(d => String(d._id || d))
          .filter(divId => divId !== String(division._id));

        const actionPromise = dispatch(updateUser({ 
          id: user._id, 
          userData: { divisions: updatedDivisions } 
        })).unwrap();

        toast.promise(actionPromise, {
          loading: `Revoking access for ${user.name}...`,
          success: `${user.name} removed from division.`,
          error: 'Failed to revoke access.'
        });

        await actionPromise;
        dispatch(fetchUsers()); // Refresh to update parent state
      } catch (err) {
        console.error("Removal Error:", err);
      }
    }
  };

  // --- Renderers ---
  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'manager': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'super_user': return 'bg-brand-gold/10 text-brand-gold border-brand-gold/20';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Assignment Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-5 pb-6 border-b border-slate-200/60">
        <div className="flex-1 w-full max-w-md relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Search Assigned Staff</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="w-full xl:w-auto bg-slate-50 p-1.5 rounded-[1.25rem] border border-slate-200 flex flex-col sm:flex-row items-center gap-2 shadow-sm shrink-0">
          <select 
            value={selectedNewStaff}
            onChange={(e) => setSelectedNewStaff(e.target.value)}
            disabled={isAssigning || availableStaffToAssign.length === 0}
            className="w-full sm:w-64 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-gold cursor-pointer disabled:opacity-50"
          >
            <option value="">{availableStaffToAssign.length > 0 ? "Select staff to assign..." : "No available staff"}</option>
            {availableStaffToAssign.map(u => (
              <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <button 
            onClick={handleAssignStaff}
            disabled={isAssigning || !selectedNewStaff}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssigning ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      </div>

      {/* 2. Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-[2rem] border border-slate-200 border-dashed">
          <Shield size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700 tracking-tight mb-1">No Staff Assigned</h3>
          <p className="text-sm font-bold text-slate-400 max-w-sm">
            {searchTerm 
              ? `No staff members matched your search for "${searchTerm}".`
              : "This division currently has no authorized personnel. Use the assignment bar above to grant access."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredStaff.map((user) => (
              <motion.div 
                key={user._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                        <UserIcon size={18} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate" title={user.name}>{user.name}</h4>
                        <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getRoleBadgeColor(user.role)}`}>
                          {user.role?.replace('_', ' ') || 'Standard'}
                        </span>
                      </div>
                    </div>
                    {user.isActive ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-1" title="Account Active" />
                    ) : (
                      <AlertCircle size={16} className="text-red-400 shrink-0 mt-1" title="Account Inactive" />
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate font-medium select-all" title={user.email}>{user.email}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-slate-600">
                      <Shield size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug">
                        Authorized across <strong className="text-slate-900 font-bold">{user.divisions?.length || 0}</strong> divisions globally.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => handleRemoveStaff(user)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg uppercase tracking-widest transition-colors"
                  >
                    <Trash2 size={12} /> Revoke
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}