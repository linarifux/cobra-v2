import React from 'react';
import { ShieldCheck, Building2, Search, Filter, MapPin, UserPlus } from 'lucide-react';

export default function UserControls({
  activeTab,
  handleTabChange,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  customerFilter,
  handleCustomerFilterChange,
  divisionFilter,
  setDivisionFilter,
  customers,
  availableDivisionsForFilter,
  canManageUsers,
  handleOpenCreateModal,
  isSuperAdmin
}) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col 2xl:flex-row 2xl:items-center gap-4 shadow-sm">
      
      {/* Portal Tabs */}
      <div className="flex bg-slate-100/50 border border-slate-200/60 p-1 rounded-xl w-full sm:w-auto shrink-0 shadow-inner">
        <button 
          onClick={() => handleTabChange('admin')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'admin' ? 'bg-white shadow-md text-brand-gold border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShieldCheck size={14} /> Admin Portal
        </button>
        <button 
          onClick={() => handleTabChange('order')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'order' ? 'bg-white shadow-md text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 size={14} /> Order Portal
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap flex-1 gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
          <input 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-bold text-slate-700 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all shadow-sm"
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer shadow-sm transition-all focus:border-brand-gold"
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
          <div className="relative w-full sm:w-48 shrink-0 animate-in fade-in duration-300">
            <Building2 className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <select 
              value={customerFilter}
              onChange={handleCustomerFilterChange}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer truncate shadow-sm transition-all focus:border-brand-gold"
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
          <div className="relative w-full sm:w-48 shrink-0 animate-in fade-in duration-300">
            <MapPin className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <select 
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer truncate shadow-sm transition-all focus:border-brand-gold"
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
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 ml-auto whitespace-nowrap shrink-0 active:scale-95"
        >
          <UserPlus size={14} /> Provision User
        </button>
      )}
    </div>
  );
}