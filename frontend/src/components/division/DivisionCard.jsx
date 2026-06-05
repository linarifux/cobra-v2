import React from 'react';
import { User, Package, Tag, Edit2, Trash2, ToggleLeft, ToggleRight, Check, X } from 'lucide-react';

export default function DivisionCard({ 
  div, 
  isEditing, 
  editFormData, 
  setEditFormData, 
  staffList, 
  onStartEdit, 
  onCancelEdit, 
  onSaveEdit, 
  onToggleStatus, 
  onDelete 
}) {
  return (
    <div className={`border rounded-2xl p-4 bg-white/50 backdrop-blur-sm transition-all shadow-sm flex flex-col justify-between ${div.status === 'Active' ? 'border-slate-200/80 hover:border-slate-400' : 'border-slate-200/40 opacity-60'}`}>
      <div>
        {isEditing ? (
          <div className="space-y-3 mb-3">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400">Code</label>
              <input 
                type="text"
                value={editFormData.code}
                onChange={e => setEditFormData({...editFormData, code: e.target.value})}
                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400">Division Name</label>
              <input 
                type="text"
                value={editFormData.name}
                onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start gap-2 mb-2">
            <div>
              <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">{div.code}</span>
              <h4 className="font-black text-slate-900 text-sm mt-1">{div.name}</h4>
            </div>
            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full tracking-wide uppercase ${div.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {div.status}
            </span>
          </div>
        )}

        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium min-h-[28px]">
            <User size={13} className="text-slate-400 shrink-0" />
            <span className="w-full">
              Head:{' '}
              {isEditing ? (
                <select
                  value={editFormData.manager}
                  onChange={e => setEditFormData({...editFormData, manager: e.target.value})}
                  className="px-2 py-0.5 border border-slate-300 rounded-md text-xs outline-none bg-white font-semibold"
                >
                  {staffList.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              ) : (
                <strong className="text-slate-800 font-bold">{div.manager || 'Unassigned'}</strong>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <Package size={13} className="text-slate-400" />
            <span>Inventory Items: <strong className="text-slate-900 font-mono font-bold">{div.inventory}</strong></span>
          </div>
          
          <div className="flex items-center gap-2 font-medium">
            <Tag size={13} className="text-slate-400" />
            <span>Total Categories: <strong className="text-slate-900 font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]">{div.categoryCount}</strong></span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100/60">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full justify-end">
            <button 
              type="button"
              onClick={onCancelEdit}
              className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider"
            >
              <X size={12} /> Cancel
            </button>
            <button 
              type="button"
              onClick={() => onSaveEdit(div.id)}
              className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg uppercase tracking-wider"
            >
              <Check size={12} /> Save
            </button>
          </div>
        ) : (
          <>
            <button 
              type="button"
              onClick={() => onToggleStatus(div.id)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
            >
              {div.status === 'Active' ? (
                <>
                  <ToggleRight size={18} className="text-emerald-500" /> Deactivate
                </>
              ) : (
                <>
                  <ToggleLeft size={18} className="text-slate-400" /> Activate
                </>
              )}
            </button>

            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={() => onStartEdit(div)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                title="Edit Division Information"
              >
                <Edit2 size={13} />
              </button>
              <button 
                type="button"
                onClick={() => onDelete(div.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Remove Division"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}