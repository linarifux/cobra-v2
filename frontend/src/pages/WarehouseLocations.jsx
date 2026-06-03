import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Plus, Search, Filter, X, 
  Database, AlertCircle, CheckCircle, Package, 
  Edit2, Trash2, ChevronDown, Minus, Layers
} from 'lucide-react';

const INITIAL_LOCATIONS = [
  { 
    id: 1, 
    name: 'Aisle 1-A', 
    shelf: 'Tier 3', // Added shelf tracking
    type: 'Rack', 
    capacity: 100, 
    status: 'Active',
    inventory: [
      { id: 101, item: 'Probiotic Blend', lot: 'LOT-2026-A', qty: 50 },
      { id: 102, item: 'Shipping Box L', lot: 'LOT-9912-X', qty: 35 }
    ]
  },
  { 
    id: 2, 
    name: 'Aisle 1-B', 
    shelf: 'Tier 1', // Added shelf tracking
    type: 'Rack', 
    capacity: 100, 
    status: 'Active',
    inventory: [
      { id: 201, item: 'Tape Roll 2"', lot: 'LOT-8821-M', qty: 40 }
    ]
  },
  { 
    id: 3, 
    name: 'Cold Storage 01', 
    shelf: 'Row B', // Added shelf tracking
    type: 'Cooler', 
    capacity: 50, 
    status: 'Full',
    inventory: [
      { id: 301, item: 'Extract A', lot: 'LOT-0034-C', qty: 48 }
    ]
  },
];

export default function WarehouseLocations() {
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); // null = Add, object = Edit
  
  // Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    shelf: '', // Added shelf field to state
    type: 'Rack', 
    capacity: 100,
    inventory: [{ id: Date.now(), item: '', lot: '', qty: '' }]
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (loc.shelf && loc.shelf.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            loc.inventory.some(inv => inv.item.toLowerCase().includes(searchTerm.toLowerCase()) || inv.lot.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === 'All' || loc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [locations, searchTerm, typeFilter]);

  // Modal Handlers
  const openAddModal = () => {
    setFormData({ 
      name: '', 
      shelf: '', 
      type: 'Rack', 
      capacity: 100,
      inventory: [{ id: Date.now(), item: '', lot: '', qty: '' }]
    });
    setActiveLocation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setFormData({
      name: loc.name,
      shelf: loc.shelf || '', 
      type: loc.type,
      capacity: loc.capacity,
      inventory: loc.inventory.length > 0 ? loc.inventory : [{ id: Date.now(), item: '', lot: '', qty: '' }]
    });
    setActiveLocation(loc);
    setIsModalOpen(true);
  };

  // Dynamic Inventory Line Handlers inside Form
  const addInventoryLine = () => {
    setFormData(prev => ({
      ...prev,
      inventory: [...prev.inventory, { id: Date.now(), item: '', lot: '', qty: '' }]
    }));
  };

  const removeInventoryLine = (id) => {
    if (formData.inventory.length > 1) {
      setFormData(prev => ({
        ...prev,
        inventory: prev.inventory.filter(line => line.id !== id)
      }));
    }
  };

  const updateInventoryLine = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      inventory: prev.inventory.map(line => line.id === id ? { ...line, [field]: value } : line)
    }));
  };

  const handleSave = () => {
    const cleanInventory = formData.inventory
      .filter(line => line.item.trim() !== '')
      .map(line => ({
        id: line.id || Date.now(),
        item: line.item,
        lot: line.lot || 'N/A',
        qty: parseInt(line.qty) || 0
      }));

    const payload = {
      name: formData.name,
      shelf: formData.shelf || 'N/A', // Mapping to payload
      type: formData.type,
      capacity: parseInt(formData.capacity) || 100,
      inventory: cleanInventory,
      status: 'Active'
    };

    if (activeLocation) {
      setLocations(prev => prev.map(l => l.id === activeLocation.id ? { ...payload, id: l.id } : l));
    } else {
      setLocations(prev => [...prev, { ...payload, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this location?')) {
      setLocations(prev => prev.filter(l => l.id !== id));
    }
  };

  const getLocationTotals = (inventory) => {
    return inventory.reduce((sum, current) => sum + (parseInt(current.qty) || 0), 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Locations</h1>
          <p className="text-slate-500 font-medium">Manage storage zones, dynamic item placements, and batch lots.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-sm font-black shadow-lg shadow-brand-gold/20 transition-all active:scale-95"
        >
          <Plus size={16} /> New Location
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-2xl flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search locations, shelves, SKU items, or lot numbers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/50" 
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type:</span>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white/60 border border-white/50 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-gold/50"
          >
            <option value="All">All Storage Types</option>
            <option value="Rack">Rack</option>
            <option value="Floor">Floor</option>
            <option value="Cooler">Cooler</option>
          </select>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLocations.map((loc) => {
          const totalUsed = getLocationTotals(loc.inventory);
          const capacityPercentage = Math.min(Math.round((totalUsed / loc.capacity) * 100), 100);
          
          return (
            <motion.div 
              layout
              key={loc.id} 
              className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-2xl hover:border-brand-gold/50 hover:shadow-lg transition-all group relative flex flex-col justify-between"
            >
              <div>
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(loc)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-brand-gold hover:text-white transition-colors text-slate-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(loc.id)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-500 hover:text-white transition-colors text-red-500"><Trash2 size={14} /></button>
                </div>

                <div className="mb-4">
                  <h3 className="font-black text-slate-900 text-lg leading-tight">{loc.name}</h3>
                  <div className="flex gap-1.5 mt-1">
                    <span className="inline-block text-[9px] bg-slate-200/60 px-2 py-0.5 rounded-md font-black text-slate-600 uppercase tracking-wider">{loc.type}</span>
                    <span className="inline-block text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Shelf: {loc.shelf || 'N/A'}</span>
                  </div>
                </div>

                {/* Sub-Inventory List Breakdown */}
                <div className="border-t border-slate-100 pt-3 mb-4 space-y-2.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><Layers size={12}/> Content Breakdown</p>
                  {loc.inventory.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic py-1">Empty location</p>
                  ) : (
                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                      {loc.inventory.map((inv) => (
                        <div key={inv.id} className="bg-white/40 border border-slate-100 p-2 rounded-xl flex justify-between items-center text-xs">
                          <div className="overflow-hidden mr-2">
                            <p className="font-bold text-slate-800 truncate">{inv.item}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">Lot: {inv.lot}</p>
                          </div>
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md text-[11px] min-w-[32px] text-center shrink-0">
                            {inv.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Utilization Tracker */}
              <div className="space-y-1.5 pt-2 border-t border-white/40">
                <div className="flex justify-between text-[11px] font-black text-slate-500">
                  <span>Capacity: {totalUsed} / {loc.capacity}</span>
                  <span className={capacityPercentage >= 90 ? 'text-red-500' : 'text-slate-600'}>{capacityPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${capacityPercentage >= 90 ? 'bg-red-500' : 'bg-brand-gold'}`} 
                    style={{ width: `${capacityPercentage}%` }} 
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add/Edit Slide-Over Frame */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-900">{activeLocation ? 'Edit Location Architecture' : 'New Storage Location'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Location Designation</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Aisle 4-C"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Max Storage Units</label>
                      <input 
                        type="number" 
                        value={formData.capacity}
                        onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold outline-none" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Storage Category</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold outline-none"
                      >
                        <option value="Rack">Rack</option>
                        <option value="Shelf">Shelf</option>
                        <option value="Floor">Floor</option>
                        <option value="Cooler">Cooler</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Shelf / Row Level</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Tier 3"
                        value={formData.shelf}
                        onChange={(e) => setFormData({...formData, shelf: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold outline-none" 
                      />
                    </div>
                  </div>

                  {/* Multi-item Dynamic Allocation Form Space */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Material Records</label>
                      <button 
                        type="button" 
                        onClick={addInventoryLine} 
                        className="flex items-center gap-1 text-[10px] font-black text-brand-gold bg-brand-gold/10 hover:bg-brand-gold hover:text-white px-2 py-1 rounded-lg transition-colors uppercase"
                      >
                        <Plus size={12}/> Mix Item
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {formData.inventory.map((line, idx) => (
                        <div key={line.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative space-y-2">
                          {formData.inventory.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeInventoryLine(line.id)} 
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Minus size={14}/>
                            </button>
                          )}
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Item / SKU Reference</label>
                            <input 
                              type="text"
                              placeholder="e.g., Probiotic Blend"
                              value={line.item}
                              onChange={(e) => updateInventoryLine(line.id, 'item', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-gold mt-0.5"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Lot Batch ID</label>
                              <input 
                                type="text"
                                placeholder="e.g., LOT-2026"
                                value={line.lot}
                                onChange={(e) => updateInventoryLine(line.id, 'lot', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-gold mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Allocated Qty</label>
                              <input 
                                type="number"
                                placeholder="0"
                                value={line.qty}
                                onChange={(e) => updateInventoryLine(line.id, 'qty', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-gold mt-0.5"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button 
                  onClick={handleSave}
                  className="w-full py-3 bg-brand-gold hover:bg-brand-gold-hover text-white font-black rounded-xl shadow-lg shadow-brand-gold/20 transition-all active:scale-95"
                >
                  {activeLocation ? 'Save Structure Changes' : 'Create Mixed Location'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}