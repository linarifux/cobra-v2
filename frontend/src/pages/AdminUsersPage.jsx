import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Users, UserPlus, ShieldCheck, Mail, Lock, 
  Building2, BadgeCheck, X, Loader2, AlertCircle, Trash2, 
  Search, Filter, MapPin, Edit2
} from 'lucide-react';

// Slices
import { fetchUsers, createUser, updateUser, deleteUser, clearUserErrors } from '../store/slices/userSlice';
import { fetchCustomers } from '../store/slices/customerSlice'; 
import { fetchDivisions } from '../store/slices/divisionSlice'; 

import PageHeader from '../components/PageHeader';

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  password: '',
  portal: 'admin',
  role: 'admin',
  customer: '',
  divisions: [] 
};

export default function AdminUsersPage() {
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector((state) => state.auth);
  const { items: users = [], status, createStatus, error } = useSelector((state) => state.users || {});
  const { items: customers = [] } = useSelector((state) => state.customers || {});
  const { items: divisions = [] } = useSelector((state) => state.divisions || {});

  // Tab & Filter State
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'order'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Permissions 
  const canManageUsers = ['admin', 'super_admin'].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Fetch all dependencies on mount
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchCustomers()); 
    dispatch(fetchDivisions()); 
  }, [dispatch]);

  // --- Filtering Logic ---
  const filteredUsers = users.filter(user => {
    // 1. Tab & Search Match
    const matchesPortal = user.portal === activeTab;
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Role Match
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // 3. Customer Match (Order Portal Only)
    let matchesCustomer = true;
    if (activeTab === 'order' && customerFilter !== 'all') {
      const uCustId = typeof user.customer === 'object' ? user.customer?._id : user.customer;
      matchesCustomer = uCustId === customerFilter;
    }

    // 4. Division Match (Order Portal Only)
    let matchesDivision = true;
    if (activeTab === 'order' && divisionFilter !== 'all') {
      const userDivIds = user.divisions?.map(d => typeof d === 'object' ? d._id : d) || [];
      matchesDivision = userDivIds.includes(divisionFilter);
    }
    
    return matchesPortal && matchesSearch && matchesRole && matchesCustomer && matchesDivision;
  });

  // Get divisions for the FILTER dropdown (dependent on the selected customer filter)
  const availableDivisionsForFilter = customerFilter === 'all' 
    ? divisions 
    : divisions.filter(d => {
        const cId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
        return cId === customerFilter;
      });

  // Get divisions for the FORM modal (dependent on the selected customer in the form)
  const availableDivisionsForForm = divisions.filter(d => {
    const cId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
    return cId === formData.customer;
  });

  // --- Tab & Filter Handlers ---
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setRoleFilter('all');
    setCustomerFilter('all');
    setDivisionFilter('all');
  };

  const handleCustomerFilterChange = (e) => {
    setCustomerFilter(e.target.value);
    setDivisionFilter('all'); // Reset division filter when customer changes
  };

  // --- Modal & Form Handlers ---
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUserId(user._id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Leave blank when editing to avoid accidental overrides
      portal: user.portal || 'admin',
      role: user.role || 'admin',
      customer: typeof user.customer === 'object' ? user.customer?._id : (user.customer || ''),
      divisions: user.divisions?.map(d => typeof d === 'object' ? d._id : d) || []
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData(INITIAL_FORM_STATE);
    dispatch(clearUserErrors());
  };

  const handlePortalChange = (e) => {
    const newPortal = e.target.value;
    setFormData({
      ...formData,
      portal: newPortal,
      role: newPortal === 'admin' ? 'admin' : 'standard',
      customer: newPortal === 'admin' ? '' : formData.customer,
      divisions: newPortal === 'admin' ? [] : formData.divisions
    });
  };

  const handleCustomerChange = (e) => {
    setFormData({
      ...formData,
      customer: e.target.value,
      divisions: [] // Clear divisions when customer changes
    });
  };

  const handleDivisionToggle = (divId) => {
    setFormData(prev => ({
      ...prev,
      divisions: prev.divisions.includes(divId)
        ? prev.divisions.filter(id => id !== divId)
        : [...prev.divisions, divId]
    }));
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    
    if (formData.portal === 'order') {
      if (!formData.customer) return alert('Users on the Order Portal MUST be assigned to a Customer Account.');
      if (formData.divisions.length === 0) return alert('Please assign at least one division to this user.');
    }
    
    try {
      if (editingUserId) {
        await dispatch(updateUser({ id: editingUserId, ...formData })).unwrap();
      } else {
        await dispatch(createUser(formData)).unwrap();
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to provision/update user:', err);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently revoke access for ${name}?`)) {
      try {
        await dispatch(deleteUser(id)).unwrap();
      } catch (err) {
        alert(`Failed to delete user: ${err}`);
      }
    }
  };

  return (
    <div className="h-full p-6 space-y-6 relative animate-fade-in">
      <PageHeader 
        title="System Users" 
        subtitle="Manage access, roles, and credentials for all COBRA personnel and clients." 
      />

      {/* Tabs & Controls Panel */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col 2xl:flex-row 2xl:items-center gap-4 shadow-sm">
        
        {/* Portal Tabs */}
        <div className="flex bg-slate-100/50 border border-slate-200/60 p-1 rounded-xl w-full sm:w-auto shrink-0">
          <button 
            onClick={() => handleTabChange('admin')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-brand-gold' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck size={14} /> Admin Portal
          </button>
          <button 
            onClick={() => handleTabChange('order')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'order' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building2 size={14} /> Order Portal
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap flex-1 gap-3 items-center">
          
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all"
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Role Filter */}
          <div className="relative w-full sm:w-40 shrink-0">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {activeTab === 'admin' ? (
                <>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </>
              ) : (
                <>
                  <option value="standard">Standard User</option>
                  <option value="manager">Manager</option>
                  <option value="super_user">Super User</option>
                </>
              )}
            </select>
          </div>

          {/* Customer Filter (Order Portal Only) */}
          {activeTab === 'order' && (
            <div className="relative w-full sm:w-48 shrink-0 animate-in fade-in zoom-in-95 duration-200">
              <Building2 className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <select 
                value={customerFilter}
                onChange={handleCustomerFilterChange}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer truncate"
              >
                <option value="all">All Customers</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.customerName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Division Filter (Order Portal Only) */}
          {activeTab === 'order' && (
            <div className="relative w-full sm:w-48 shrink-0 animate-in fade-in zoom-in-95 duration-200">
              <MapPin className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <select 
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer truncate"
              >
                <option value="all">All Divisions</option>
                {availableDivisionsForFilter.map(d => (
                  <option key={d._id} value={d._id}>{d.divisionName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Create Button */}
        {canManageUsers && (
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-md ml-auto whitespace-nowrap shrink-0"
          >
            <UserPlus size={14} /> Provision User
          </button>
        )}
      </div>

      {!canManageUsers && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="text-xs">
            <p className="font-bold text-amber-800">Standard Access</p>
            <p className="text-amber-700 mt-0.5">You can view the directory, but only Command Center Admins can manage users.</p>
          </div>
        </div>
      )}

      {/* User Directory Table */}
      {status === 'loading' && users.length === 0 ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/50 border-b border-slate-200/50 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  {activeTab === 'order' && <th className="px-6 py-4">Assigned Client / Divisions</th>}
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black border shadow-sm ${
                          activeTab === 'admin' ? 'bg-slate-900 text-brand-gold border-slate-800' : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                            <Mail size={12} /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Order Portal Only Data */}
                    {activeTab === 'order' && (
                      <td className="px-6 py-4">
                        {user.customer ? (
                          <div>
                            <p className="font-bold text-slate-800">{typeof user.customer === 'object' ? user.customer.customerName : 'Client ID: ' + user.customer}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-wider">
                              {user.divisions?.length || 0} Division(s) Assigned
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md">Orphaned User</span>
                        )}
                      </td>
                    )}

                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 capitalize bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit Button (Admins & Super Admins) */}
                        {canManageUsers && (
                          <button 
                            onClick={() => handleOpenEditModal(user)}
                            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-gold rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        
                        {/* Delete Button (Super Admins ONLY, cannot delete self) */}
                        {isSuperAdmin && user._id !== currentUser?._id && (
                          <button 
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && canManageUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !createStatus.includes('loading') && handleCloseModal()} />
          
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl">
                  {editingUserId ? <Edit2 size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h2 className="font-black text-slate-900">{editingUserId ? 'Edit User Access' : 'Provision New User'}</h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">System Access Control</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-white flex-1">
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form id="createUserForm" onSubmit={handleSubmitUser} className="space-y-6">
                
                {/* 1. Basic Credentials */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">1. Credentials</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-1">Full Name</label>
                      <div className="relative">
                        <Users size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" placeholder="Jane Doe" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" placeholder="jane@company.com" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1 mb-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Password</label>
                      {editingUserId && <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded">Optional</span>}
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input 
                        type="password" 
                        required={!editingUserId} 
                        minLength={8} 
                        value={formData.password} 
                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" 
                        placeholder={editingUserId ? "Leave blank to keep unchanged" : "Minimum 8 characters"} 
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Access Controls */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">2. Environment & Access</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-1">Portal Environment</label>
                      <select value={formData.portal} onChange={handlePortalChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer text-slate-700">
                        <option value="admin">Admin Portal (Command Center)</option>
                        <option value="order">Order Portal (Client Facing)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-1">Security Role</label>
                      <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer text-slate-700">
                        {formData.portal === 'admin' ? (
                          <>
                            <option value="admin">Standard Admin</option>
                            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                          </>
                        ) : (
                          <>
                            <option value="standard">Standard User</option>
                            <option value="manager">Account Manager</option>
                            <option value="super_user">Super User</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Client Assignments (Order Portal Only) */}
                {formData.portal === 'order' && (
                  <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xs font-black text-brand-gold uppercase tracking-widest border-b border-slate-100 pb-2">3. Client Assignments (Required)</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-1">Customer Account</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3.5 top-3 text-slate-400" />
                        <select 
                          required 
                          value={formData.customer} 
                          onChange={handleCustomerChange} 
                          className="w-full pl-10 pr-4 py-2.5 bg-brand-gold/5 border border-brand-gold/30 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer text-slate-800"
                        >
                          <option value="">Select a customer profile...</option>
                          {customers.map(c => (
                            <option key={c._id} value={c._id}>{c.customerName}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Divisions Multi-Select (Reveals after customer is chosen) */}
                    {formData.customer && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 ml-1">Allowed Divisions</label>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {formData.divisions.length} Selected
                          </span>
                        </div>
                        
                        {availableDivisionsForForm.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                            {availableDivisionsForForm.map(div => (
                              <label key={div._id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${formData.divisions.includes(div._id) ? 'bg-white border-brand-gold shadow-sm' : 'border-transparent hover:bg-slate-100'}`}>
                                <div className="relative flex items-center justify-center w-4 h-4">
                                  <input 
                                    type="checkbox"
                                    className="appearance-none w-4 h-4 border border-slate-300 rounded focus:outline-none cursor-pointer checked:bg-brand-gold checked:border-brand-gold transition-colors"
                                    checked={formData.divisions.includes(div._id)}
                                    onChange={() => handleDivisionToggle(div._id)}
                                  />
                                  {formData.divisions.includes(div._id) && (
                                    <svg className="absolute w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-slate-800 truncate">{div.divisionName}</span>
                                  {div.divisionCode && <span className="text-[9px] font-bold text-slate-400 uppercase">{div.divisionCode}</span>}
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-red-200 bg-red-50 text-center text-xs font-bold text-red-600 flex flex-col items-center gap-2">
                            <MapPin size={16} />
                            No divisions exist for this customer yet.<br/>You must create divisions for this customer before assigning users.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              <button 
                type="submit" 
                form="createUserForm" 
                disabled={createStatus === 'loading'} 
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70"
              >
                {createStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                {editingUserId ? 'Save Changes' : 'Provision Access'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}