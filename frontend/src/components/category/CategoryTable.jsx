import React, { useMemo } from 'react';
import { Edit2, Trash2, FolderTree, ChevronRight } from 'lucide-react';

export default function CategoryTable({ filteredCategories, allCategories = [], onEdit, onDelete }) {
  
  // Create a rapid lookup map for building deep recursive category trees
  const categoryMap = useMemo(() => {
    const map = {};
    
    // Map raw DB categories if provided (allows perfect pathing even when a parent is filtered out of view)
    allCategories.forEach(c => {
      const pId = typeof c.parentCategory === 'object' && c.parentCategory !== null 
        ? c.parentCategory._id 
        : c.parentCategory;
      map[c._id] = { name: c.categoryName, parentId: pId };
    });
    
    // Fallback mapping from the local filtered categories array
    filteredCategories.forEach(c => {
      if (!map[c.id]) {
        map[c.id] = { name: c.name, parentId: c.parentId !== 'None' ? c.parentId : null };
      }
    });
    
    return map;
  }, [allCategories, filteredCategories]);

  // Recursively trace the parent IDs to build the full breadcrumb lineage
  const renderCategoryTree = (cat) => {
    if (!cat.parentId || cat.parentId === 'None') {
      return (
        <span className="text-slate-400 font-semibold italic flex items-center gap-1.5">
          <FolderTree size={14} className="text-slate-300"/> Top Level Node
        </span>
      );
    }
    
    let path = [];
    let currentParentId = cat.parentId;
    let depth = 0;

    // Build path recursively up to 10 levels deep
    while (currentParentId && currentParentId !== 'None' && depth < 10) {
      const parentNode = categoryMap[currentParentId];
      if (parentNode) {
        path.unshift(parentNode.name);
        currentParentId = parentNode.parentId;
      } else {
        // If missing in map, use the immediate parent string as a safe fallback
        if (path.length === 0 && cat.parent && cat.parent !== 'None') {
          path.unshift(cat.parent);
        }
        break;
      }
      depth++;
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {path.map((p, idx) => (
          <React.Fragment key={`path-${cat.id}-${idx}`}>
            <span className="text-slate-400 text-xs font-semibold tracking-tight">{p}</span>
            <ChevronRight size={10} className="text-slate-300 stroke-[3]" />
          </React.Fragment>
        ))}
        <span className="text-brand-gold font-black text-sm tracking-tight">{cat.name}</span>
      </div>
    );
  };

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-white/20 border-b border-white/40">
            <tr>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[20%]">Category Name</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[10%]">Hierarchy Depth</th>
              <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[35%]">Full Category Tree</th>
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
                  <td className="p-5">
                    {renderCategoryTree(cat)}
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