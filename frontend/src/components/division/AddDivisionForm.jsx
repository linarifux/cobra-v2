import React from 'react';
import { Loader2, X } from 'lucide-react';

export default function AddDivisionForm({ 
  newDivision, 
  setNewDivision, 
  onSubmit, 
  staffList = [], 
  customersList = [], 
  isSubmitting,
  onCancel 
}) {
  const inputClass = "w-full px-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition-all disabled:opacity-50";

  // Handlers for Multi-Select Staff Array
  const handleAddManager = (userId) => {
    if (!userId || newDivision.managers.includes(userId)) return;
    setNewDivision(prev => ({ ...prev, managers: [...prev.managers, userId] }));
  };

  const handleRemoveManager = (userId) => {
    setNewDivision(prev => ({ ...prev, managers: prev.managers.filter(id => id !== userId) }));
  };

  return (
    <form onSubmit={onSubmit} className="bg-white/60 backdrop-blur-md border border-slate-200/80 p-6 rounded-[2rem] shadow-sm space-y-5">
      
      {onCancel ? (
        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Identity</h4>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-3">Core Identity</h4>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {customersList.length > 0 && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Assigned Customer <span className="text-red-400">*</span>
            </label>
            <select 
              value={newDivision.customer || ''}
              onChange={e => setNewDivision({...newDivision, customer: e.target.value})}
              className={`${inputClass} cursor-pointer`}
              required
              disabled={isSubmitting}
            >
              <option value="" disabled>Select Customer...</option>
              {customersList.map(cust => (
                <option key={cust._id} value={cust._id}>{cust.customerName}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
            Division Name <span className="text-red-400">*</span>
          </label>
          <input 
            type="text" 
            placeholder="e.g. Animal Nutrition"
            value={newDivision.divisionName}
            onChange={e => setNewDivision({...newDivision, divisionName: e.target.value})}
            className={inputClass}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
            Internal Code <span className="text-red-400">*</span>
          </label>
          <input 
            type="text" 
            placeholder="e.g. DIV-ANM"
            value={newDivision.divisionCode}
            onChange={e => setNewDivision({...newDivision, divisionCode: e.target.value})}
            className={`${inputClass} font-mono uppercase`}
            required
            disabled={isSubmitting}
          />
        </div>
        
        {/* MULTI-SELECT FOR MANAGERS/STAFF */}
        <div className="col-span-1 md:col-span-3 xl:col-span-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
            Authorized Staff
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {newDivision.managers.map(userId => {
              const staff = staffList.find(s => String(s._id) === userId);
              if (!staff) return null;
              return (
                <span key={userId} className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold shadow-sm">
                  {staff.name}
                  <X size={12} className="cursor-pointer hover:text-red-500 transition-colors text-slate-400" onClick={() => handleRemoveManager(userId)} />
                </span>
              );
            })}
          </div>
          <select 
            value=""
            onChange={e => handleAddManager(e.target.value)}
            className={`${inputClass} cursor-pointer`}
            disabled={isSubmitting}
          >
            <option value="">+ Assign Staff Member...</option>
            {staffList.filter(s => !newDivision.managers.includes(String(s._id))).map(member => (
              <option key={member._id} value={member._id}>{member.name}</option>
            ))}
          </select>
        </div>
      </div>

      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2 pt-2 border-b border-slate-100 mb-3">Contact & Regional Data</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Contact Name</label>
          <input type="text" placeholder="John Doe" value={newDivision.contactName} onChange={e => setNewDivision({...newDivision, contactName: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Email Address</label>
          <input type="email" placeholder="john@example.com" value={newDivision.contactEmail} onChange={e => setNewDivision({...newDivision, contactEmail: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Phone Number</label>
          <input type="text" placeholder="+1 (555) 000-0000" value={newDivision.contactNumber} onChange={e => setNewDivision({...newDivision, contactNumber: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Address Line 1</label>
          <input type="text" placeholder="123 Corporate Blvd" value={newDivision.line1} onChange={e => setNewDivision({...newDivision, line1: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Address Line 2</label>
          <input type="text" placeholder="Suite 400" value={newDivision.line2} onChange={e => setNewDivision({...newDivision, line2: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">City</label>
          <input type="text" placeholder="New York" value={newDivision.city} onChange={e => setNewDivision({...newDivision, city: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">State / Region</label>
          <input type="text" placeholder="NY" value={newDivision.state} onChange={e => setNewDivision({...newDivision, state: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Zip Code</label>
          <input type="text" placeholder="10001" value={newDivision.zip} onChange={e => setNewDivision({...newDivision, zip: e.target.value})} disabled={isSubmitting} className={inputClass} />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="flex justify-center items-center w-full bg-slate-900 hover:bg-slate-800 text-brand-gold font-black text-xs uppercase rounded-xl py-2.5 tracking-wider transition-colors shadow-md disabled:opacity-70 h-[36px]"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
        </button>
      </div>
    </form>
  );
}