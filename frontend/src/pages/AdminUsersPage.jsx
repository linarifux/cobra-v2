import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Users, UserPlus, ShieldCheck, Mail, Lock, 
  Building2, BadgeCheck, X, Loader2, AlertCircle, Trash2, 
  Search
} from 'lucide-react';

import { fetchUsers, createUser, deleteUser, clearUserErrors } from '../store/slices/userSlice';
// Make sure you have this action in your customerSlice to fetch the dropdown list
import { fetchCustomers } from '../store/slices/customerSlice'; 
import PageHeader from '../components/PageHeader';

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  password: '',
  portal: 'admin',
  role: 'admin',
  customer: ''
};

export default function AdminUsersPage() {
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector((state) => state.auth);
  const { items: users = [], status, createStatus, error } = useSelector((state) => state.users || {});
  const { items: customers = [] } = useSelector((state) => state.customers || {});

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchCustomers()); // Load customers for the Order Portal dropdown
  }, [dispatch]);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamically change roles based on selected portal
  const handlePortalChange = (e) => {
    const newPortal = e.target.value;
    setFormData({
      ...formData,
      portal: newPortal,
      role: newPortal === 'admin' ? 'admin' : 'standard',
      customer: newPortal === 'admin' ? '' : formData.customer
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Safety check for order portal requirements
    if (formData.portal === 'order' && !formData.customer) {
      return alert('Users on the Order Portal MUST be assigned to a Customer Account.');
    }
    
    try {
      await dispatch(createUser(formData)).unwrap();
      setFormData(INITIAL_FORM_STATE);
      setIsModalOpen(false);
      dispatch(clearUserErrors());
    } catch (err) {
      console.error('Failed to provision user:', err);
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

      {/* Control Panel */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {isSuperAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-md ml-auto"
          >
            <UserPlus size={14} /> Provision User
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="text-xs">
            <p className="font-bold text-amber-800">Standard Access</p>
            <p className="text-amber-700 mt-0.5">You can view the directory, but only Super Admins can provision or remove users.</p>
          </div>
        </div>
      )}

      {/* User Directory Table */}
      {status === 'loading' && users.length === 0 ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : status === 'failed' ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center text-sm font-bold border border-red-200">
          Failed to load directory: {error}
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/50 border-b border-slate-200/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Portal Access</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black border ${
                          user.portal === 'admin' ? 'bg-slate-900 text-brand-gold border-slate-800' : 'bg-white text-slate-600 border-slate-200 shadow-sm'
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        user.portal === 'admin' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {user.portal === 'admin' ? <ShieldCheck size={12} /> : <Building2 size={12} />}
                        {user.portal}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isSuperAdmin && user._id !== currentUser?._id && (
                        <button 
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Revoke Access"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !createStatus.includes('loading') && setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Provision New User</h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">System Access Control</p>
                </div>
              </div>
              <button onClick={() => { setIsModalOpen(false); dispatch(clearUserErrors()); }} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form id="createUserForm" onSubmit={handleCreateUser} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Full Name</label>
                    <div className="relative">
                      <Users size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" placeholder="Jane Doe" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" placeholder="jane@company.com" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Temporary Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input required type="password" minLength={8} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" placeholder="Minimum 8 characters" />
                  </div>
                </div>

                <div className="h-px bg-slate-200/60 my-2"></div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Portal Environment</label>
                    <select value={formData.portal} onChange={handlePortalChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer text-slate-700">
                      <option value="admin">Admin Portal (Command Center)</option>
                      <option value="order">Order Portal (Client Facing)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Security Role</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer text-slate-700">
                      {formData.portal === 'admin' ? (
                        <>
                          <option value="admin">Standard Admin</option>
                          <option value="super_admin">Super Admin</option>
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

                {/* Conditional Field: Order Portal Users MUST be assigned to a Customer */}
                {formData.portal === 'order' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-brand-gold ml-1">Assign to Customer Account *</label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <select 
                        required 
                        value={formData.customer} 
                        onChange={(e) => setFormData({...formData, customer: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2.5 bg-brand-gold/5 border border-brand-gold/30 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer text-slate-700"
                      >
                        <option value="">Select a customer profile...</option>
                        {customers.map(c => (
                          <option key={c._id} value={c._id}>{c.customerName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              <button 
                type="submit" 
                form="createUserForm" 
                disabled={createStatus === 'loading'} 
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70"
              >
                {createStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                Provision Access
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}