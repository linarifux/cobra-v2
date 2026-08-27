import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserPlus, ShieldCheck, Mail, Lock, Building2, 
  BadgeCheck, X, Loader2, AlertCircle, MapPin, Check, 
  User, Users, Briefcase, Edit2, Phone, Home 
} from 'lucide-react';

export default function UserModal({
  isModalOpen,
  handleCloseModal,
  handleSubmitUser,
  formData,
  setFormData,
  editingUserId,
  createStatus,
  error,
  handlePortalChange,
  handleCustomerChange,
  handleDivisionToggle,
  customers,
  availableDivisionsForForm,
  isSuperAdmin
}) {

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
        onClick={() => createStatus !== 'loading' && handleCloseModal()} 
      />
      
      <div className="relative w-full max-w-3xl bg-slate-50/95 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-full border border-white/60">
        
        {/* Modal Header */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 text-brand-gold rounded-2xl shadow-inner">
              {editingUserId ? <Edit2 size={24} /> : <UserPlus size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {editingUserId ? 'Edit User Access' : 'Provision New User'}
              </h2>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">System Access Control</p>
            </div>
          </div>
          <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100 flex items-start gap-3 shadow-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <form id="createUserForm" onSubmit={handleSubmitUser} className="space-y-8">
            
            {/* 1. Basic Credentials */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14}/> 1. Identity & Credentials
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Full Name</label>
                  <div className="relative">
                    <Users size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      required 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                      placeholder="Jane Doe" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      required 
                      type="email" 
                      value={formData.email || ''} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                      placeholder="jane@company.com" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Secure Password</label>
                    {editingUserId && <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">Optional</span>}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="password" 
                      required={!editingUserId} 
                      minLength={8} 
                      value={formData.password || ''} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                      placeholder={editingUserId ? "Leave blank to keep current" : "Minimum 8 characters"} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Phone Number</label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Optional</span>
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      type="tel" 
                      value={formData.phone || ''} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                      placeholder="+1 (555) 000-0000" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Address Details */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Home size={14}/> 2. Primary Address
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Street Address 1</label>
                  <input 
                    type="text" 
                    value={formData.address?.street1 || ''} 
                    onChange={(e) => setFormData({...formData, address: {...(formData.address || {}), street1: e.target.value}})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="123 Main St" 
                  />
                </div>
                
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Street Address 2</label>
                  <input 
                    type="text" 
                    value={formData.address?.street2 || ''} 
                    onChange={(e) => setFormData({...formData, address: {...(formData.address || {}), street2: e.target.value}})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="Apt, Suite, Unit, etc. (Optional)" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">City</label>
                  <input 
                    type="text" 
                    value={formData.address?.city || ''} 
                    onChange={(e) => setFormData({...formData, address: {...(formData.address || {}), city: e.target.value}})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="City" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">State / Province</label>
                  <input 
                    type="text" 
                    value={formData.address?.state || ''} 
                    onChange={(e) => setFormData({...formData, address: {...(formData.address || {}), state: e.target.value}})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="State (e.g. NY)" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Zip / Postal Code</label>
                  <input 
                    type="text" 
                    value={formData.address?.zipCode || ''} 
                    onChange={(e) => setFormData({...formData, address: {...(formData.address || {}), zipCode: e.target.value}})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="Zip Code" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Country</label>
                  <input 
                    type="text" 
                    value={formData.address?.country || 'US'} 
                    onChange={(e) => setFormData({...formData, address: {...(formData.address || {}), country: e.target.value}})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" 
                    placeholder="Country (e.g. US)" 
                  />
                </div>

              </div>
            </div>

            {/* 3. Access Controls */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14}/> 3. Environment & Access
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Portal Environment</label>
                  <select 
                    value={formData.portal || 'admin'} 
                    onChange={handlePortalChange} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold cursor-pointer text-slate-700 transition-all"
                  >
                    <option value="admin">Admin Portal (Command Center)</option>
                    <option value="order">Order Portal (Client Facing)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Security Role</label>
                  <select 
                    value={formData.role || 'admin'} 
                    onChange={(e) => setFormData({...formData, role: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold cursor-pointer text-slate-700 transition-all"
                  >
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

            {/* 4. Client Assignments (Order Portal Only) */}
            {formData.portal === 'order' && (
              <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-5 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Building2 size={14}/> 4. Client Assignments
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Customer Dropdown */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1.5">
                      Customer Account <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-4 top-3.5 text-blue-400" />
                      <select 
                        required 
                        value={formData.customer || ''} 
                        onChange={handleCustomerChange} 
                        className="w-full pl-11 pr-4 py-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-800 transition-all appearance-none"
                      >
                        <option value="">Select a customer profile...</option>
                        {customers.map(c => (
                          <option key={c._id} value={c._id}>{c.customerName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Charge Code (Optional) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Charge Code</label>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Optional</span>
                    </div>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-4 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        value={formData.chargeCode || ''} 
                        onChange={(e) => setFormData({...formData, chargeCode: e.target.value})} 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" 
                        placeholder="e.g. CHG-90210" 
                      />
                    </div>
                  </div>
                </div>

                {/* Divisions Multi-Select (Reveals after customer is chosen) */}
                {formData.customer && (
                  <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400"/> Allowed Divisions
                      </label>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm">
                        {formData.divisions.length} Selected
                      </span>
                    </div>
                    
                    {availableDivisionsForForm.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {availableDivisionsForForm.map(div => (
                          <label key={div._id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border shadow-sm ${formData.divisions.includes(div._id) ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
                            <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                              <input 
                                type="checkbox"
                                className="appearance-none w-5 h-5 border-2 border-slate-300 rounded-md focus:outline-none cursor-pointer checked:bg-blue-600 checked:border-blue-600 transition-colors"
                                checked={formData.divisions.includes(div._id)}
                                onChange={() => handleDivisionToggle(div._id)}
                              />
                              {formData.divisions.includes(div._id) && (
                                <Check size={14} className="absolute text-white pointer-events-none" strokeWidth={4} />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-800 truncate">{div.divisionName}</span>
                              {div.divisionCode && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{div.divisionCode}</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 text-center text-xs font-bold text-amber-600 flex flex-col items-center gap-2">
                        <MapPin size={20} className="opacity-50 text-amber-500" />
                        <p>No divisions exist for this customer yet.</p>
                        <p className="text-[10px] font-medium text-amber-600 mt-1">
                          You can provision this user now and assign divisions later.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-[2rem] z-10">
          <button 
            type="button" 
            onClick={handleCloseModal} 
            className="px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="createUserForm" 
            disabled={createStatus === 'loading'} 
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-brand-gold px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 active:scale-95"
          >
            {createStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
            {editingUserId ? 'Save Changes' : 'Provision Access'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}