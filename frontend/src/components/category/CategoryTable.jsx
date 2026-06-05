import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

export default function CategoryTable({ filteredCategories, onEdit, onDelete }) {
  return (
    <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-black/5">
            <tr>
              <th className="p-5 text-xs font-black uppercase text-slate-500">Category Name</th>
              <th className="p-5 text-xs font-black uppercase text-slate-500">Hierarchy Depth</th>
              <th className="p-5 text-xs font-black uppercase text-slate-500">Parent Category</th>
              <th className="p-5 text-xs font-black uppercase text-slate-500">Division Branch Mapping</th>
              <th className="p-5 text-xs font-black uppercase text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-white/30 transition-colors">
                  <td className="p-5 font-bold text-slate-900">{cat.name}</td>
                  <td className="p-5">
                    <span className="bg-white px-2.5 py-1 rounded-lg text-xs font-black border border-white/50 text-slate-600">Lvl {cat.level}</span>
                  </td>
                  <td className="p-5 font-bold text-slate-500">{cat.parent}</td>
                  <td className="p-5 text-sm">
                    <span className="bg-slate-100/80 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                      {cat.division || 'Unassigned'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex justify-end items-center gap-1">
                      <button 
                        onClick={() => onEdit(cat)} 
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit Category Structural Matrix"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => { if(confirm("Are you sure you want to delete this category hierarchy mapping?")) onDelete(cat.id); }} 
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                <td colSpan="5" className="p-10 text-center font-semibold text-slate-400 text-sm">
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