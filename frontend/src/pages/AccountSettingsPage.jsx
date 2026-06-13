import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  User, Mail, Lock, ShieldCheck, Save, 
  KeyRound, Bell, Activity, Smartphone
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function AccountSettingsPage() {
  // Pull current user from Redux
  const { user } = useSelector((state) => state.auth || {});

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert('Profile updated successfully! (API integration pending)');
    }, 1000);
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      return alert('New passwords do not match!');
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert('Password updated successfully! (API integration pending)');
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 1000);
  };

  return (
    <div className="h-full p-6 space-y-6 relative animate-fade-in">
      <PageHeader 
        title="Account Management" 
        subtitle="Manage your personal profile, security preferences, and active sessions." 
      />

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-md' : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-white/60'}`}
          >
            <User size={18} /> Personal Profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-slate-900 text-white shadow-md' : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-white/60'}`}
          >
            <KeyRound size={18} /> Security & Passwords
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'sessions' ? 'bg-slate-900 text-white shadow-md' : 'bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-white/60'}`}
          >
            <Activity size={18} /> Active Sessions
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white/40 backdrop-blur-2xl border border-white/60 p-6 sm:p-8 rounded-3xl shadow-sm">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200/50">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 flex items-center justify-center shadow-lg border border-slate-800">
                  <User size={32} className="text-brand-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{user?.name || 'Administrator'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {user?.role ? user.role.replace('_', ' ') : 'System Manager'}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-5 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Corporate Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-gold/20 disabled:opacity-70"
                  >
                    <Save size={16} />
                    {isLoading ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="mb-8 pb-6 border-b border-slate-200/50">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Update Password</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
              </div>

              <form onSubmit={handlePasswordSave} className="space-y-5 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
                      className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">New Password</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        minLength={8}
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
                        className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Confirm New Password</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400" />
                      <input 
                        type="password" 
                        required
                        minLength={8}
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
                        className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70"
                  >
                    <Lock size={16} />
                    {isLoading ? 'Updating...' : 'Update Secure Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SESSIONS TAB (Static Design Example) */}
          {activeTab === 'sessions' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="mb-8 pb-6 border-b border-slate-200/50 flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Sessions</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">Devices currently logged into your account.</p>
                </div>
                <button className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                  Log out all other devices
                </button>
              </div>

              <div className="space-y-3">
                {/* Current Device */}
                <div className="flex items-center justify-between p-4 bg-white/60 border border-brand-gold/30 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-brand-gold/10 text-brand-gold rounded-xl">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">MacBook Pro (Chrome)</p>
                      <p className="text-xs font-medium text-slate-500">Dhaka, Bangladesh • IP: 192.168.1.1</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                    Current Session
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}