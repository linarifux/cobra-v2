import React from 'react';
import { User, Package, Tag, Edit2, Trash2, ToggleLeft, ToggleRight, Check, X, Building } from 'lucide-react';

export default function DivisionCard({ 
  div, 
  isEditing, 
  editFormData, 
  setEditFormData, 
  staffList, 
  customersList,
  onStartEdit, 
  onCancelEdit, 
  onSaveEdit, 
  onToggleStatus, 
  onDelete 
}) {
  return (
    <div className={`border rounded-3xl p-5 bg-white/40 backdrop-blur-xl transition-all duration-300 shadow-sm flex flex-col justify-between ${div.status === 'Active' ? 'border-white/60 hover:shadow-md' : 'border-white/30 opacity-60'}`}>
      <div>
        {isEditing ? (
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 pl-1 mb-1 block tracking-wider">Assigned Customer</label>
              <select 
                value={editFormData.customer}
                onChange={e => setEditFormData({...editFormData, customer: e.target.value})}
                className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs outline-none font-semibold focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 cursor-pointer"
              >
                {customersList.map(cust => (
                  <option key={cust._id} value={cust._id}>{cust.customerName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 pl-1 mb-1 block tracking-wider">Internal Code</label>
                <input 
                  type="text"
                  value={editFormData.code}
                  onChange={e => setEditFormData({...editFormData, code: e.target.value})}
                  className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 pl-1 mb-1 block tracking-wider">Division Name</label>
                <input 
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="min-w-0">
              <span className="inline-block text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest bg-white/50 border border-slate-200/60 px-2 py-0.5 rounded-md mb-1.5 shadow-sm">
                {div.code}
              </span>
              <h4 className="font-black text-slate-900 text-sm truncate pr-2">{div.name}</h4>
            </div>
            <span className={`shrink-0 px-2.5 py-1 text-[9px] font-black rounded-full tracking-wide uppercase border ${div.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {div.status}
            </span>
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-slate-200/50 text-xs text-slate-600">
          
          <div className="flex items-center gap-2.5 font-medium min-h-[32px]">
            <div className="w-6 h-6 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0 border border-brand-gold/20">
              <Building size={12} className="text-brand-gold" />
            </div>
            <span className="w-full truncate flex items-center">
              <span className="text-slate-400 font-bold mr-1 shrink-0">Client:</span>
              <strong className="text-slate-900 font-black truncate bg-white/60 border border-slate-200/60 px-2 py-0.5 rounded-lg text-[10px] shadow-sm ml-1">
                {div.customerName}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-medium min-h-[32px]">
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <User size={12} className="text-slate-400" />
            </div>
            <span className="w-full truncate">
              <span className="text-slate-400 font-bold mr-1">Head:</span>
              {isEditing ? (
                <select
                  value={editFormData.manager}
                  onChange={e => setEditFormData({...editFormData, manager: e.target.value})}
                  className="px-2 py-1 bg-white/60 border border-slate-200 rounded-lg text-xs outline-none font-semibold focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {staffList.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              ) : (
                <strong className="text-slate-800 font-bold">{div.manager || 'Unassigned'}</strong>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-medium bg-white/30 p-2 rounded-xl border border-white/40">
            <Package size={14} className="text-slate-400 shrink-0" />
            <span className="flex-1">Inventory Items:</span>
            <strong className="text-slate-900 font-mono font-black">{div.inventory}</strong>
          </div>
          
          <div className="flex items-center gap-2.5 font-medium bg-white/30 p-2 rounded-xl border border-white/40">
            <Tag size={14} className="text-slate-400 shrink-0" />
            <span className="flex-1">Total Categories:</span>
            <strong className="text-slate-900 font-black bg-white/60 border border-slate-200/60 px-2 py-0.5 rounded-lg text-[10px] shadow-sm">
              {div.categoryCount}
            </strong>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 mt-5 border-t border-slate-200/60">
        {isEditing ? (
          <div className="flex items-center gap-3 w-full justify-end">
            <button 
              type="button"
              onClick={onCancelEdit}
              className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors shadow-sm"
            >
              <X size={12} /> Cancel
            </button>
            <button 
              type="button"
              onClick={() => onSaveEdit(div.id)}
              className="flex items-center gap-1.5 text-[10px] font-black text-white bg-slate-900 hover:bg-slate-800 px-4 py-1.5 rounded-xl uppercase tracking-wider transition-colors shadow-md"
            >
              <Check size={12} /> Save
            </button>
          </div>
        ) : (
          <>
            <button 
              type="button"
              onClick={() => onToggleStatus(div.id)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors bg-white/40 px-2.5 py-1.5 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-slate-200"
            >
              {div.status === 'Active' ? (
                <>
                  <ToggleRight size={16} className="text-emerald-500" /> Deactivate
                </>
              ) : (
                <>
                  <ToggleLeft size={16} className="text-slate-400" /> Activate
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={() => onStartEdit(div)}
                className="p-2 text-slate-400 hover:text-brand-gold bg-white/40 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                title="Edit Division"
              >
                <Edit2 size={14} />
              </button>
              <button 
                type="button"
                onClick={() => onDelete(div.id)}
                className="p-2 text-slate-400 hover:text-red-500 bg-white/40 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm border border-transparent"
                title="Remove Division"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}