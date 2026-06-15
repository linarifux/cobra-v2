import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function CategoryTable({ filteredCategories, onEdit, onDelete }) {
  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-white/20 border-b border-white/40">
            <tr>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[25%]">Category Name</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[15%]">Hierarchy Depth</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[25%]">Parent Category</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[25%]">Division Branch Mapping</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-white/50 transition-colors group">
                  <td className="p-5 font-black text-sm text-slate-900 tracking-tight">
                    {cat.name}
                  </td>
                  <td className="p-5">
                    <span className="inline-block bg-white/80 border border-slate-200/60 px-3 py-1 rounded-xl text-[11px] font-black text-slate-700 shadow-sm">
                      Lvl {cat.level}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-slate-500 text-sm">
                    {cat.parent === 'None' ? (
                      <span className="text-slate-400 font-semibold italic">None</span>
                    ) : (
                      cat.parent
                    )}
                  </td>
                  <td className="p-5">
                    <span className="inline-block bg-white/60 border border-slate-200/60 text-slate-800 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm">
                      {cat.division || 'Unassigned'}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(cat)} 
                        className="p-2 text-slate-400 hover:text-brand-gold bg-white/40 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        title="Edit Category Structural Matrix"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(cat.id)} 
                        className="p-2 text-slate-400 hover:text-red-500 bg-white/40 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm border border-transparent"
                        title="Remove Category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-12 text-center font-bold text-slate-500 text-sm bg-white/10">
                  No categories found matching your selected search filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}