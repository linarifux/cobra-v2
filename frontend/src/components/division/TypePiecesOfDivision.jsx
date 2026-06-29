import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Search, Plus, Trash2, Edit2, X, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Redux Actions
import { createTypePiece, updateTypePiece, deleteTypePiece } from '../../store/slices/typePieceSlice';
import { useConfirm } from '../../providers/ConfirmProvider';

const INITIAL_FORM_STATE = { typePieceName: '' };

export default function TypePiecesOfDivision({ division, typePieces = [] }) {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  
  // --- Form State ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- Data Filtering ---
  const filteredPieces = useMemo(() => {
    if (!searchTerm) return typePieces;
    const lowerSearch = searchTerm.toLowerCase();
    return typePieces.filter(tp => tp.typePieceName?.toLowerCase().includes(lowerSearch));
  }, [typePieces, searchTerm]);

  // --- Handlers ---
  const openAddPanel = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setShowPanel(true);
  };

  const openEditPanel = (tp) => {
    setIsEditMode(true);
    setEditingId(tp._id);
    setFormData({ typePieceName: tp.typePieceName || '' });
    setShowPanel(true);
  };

  const handleClosePanel = () => {
    if (!isSubmitting) setShowPanel(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.typePieceName.trim()) {
      return toast.warning('Missing Fields', { description: 'Type Piece name is required.' });
    }

    setIsSubmitting(true);
    
    // Bind strictly to the Division's parent customer AND to the Division itself
    const payload = {
      typePieceName: formData.typePieceName.trim(),
      customer: division.customer?._id || division.customer,
      division: division._id // NEW: Added Division binding per Schema
    };

    try {
      let actionPromise;
      if (isEditMode) {
        actionPromise = dispatch(updateTypePiece({ id: editingId, updateData: payload })).unwrap();
        toast.promise(actionPromise, { loading: 'Updating Type...', success: 'Type updated.', error: 'Failed to update.' });
      } else {
        actionPromise = dispatch(createTypePiece(payload)).unwrap();
        toast.promise(actionPromise, { loading: 'Creating Type...', success: 'New Type added.', error: 'Failed to create.' });
      }
      
      await actionPromise;
      setShowPanel(false);
    } catch (error) {
      console.error("Failed to save Type Piece:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tp) => {
    const isConfirmed = await confirm({
      title: 'Delete Type Piece?',
      message: `Are you sure you want to remove "${tp.typePieceName}"? This may affect inventory items currently utilizing this Type.`,
      confirmText: 'Delete Type',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const actionPromise = dispatch(deleteTypePiece(tp._id)).unwrap();
        toast.promise(actionPromise, {
          loading: 'Deleting type piece...',
          success: 'Type successfully removed.',
          error: 'Failed to delete Type.'
        });
        await actionPromise;
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-slate-200/60">
        <div className="flex-1 w-full max-w-md relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Search Type</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by type piece name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <button 
          onClick={openAddPanel}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
        >
          <Plus size={14} /> New Type
        </button>
      </div>

      {/* 2. Type Pieces List View */}
      {filteredPieces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-[2rem] border border-slate-200 border-dashed">
          <Layers size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700 tracking-tight mb-1">No Types Found</h3>
          <p className="text-sm font-bold text-slate-400 max-w-sm">
            {searchTerm 
              ? `No type pieces matched your search for "${searchTerm}".`
              : "This division has no specific type piece defined yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
          
          {/* List Header */}
          <div className="flex items-center px-6 py-4 bg-slate-50/50 border-b border-slate-100 hidden sm:flex">
            <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type Name</div>
            <div className="w-1/3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Scope</div>
            <div className="w-32 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</div>
          </div>

          {/* List Body */}
          <div className="flex flex-col divide-y divide-slate-100">
            <AnimatePresence>
              {filteredPieces.map((tp) => (
                <motion.div 
                  key={tp._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-slate-50/50 transition-colors group gap-4 sm:gap-0"
                >
                  {/* Column 1: Identity */}
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 group-hover:border-brand-gold/30 group-hover:bg-white transition-colors">
                      <Box size={18} className="text-slate-400 group-hover:text-brand-gold transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate" title={tp.typePieceName}>
                        {tp.typePieceName}
                      </h4>
                    </div>
                  </div>

                  {/* Column 2: Scope/Level */}
                  <div className="w-full sm:w-1/3 sm:pl-4">
                    <span className="inline-flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      {tp.division ? 'Division Asset' : 'Global Asset'}
                    </span>
                  </div>

                  {/* Column 3: Actions */}
                  <div className="w-full sm:w-32 flex justify-end gap-2 shrink-0">
                    <button 
                      onClick={() => openEditPanel(tp)}
                      className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:text-brand-gold hover:border-brand-gold/50 shadow-sm transition-all" 
                      title="Edit Type Piece"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(tp)}
                      className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm transition-all" 
                      title="Delete Type Piece"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 3. Slide-Over Panel for Add/Edit */}
      <AnimatePresence>
        {showPanel && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleClosePanel}
            />
            
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Box className="text-brand-gold" size={20} />
                  {isEditMode ? 'Edit Type' : 'New Type'}
                </h3>
                <button onClick={handleClosePanel} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="space-y-5">
                  
                  {/* Readonly Context Header */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Division</span>
                    <span className="font-bold text-slate-700">{division?.divisionName || 'Division Scope'}</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Type Piece Name <span className="text-red-400">*</span></label>
                    <input 
                      type="text" required placeholder="e.g. Folder"
                      value={formData.typePieceName} onChange={(e) => setFormData({...formData, typePieceName: e.target.value})} disabled={isSubmitting}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all shadow-sm"
                    />
                  </div>

                </div>

                {/* Footer Action Button */}
                <div className="mt-8 pt-6 border-t border-slate-100 mb-6">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70 text-xs uppercase tracking-widest"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isEditMode ? 'Save Updates' : 'Deploy Type')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}