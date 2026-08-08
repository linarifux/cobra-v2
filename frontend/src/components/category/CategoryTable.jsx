import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, FolderTree, ChevronRight, Layers } from 'lucide-react';

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

  // Recursively trace the parent IDs to build the full premium breadcrumb lineage
  const renderCategoryTree = (cat) => {
    if (!cat.parentId || cat.parentId === 'None') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 text-slate-500 text-[11px] font-bold border border-slate-200/60 shadow-sm w-max">
          <FolderTree size={12} className="text-slate-400"/> Top Level Node
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
            <span className="text-slate-500 text-[11px] font-bold tracking-tight bg-white/50 px-2 py-1 rounded-md border border-slate-100 shadow-sm">{p}</span>
            <ChevronRight size={12} className="text-slate-300 stroke-[3]" />
          </React.Fragment>
        ))}
        <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-black text-[11px] tracking-tight border border-blue-200/60 shadow-sm w-max">
          {cat.name}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[900px] border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-200/60 backdrop-blur-xl">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Category Name</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%] text-center">Depth</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[35%]">Full Category Tree</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[25%]">Assigned Division</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            <AnimatePresence mode="popLayout">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                    key={cat.id} 
                    className="hover:bg-white/60 transition-colors duration-200 group"
                  >
                    <td className="px-6 py-4 font-black text-sm text-slate-900 tracking-tight">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center h-7 w-7 bg-white border border-slate-200/80 rounded-full text-[11px] font-black text-slate-600 shadow-sm">
                        {cat.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {renderCategoryTree(cat)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center bg-white border border-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm truncate max-w-full">
                        {cat.division || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(cat)} 
                          className="p-2 text-slate-400 hover:text-blue-600 bg-white/50 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                          title="Edit Category Structural Matrix"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(cat.id)} 
                          className="p-2 text-slate-400 hover:text-red-600 bg-white/50 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
                          title="Remove Category Node"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan="5" className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 bg-white/60 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-200/60">
                        <Layers className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-black text-slate-900">No categories found</p>
                      <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm">
                        Adjust your active search filters or verify your assigned permissions to locate taxonomy nodes.
                      </p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}