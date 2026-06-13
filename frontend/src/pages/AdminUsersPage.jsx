import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ShieldAlert, ShieldCheck, Plus, Search, 
  Trash2, Mail, Loader2, X, AlertCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { fetchAdminUsers, createAdminUser, deleteAdminUser } from '../store/slices/userSlice';

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  password: '',
  role: 'admin' // Default to standard admin
};

export default function AdminUsersPage() {
  const dispatch = useDispatch();
  
  // Get current logged-in user from auth slice to check permissions
  const { user: currentUser } = useSelector((state) => state.auth);
  const { items: users = [], status, error } = useSelector((state) => state.users || {});

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;
    
    setIsSubmitting(true);
    try {
      await dispatch(createAdminUser(formData)).unwrap();
      setFormData(INITIAL_FORM_STATE);
      setIsModalOpen(false);
    } catch (err) {
      alert(`Failed to create admin: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently revoke access for ${name}?`)) {
      try {
        await dispatch(deleteAdminUser(id)).unwrap();
      } catch (err) {
        alert(`Failed to delete user: ${err}`);
      }
    }
  };

  return (
    <div className="h-full p-6 space-y-6 relative animate-fade-in">
      <PageHeader 
        title="Internal Staff & Admins" 
        subtitle="Manage COBRA command center personnel and security access." 
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
            <Plus size={14} /> Invite Admin
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="text-xs">
            <p className="font-bold text-amber-800">Standard Access</p>
            <p className="text-amber-700 mt-0.5">You can view the directory, but only Super Admins can invite or remove internal staff.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user) => (
            <div key={user._id} className="bg-white/60 backdrop-blur-md border border-white/60 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all relative group">
              
              {/* Delete Button (Only visible to Super Admins, and they can't delete themselves) */}
              {isSuperAdmin && user._id !== currentUser?._id && (
                <button 
                  onClick={() => handleDeleteUser(user._id, user.name)}
                  className="absolute top-4 right-4 p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Revoke Access"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border ${
                  user.role === 'super_admin' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {user.role === 'super_admin' ? (
                    <ShieldCheck size={24} className="text-brand-gold" />
                  ) : (
                    <ShieldAlert size={24} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight leading-tight">{user.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-1 ${
                    user.role === 'super_admin' ? 'bg-brand-gold/10 text-brand-gold' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white/50 p-2 rounded-xl">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-black text-slate-900">Invite Personnel</h2>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Admin Portal Access</p>
              </div>
              <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-lg border border-slate-200">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Full Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" 
                  placeholder="Jane Doe" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Corporate Email</label>
                <input 
                  required 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" 
                  placeholder="jane@cobra.com" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Temporary Password</label>
                <input 
                  required 
                  type="password" 
                  minLength={8}
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:bg-white transition-all" 
                  placeholder="Minimum 8 characters" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Access Level</label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-gold cursor-pointer"
                >
                  <option value="admin">Standard Admin (View & Edit)</option>
                  <option value="super_admin">Super Admin (Full Control & Deletion)</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md mt-6 disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Grant Access'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}