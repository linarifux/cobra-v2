import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Plus, Search, Filter, X, 
  Database, AlertCircle, CheckCircle, Package, 
  Edit2, Trash2, ChevronDown 
} from 'lucide-react';

const INITIAL_LOCATIONS = [
  { id: 1, name: 'Aisle 1-A', type: 'Rack', capacity: 100, used: 85, status: 'Active' },
  { id: 2, name: 'Aisle 1-B', type: 'Rack', capacity: 100, used: 40, status: 'Active' },
  { id: 3, name: 'Cold Storage 01', type: 'Cooler', capacity: 50, used: 48, status: 'Full' },
];

export default function WarehouseLocations() {
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); // null = Add, object = Edit
  
  // Form State
  const [formData, setFormData] = useState({ name: '', type: 'Rack', capacity: 100, used: 0, status: 'Active' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'All' || loc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [locations, searchTerm, typeFilter]);

  // Modal Handlers
  const openAddModal = () => {
    setFormData({ name: '', type: 'Rack', capacity: 100, used: 0, status: 'Active' });
    setActiveLocation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setFormData(loc);
    setActiveLocation(loc);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (activeLocation) {
      // Update
      setLocations(prev => prev.map(l => l.id === activeLocation.id ? { ...formData, id: l.id } : l));
    } else {
      // Create
      setLocations(prev => [...prev, { ...formData, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this location?')) {
      setLocations(prev => prev.filter(l => l.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Locations</h1>
          <p className="text-slate-500 font-medium">Manage storage zones and capacity distribution.</p>
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
            placeholder="Search locations..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/50" 
          />
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLocations.map((loc) => (
          <motion.div 
            layout
            key={loc.id} 
            className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-2xl hover:border-brand-gold/50 hover:shadow-lg transition-all group relative"
          >
            {/* Actions */}
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEditModal(loc)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-brand-gold hover:text-white transition-colors text-slate-600"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(loc.id)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-500 hover:text-white transition-colors text-red-500"><Trash2 size={14} /></button>
            </div>

            <div className="mb-4">
              <h3 className="font-black text-slate-900 text-lg">{loc.name}</h3>
              <span className="text-[10px] bg-slate-200/50 px-2 py-0.5 rounded-lg font-bold text-slate-600 uppercase tracking-wider">{loc.type}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-black text-slate-500">
                <span>Capacity: {Math.round((loc.used / loc.capacity) * 100)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden">
                <div className="h-full bg-brand-gold rounded-full" style={{ width: `${(loc.used / loc.capacity) * 100}%` }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Slide-Over */}
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
              className="relative w-full max-w-sm h-full bg-white shadow-2xl border-l border-slate-200 p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-slate-900">{activeLocation ? 'Edit Location' : 'New Location'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Location Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold outline-none" 
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold outline-none"
                  >
                    <option>Rack</option>
                    <option>Floor</option>
                    <option>Cooler</option>
                  </select>
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full py-4 bg-brand-gold hover:bg-brand-gold-hover text-white font-black rounded-xl shadow-lg shadow-brand-gold/20 transition-all active:scale-95 mt-4"
                >
                  {activeLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}