import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Edit2, Trash2, X, Loader2, Layers } from 'lucide-react';

// NOTE: You will need to create these thunks in a typePieceSlice (example provided below)
import { 
  fetchTypePieces, 
  createTypePiece, 
  updateTypePiece, 
  deleteTypePiece 
} from '../../../store/slices/typePieceSlice';

export default function TypePieceTab({ customer }) {
  const dispatch = useDispatch();

  // Access Type Pieces from Redux (Assuming state.typePieces.items)
  const { items: typePieces = [], status } = useSelector((state) => state.typePieces || {});
  
  const [showPanel, setShowPanel] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    typePieceName: '',
    customer: customer?._id || ''
  });

  // Fetch Type Pieces when the tab mounts (filtered by the active customer)
  useEffect(() => {
    if (customer?._id) {
      // Pass the customer ID to filter the results from the backend
      dispatch(fetchTypePieces(customer._id));
    }
  }, [dispatch, customer?._id]);

  // Filter local items to ensure we only show the ones for this customer tab
  const customerTypePieces = useMemo(() => {
    return typePieces.filter(tp => 
      (tp.customer?._id || tp.customer) === customer?._id
    );
  }, [typePieces, customer]);

  const openAddPanel = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({ typePieceName: '', customer: customer?._id || '' });
    setShowPanel(true);
  };

  const openEditPanel = (item) => {
    setIsEditMode(true);
    setEditingId(item._id);
    setFormData({ 
      typePieceName: item.typePieceName, 
      customer: item.customer?._id || item.customer 
    });
    setShowPanel(true);
  };

  const handleClosePanel = () => {
    if (!isSubmitting) setShowPanel(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.typePieceName.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await dispatch(updateTypePiece({ id: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createTypePiece(formData)).unwrap();
      }
      setShowPanel(false);
    } catch (error) {
      console.error("Failed to save Type Piece:", error);
      alert(`Error saving: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Type Piece?')) {
      try {
        await dispatch(deleteTypePiece(id)).unwrap();
      } catch (error) {
        console.error("Failed to delete Type Piece:", error);
      }
    }
  };

  if (status === 'loading' && typePieces.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[500px] overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-brand-gold" size={20} /> Type Pieces
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage physical form factors assigned to {customer?.customerName}.</p>
        </div>
        <button 
          onClick={openAddPanel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-md text-sm font-bold transition-colors shadow-sm"
        >
          Add Type Piece
        </button>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Customer</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type Piece</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customerTypePieces.length > 0 ? (
              customerTypePieces.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-bold text-slate-700">
                    {item.customer?.customerName || customer?.customerName}
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-900">
                    {item.typePieceName}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-50 hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditPanel(item)}
                        className="p-1.5 text-slate-400 hover:text-brand-gold hover:bg-white rounded border border-transparent hover:border-slate-200 shadow-sm"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded border border-transparent hover:border-slate-200 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-12 text-center text-sm font-bold text-slate-400 bg-slate-50/30">
                  No Type Pieces configured for this customer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-Over Panel Overlay (Matches the image design) */}
      {showPanel && (
        <div className="absolute inset-0 z-10 flex justify-end overflow-hidden">
          {/* Greyed out background */}
          <div 
            className="absolute inset-0 bg-slate-500/40 backdrop-blur-sm"
            onClick={handleClosePanel}
          />
          
          {/* White Panel */}
          <div className="relative w-full max-w-[400px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditMode ? 'Edit Type Piece' : 'Add Type Piece'}
              </h3>
              <button onClick={handleClosePanel} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col">
              <div className="space-y-6">
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Type Piece Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.typePieceName}
                    onChange={(e) => setFormData({...formData, typePieceName: e.target.value})}
                    disabled={isSubmitting}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Customer</label>
                  <select 
                    value={formData.customer}
                    disabled // Locked to the active customer since we are on their detail page
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
                  >
                    <option value={customer?._id}>{customer?.customerName}</option>
                  </select>
                </div>

              </div>

              {/* Footer Action Button */}
              <div className="mt-auto pt-6 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isEditMode ? 'Update Type Piece' : 'Add Type Piece')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}