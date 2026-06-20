import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  User, Plus, Mail, Shield, Trash2, Edit2, Check, X, 
  Loader2, KeyRound, Layers, ToggleLeft, ToggleRight
} from 'lucide-react';

// Redux Actions
import { fetchUsers, createUser, updateUser, deleteUser } from '../../../store/slices/userSlice';

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  password: '',
  role: 'standard', // 'super_user', 'manager', 'standard'
  divisions: [], // Array of Division IDs
  isActive: true
};

const ROLE_LABELS = {
  'super_user': 'Super User',
  'manager': 'Manager',
  'standard': 'Standard User'
};

export default function StaffTab({ customerData, divisions = [] }) {
  const dispatch = useDispatch();

  // --- Redux State ---
  const { items: apiUsers = [], status: userStatus } = useSelector(state => state.users || {});

  // --- Local UI State ---
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Fetch users if not already loaded
  useEffect(() => {
    if (userStatus === 'idle') {
      dispatch(fetchUsers());
    }
  }, [userStatus, dispatch]);

  // --- Filter Staff for this specific Customer ---
  const customerStaff = useMemo(() => {
    if (!customerData?._id) return [];
    return apiUsers.filter(user => 
      user.portal === 'order' && 
      (user.customer?._id || user.customer) === customerData._id
    );
  }, [apiUsers, customerData]);

  // --- Form Handlers ---
  const handleDivisionToggle = (divId) => {
    setFormData(prev => ({
      ...prev,
      divisions: prev.divisions.includes(divId)
        ? prev.divisions.filter(id => id !== divId)
        : [...prev.divisions, divId]
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingId(user._id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Never populate existing password
      role: user.role || 'standard',
      divisions: (user.divisions || []).map(d => d._id || d),
      isActive: user.isActive !== false // defaults to true
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
  };

  // --- CRUD Operations ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Schema Validation: Order users MUST have a division
    if (formData.divisions.length === 0) {
      alert("Order portal users must be assigned to at least one division.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        divisions: formData.divisions,
        isActive: formData.isActive
      };

      if (editingId) {
        // UPDATE
        if (formData.password) payload.password = formData.password; // Only send if changing
        await dispatch(updateUser({ id: editingId, ...payload })).unwrap();
      } else {
        // CREATE
        if (!formData.password) {
          alert("Password is required for new users.");
          setIsSubmitting(false);
          return;
        }
        payload.password = formData.password;
        payload.portal = 'order';
        payload.customer = customerData._id;
        
        await dispatch(createUser(payload)).unwrap();
      }

      closeForm();
    } catch (err) {
      alert(`Error saving staff member: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await dispatch(updateUser({ 
        id: user._id, 
        isActive: !user.isActive 
      })).unwrap();
    } catch (err) {
      alert(`Error updating status: ${err}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently remove this user's access?")) {
      try {
        await dispatch(deleteUser(id)).unwrap();
      } catch (err) {
        alert(`Error deleting user: ${err}`);
      }
    }
  };

  // --- Render Helpers ---
  const getDivisionNames = (userDivIds) => {
    if (!userDivIds || userDivIds.length === 0) return 'None';
    const names = userDivIds.map(id => {
      const divId = id._id || id;
      const found = divisions.find(d => d._id === divId);
      return found ? found.divisionCode : 'Unknown';
    });
    return names.join(', ');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Shield size={16} className="text-brand-gold" /> Customer Access & Staff
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage portal credentials, roles, and division access limits for this customer.</p>
        </div>
        <button 
          onClick={showForm ? closeForm : openAddForm}
          disabled={isSubmitting || divisions.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
          title={divisions.length === 0 ? "You must create a division first" : ""}
        >
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Staff</>}
        </button>
      </div>

      {/* Warning if no divisions exist */}
      {divisions.length === 0 && !showForm && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600"/>
          You must create at least one Division in the "Divisions" tab before adding order portal staff.
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/60 border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Column: Core Identity */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Full Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Jane Doe"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Email Address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="jane.doe@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Password {editingId && <span className="text-slate-400 font-normal italic lowercase">(Leave blank to keep current)</span>}
                  {!editingId && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="password" 
                    required={!editingId}
                    minLength={8}
                    placeholder={editingId ? "••••••••" : "Minimum 8 characters"}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Access Limits */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Portal Role <span className="text-red-400">*</span></label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all h-[34px] cursor-pointer"
                >
                  <option value="standard">Standard User</option>
                  <option value="manager">Manager</option>
                  <option value="super_user">Super User</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Division Restrictions <span className="text-red-400">*</span></label>
                <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-[110px] overflow-y-auto custom-scrollbar space-y-2">
                  {divisions.map(div => (
                    <label key={div._id} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.divisions.includes(div._id) ? 'bg-brand-gold border-brand-gold text-white' : 'bg-slate-50 border-slate-300 group-hover:border-brand-gold'}`}>
                        {formData.divisions.includes(div._id) && <Check size={10} strokeWidth={4} />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.divisions.includes(div._id)}
                        onChange={() => handleDivisionToggle(div._id)}
                        disabled={isSubmitting}
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{div.divisionCode} - {div.divisionName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    disabled={isSubmitting}
                  />
                  {formData.isActive ? (
                    <ToggleRight size={24} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={24} className="text-slate-400" />
                  )}
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Account Active</span>
                </label>

                <button type="submit" disabled={isSubmitting} className="flex justify-center items-center px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl h-[34px] tracking-wider transition-colors disabled:opacity-70 shadow-sm">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Staff'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Staff List */}
      <div className="space-y-3">
        {customerStaff.length === 0 && !showForm ? (
          <div className="text-center py-10 bg-white/40 border border-slate-200 border-dashed rounded-2xl text-slate-400 font-bold text-sm">
            No staff members have been provisioned for this customer.
          </div>
        ) : (
          customerStaff.map(user => (
            <div key={user._id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/50 rounded-2xl border transition-all shadow-sm ${user.isActive ? 'border-slate-200/80 hover:bg-white' : 'border-slate-200/40 opacity-60'}`}>
              
              <div className="flex items-center gap-4 mb-3 sm:mb-0 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-sm text-brand-gold">
                  <User size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm text-slate-900 truncate">{user.name}</p>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1">
                      <Mail size={10}/> {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                <div className="flex flex-col sm:items-end">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-1"><Layers size={10}/> Permitted Divisions</span>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]" title={getDivisionNames(user.divisions)}>
                    {getDivisionNames(user.divisions)}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => handleToggleStatus(user)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all mr-1"
                    title={user.isActive ? "Deactivate Account" : "Activate Account"}
                  >
                    {user.isActive ? <ToggleRight size={18} className="text-emerald-500"/> : <ToggleLeft size={18}/>}
                  </button>
                  <button 
                    onClick={() => openEditForm(user)}
                    className="p-1.5 text-slate-400 hover:text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-all"
                    title="Edit User"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(user._id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete User"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}