import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Redux Thunks
import { fetchLocations, deleteLocation } from '../store/slices/locationSlice';
import { fetchInventory } from '../store/slices/inventorySlice';
import { useConfirm } from '../providers/ConfirmProvider';

// Sub-components
import LocationHeader from '../components/locations/LocationHeader';
import LocationFilterBoard from '../components/locations/LocationFilterBoard';
import LocationGrid from '../components/locations/LocationGrid';
import LocationModal from '../components/locations/LocationModal';

// --- PROFESSIONAL ERROR TRANSLATOR ---
const formatErrorMessage = (err) => {
  const errorString = typeof err === 'string' ? err : (err?.message || '');
  return errorString || 'An unexpected server error occurred.';
};

export default function WarehouseLocations() {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // Safely access Redux state
  const { items: apiLocations = [], status, error } = useSelector(state => state.locations || {});
  const { items: inventoryList = [], status: invStatus } = useSelector(state => state.inventory || {});

  // Load external collections on mount
  useEffect(() => {
    if (status === 'idle') dispatch(fetchLocations());
    if (invStatus === 'idle') dispatch(fetchInventory());
  }, [status, invStatus, dispatch]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); 

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Filter Data
  const filteredLocations = useMemo(() => {
    return apiLocations.filter(loc => {
      const searchTarget = searchTerm.toLowerCase();
      const locName = loc.designation?.toLowerCase() || '';
      const locLevel = loc.level?.toLowerCase() || '';

      const matchesSearch = locName.includes(searchTarget) ||
                            locLevel.includes(searchTarget) ||
                            (loc.assignedMaterials && loc.assignedMaterials.some(m => 
                              m.inventory?.itemName?.toLowerCase().includes(searchTarget) || 
                              m.inventory?.sku?.toLowerCase().includes(searchTarget) || 
                              m.lotBatchId?.toLowerCase().includes(searchTarget)
                            ));
                            
      const matchesType = typeFilter === 'All' || loc.storageCategory === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [apiLocations, searchTerm, typeFilter]);

  // Handlers
  const openAddModal = () => { setActiveLocation(null); setIsModalOpen(true); };
  const openEditModal = (loc) => { setActiveLocation(loc); setIsModalOpen(true); };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Location?',
      message: 'Are you sure you want to permanently delete this storage location? All inventory associations mapped to this rack will be removed.',
      confirmText: 'Delete Location',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const deletePromise = dispatch(deleteLocation(id)).unwrap();
        
        toast.promise(deletePromise, {
          loading: 'Deleting location...',
          success: 'Location permanently removed.',
          error: (err) => `Delete Failed: ${formatErrorMessage(err)}`
        });

        await deletePromise;
      } catch (err) {
        // Silently caught to prevent unhandled promise rejection in the browser console
      }
    }
  };

  // Render Loader if initial fetch is pending
  if (status === 'loading' && apiLocations.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Loading Warehouse Data...</p>
      </div>
    );
  }

  // Render Error state if fetch failed
  if (status === 'failed') {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50/80 backdrop-blur-md border border-red-200 p-8 rounded-3xl flex flex-col items-center max-w-md text-center shadow-lg">
          <AlertTriangle className="text-red-500 mb-4" size={40} />
          <h2 className="text-red-800 text-lg font-black tracking-tight mb-2">Sync Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6 leading-relaxed">{error}</p>
          <button 
            onClick={() => dispatch(fetchLocations())} 
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1500px] mx-auto p-6 pb-20">
      
      <LocationHeader openAddModal={openAddModal} />
      
      <LocationFilterBoard 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        typeFilter={typeFilter} setTypeFilter={setTypeFilter} 
      />
      
      <LocationGrid 
        filteredLocations={filteredLocations} 
        openEditModal={openEditModal} 
        handleDelete={handleDelete} 
      />
      
      <LocationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        activeLocation={activeLocation} 
        inventoryList={inventoryList} 
      />

    </div>
  );
}