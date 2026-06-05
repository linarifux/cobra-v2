import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, PlusCircle, Filter, Package, Trash2, Edit, Check, X, 
  Tag, MapPin, User, DollarSign, ArrowLeft, History, Layers, 
  ExternalLink, ImageIcon 
} from 'lucide-react';

export default function InventoryPage() {
  // Routing Hooks for URL sync management
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  
  // Derived active item ID from URL context sequence
  const activeDetailId = inventoryId ? Number(inventoryId) : null;

  // Core Inventory State Matrix
  const [inventory, setInventory] = useState([
    { id: 1, code: '61943', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60', desc: 'Hy-D vs. Bio-D Comparison study Pack', customer: 'Global Feeds Corp', division: 'Animal Nutrition', category: 'Supplements', location: 'Warehouse Alpha - A3', price: 145.50, available: 325, onOrder: 50, minThreshold: 100, updatedAt: '2026-06-02 14:22', updatedBy: 'Sarah Jenkins' },
    { id: 2, code: 'A0091', image: 'https://images.unsplash.com/photo-1607619056574-7b8d304f3c6f?w=200&auto=format&fit=crop&q=60', desc: 'MaxiChick Performance Pack', customer: 'Apex Poultry Alliance', division: 'Animal Nutrition', category: 'Feeds', location: 'Warehouse Beta - B12', price: 89.00, available: 30, onOrder: 10, minThreshold: 50, updatedAt: '2026-05-28 09:15', updatedBy: 'Marcus Vance' },
    { id: 3, code: 'A0200', image: '', desc: 'Human Nutrition White Paper', customer: 'Internal Stock', division: 'Human Nutrition', category: 'Marketing', location: 'HQ Media Cabinet', price: 0.00, available: 155, onOrder: 0, minThreshold: 20, updatedAt: '2026-04-10 11:00', updatedBy: 'System Auto' },
  ]);

  // State to hold customers fetched from the API
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // System Configuration Lists
  const divisionsList = ['Animal Nutrition', 'Human Nutrition', 'Food & Beverage'];
  const categoriesList = ['Supplements', 'Feeds', 'Marketing', 'Raw Ingredients', 'Packaging'];
  const locationsList = ['Warehouse Alpha - A3', 'Warehouse Beta - B12', 'Warehouse Gamma - C1', 'HQ Media Cabinet'];

  // Form Panel Lifecycle States
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Unified Form Data State
  const [formData, setFormData] = useState({
    code: '', image: '', desc: '', customer: '', division: 'Animal Nutrition',
    category: 'Supplements', location: 'Warehouse Alpha - A3', price: 0, available: 0, onOrder: 0, minThreshold: 20
  });

  // Filtering Conditions States
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Simulate Fetching Customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoadingCustomers(true);
        // Replace this block with your actual API integration line:
        // const response = await fetch('/api/customers');
        // const data = await response.json();
        
        // Mocking API delay and data payload
        await new Promise(resolve => setTimeout(resolve, 600));
        const mockCustomersFromApi = [
          { id: 'c1', name: 'Global Feeds Corp' },
          { id: 'c2', name: 'Apex Poultry Alliance' },
          { id: 'c3', name: 'Internal Stock' },
          { id: 'c4', name: 'BioGen Logistics' },
          { id: 'c5', name: 'Vanguard Nutrition' }
        ];
        
        setCustomers(mockCustomersFromApi);
      } catch (error) {
        console.error("Failed to load customers from API portal pipeline:", error);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // Base64 Local Image Pipeline Reader
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Core Mutation Event Handlers
  const openAddMode = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      code: '', image: '', desc: '', customer: customers[0]?.name || '', division: 'Animal Nutrition',
      category: 'Supplements', location: 'Warehouse Alpha - A3', price: 0, available: 0, onOrder: 0, minThreshold: 20
    });
    setShowFormPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditMode = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setFormData({ ...item });
    setShowFormPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.desc || !formData.customer) return;

    const formattedRecord = {
      ...formData,
      price: Number(formData.price),
      available: Number(formData.available),
      onOrder: Number(formData.onOrder),
      minThreshold: Number(formData.minThreshold || 20),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedBy: 'Operator' 
    };

    if (isEditMode) {
      setInventory(prev => prev.map(item => item.id === editingId ? { ...formattedRecord, id: editingId } : item));
    } else {
      setInventory(prev => [...prev, { ...formattedRecord, id: Date.now() }]);
    }

    setShowFormPanel(false);
  };

  const handleDeleteItem = (id) => {
    if (confirm("Are you sure you want to permanently delete this inventory asset item?")) {
      setInventory(prev => prev.filter(item => item.id !== id));
      if (activeDetailId === id) navigate('/inventory');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDivisionFilter('All');
    setCategoryFilter('All');
    setOnlyAvailable(false);
  };

  // Pipeline Filter Logic Processing
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const query = search.toLowerCase().trim();
      const matchesSearch = query === '' || 
        item.desc.toLowerCase().includes(query) || 
        item.code.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query);
        
      const matchesDivision = divisionFilter === 'All' || item.division === divisionFilter;
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesStock = onlyAvailable ? item.available > 0 : true;

      return matchesSearch && matchesDivision && matchesCategory && matchesStock;
    });
  }, [search, divisionFilter, categoryFilter, onlyAvailable, inventory]);

  // Lookup Instance for Isolated Deep Detail rendering
  const activeDetailItem = useMemo(() => {
    return inventory.find(item => item.id === activeDetailId);
  }, [activeDetailId, inventory]);


  /* ==========================================
     SUB-RENDER: Deep Detail Sheet Workspace View
     ========================================== */
  if (activeDetailId && activeDetailItem) {
    const totalAssetValue = activeDetailItem.price * activeDetailItem.available;
    const isLowStock = activeDetailItem.available <= activeDetailItem.minThreshold;

    return (
      <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-in fade-in duration-200">
        {/* Upper Action Subbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
          <button 
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={16} /> Back to Stock Registry
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                navigate('/inventory');
                setTimeout(() => openEditMode(activeDetailItem), 0);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Edit size={13} /> Edit Asset Node
            </button>
            <button 
              onClick={() => handleDeleteItem(activeDetailItem.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200/40 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Trash2 size={13} /> Decommission Item
            </button>
          </div>
        </div>

        {/* Identity Hero Block */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-5 pointer-events-none">
            <Package size={240} />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {activeDetailItem.image ? (
                <img 
                  src={activeDetailItem.image} 
                  alt={activeDetailItem.desc} 
                  className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-2xl bg-slate-800 border border-white/10 shadow-inner shrink-0" 
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-500">
                  <Package size={32} />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-slate-900 uppercase tracking-widest bg-emerald-400 px-2 py-0.5 rounded-md">
                    SKU: {activeDetailItem.code}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-full tracking-wide uppercase ${isLowStock ? 'bg-amber-50 text-slate-900 animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
                    {isLowStock ? 'Low Stock Warning' : 'Stable Inventory Pool'}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">{activeDetailItem.desc}</h1>
                <p className="text-xs text-slate-400 font-medium">
                  Last audited on <span className="text-slate-200 font-bold">{activeDetailItem.updatedAt || 'N/A'}</span> by <span className="text-slate-200 font-bold">{activeDetailItem.updatedBy || 'System'}</span>
                </p>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2.5 rounded-2xl text-right shrink-0">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Total Asset Pool Valuation</span>
              <span className="text-xl font-mono font-black text-emerald-400">${totalAssetValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Core Indicators Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Units Available On-Hand</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-900">{activeDetailItem.available}</span>
              <span className="text-xs font-bold text-slate-400">Units</span>
            </div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pipeline Supply (On-Order)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-blue-600">+{activeDetailItem.onOrder}</span>
              <span className="text-xs font-bold text-slate-400">Inbound Allocation</span>
            </div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Base Unit Cost</span>
            <div className="flex items-baseline gap-0.5">
              <DollarSign size={18} className="text-slate-400 self-center -mb-0.5" />
              <span className="text-2xl font-mono font-black text-slate-900">{activeDetailItem.price.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Safety Buffer Threshold</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-slate-700">{activeDetailItem.minThreshold || 20}</span>
              <span className="text-xs font-bold text-slate-400">Minimum Pool</span>
            </div>
          </div>
        </div>

        {/* Structural Specs Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="space-y-4">
            <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/40 flex items-center gap-1.5"><Layers size={12} /> Classification Hierarchy</h3>
              <div className="space-y-2 text-xs font-bold">
                <div>
                  <span className="text-[9px] font-medium text-slate-400 block uppercase">Operational Unit / Division</span>
                  <p className="text-slate-800 text-sm font-black mt-0.5">{activeDetailItem.division}</p>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-slate-400 block uppercase">Assigned Category Depth</span>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-slate-100 text-slate-700 font-black tracking-wide uppercase px-2 py-0.5 rounded-md">{activeDetailItem.category}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/40 flex items-center gap-1.5"><User size={12} /> Product Depositor</h3>
              <div className="space-y-2 text-xs font-bold">
                <div>
                  <span className="text-[9px] font-medium text-slate-400 block uppercase">Product Owner / Customer Account</span>
                  <p className="text-slate-800 text-sm font-black mt-0.5">{activeDetailItem.customer || 'Unassigned General Pool'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/40 flex items-center gap-1.5"><MapPin size={12} /> Logistics Deployment Location</h3>
              <div className="space-y-1.5 text-xs font-bold">
                <span className="text-[9px] font-medium text-slate-400 block uppercase">Active Vault Coordinates</span>
                <div className="flex items-center gap-1.5 text-slate-800 font-extrabold bg-white/60 p-2 rounded-xl border border-slate-200/40">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{activeDetailItem.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Movement Log Simulation Panel */}
          <div className="lg:col-span-2 bg-white/40 border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><History size={13} /> Stock Movement Audit Ledger</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Realtime Sync Stream</span>
            </div>
            <table className="w-full text-left border-collapse text-xs font-bold">
              <thead>
                <tr className="border-b border-slate-200/40 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Timestamp Date</th>
                  <th className="pb-2">Adjustment Transaction Event</th>
                  <th className="pb-2">Reference ID</th>
                  <th className="pb-2 text-center">Quantity Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/20 text-slate-700">
                <tr className="group">
                  <td className="py-2.5 font-mono text-slate-500 font-medium">Initial Entry State</td>
                  <td className="py-2.5 font-extrabold text-slate-900">Baseline Audit Intake</td>
                  <td className="py-2.5 font-mono text-slate-500">SYS-REC-{activeDetailItem.code}</td>
                  <td className="py-2.5 text-center font-mono font-black"><span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700">+{activeDetailItem.available}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }


  /* ==========================================
     PRIMARY INDEX REGISTRY DASHBOARD RENDER 
     ========================================== */
  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Registry Top Level Action Header */}
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-slate-800" /> Customer Stock Inventory
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Track quantities, logistics, deposited items, and product assets linked to customer portal orders.</p>
        </div>
        <button 
          onClick={openAddMode}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm uppercase tracking-wider"
        >
          <PlusCircle size={15} /> Add New Asset Item
        </button>
      </div>

      {/* Drawer Management Input Panel (Add / Edit Form Actions) */}
      {showFormPanel && (
        <form onSubmit={handleFormSubmit} className="bg-white/70 backdrop-blur-md border border-slate-200/80 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              {isEditMode ? `Modify Item Node: ${formData.code}` : 'Register New Deposited Stock Item'}
            </h3>
            <button type="button" onClick={() => setShowFormPanel(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
            {/* Interactive Image Uploader Slot */}
            <div className="md:col-span-2 lg:col-span-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {formData.image ? (
                  <img src={formData.image} alt="Preview Pipeline" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={18} className="text-slate-400" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Product Main Image Node</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-[11px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
              </div>
              {formData.image && (
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  className="ml-auto text-[10px] font-black uppercase text-red-500 hover:text-red-700 px-2 py-1 bg-red-50 rounded-md"
                >
                  Remove
                </button>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Item Code / SKU</label>
              <input 
                type="text" required placeholder="e.g. A0340" value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono uppercase"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Item Description Summary</label>
              <input 
                type="text" required placeholder="Asset title specifications..." value={formData.desc}
                onChange={e => setFormData({...formData, desc: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Selectable Customer Dropdown Field linked to API pipeline */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Depositor / Customer Account
              </label>
              <select
                required
                value={formData.customer}
                disabled={isLoadingCustomers}
                onChange={e => setFormData({...formData, customer: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingCustomers ? (
                  <option value="">Syncing core customers stream...</option>
                ) : (
                  <>
                    <option value="" disabled>Select active depositor...</option>
                    {customers.map(cust => (
                      <option key={cust.id} value={cust.name}>
                        {cust.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Operational Division</label>
              <select value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px]">
                {divisionsList.map(div => <option key={div} value={div}>{div}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category Classification</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px]">
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Logistics Vault Location</label>
              <select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px]">
                {locationsList.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Unit Value Cost ($)</label>
              <input 
                type="number" step="0.01" min="0" value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Available On-Hand</label>
              <input 
                type="number" min="0" value={formData.available}
                onChange={e => setFormData({...formData, available: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pipeline Inbound (On-Order)</label>
              <input 
                type="number" min="0" value={formData.onOrder}
                onChange={e => setFormData({...formData, onOrder: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Low Stock Trigger Cushion</label>
              <input 
                type="number" min="0" value={formData.minThreshold || 20}
                onChange={e => setFormData({...formData, minThreshold: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 lg:col-span-4 border-t border-slate-200/40 mt-2">
              <button 
                type="button" onClick={() => setShowFormPanel(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px] rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isLoadingCustomers}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl shadow-sm disabled:opacity-60"
              >
                {isEditMode ? 'Commit Changes' : 'Save Record'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Board Row */}
      <div className="bg-white/30 backdrop-blur-sm border border-slate-200/60 p-4 rounded-2xl flex flex-wrap gap-4 items-center text-xs font-bold text-slate-600">
        <div className="flex items-center gap-1 text-slate-500 text-[11px] uppercase tracking-wider font-black shrink-0">
          <Filter size={14} /> Filter Matrix:
        </div>

        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
          <input 
            placeholder="Search code, description, or customer accounts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Division:</span>
          <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]">
            <option value="All">All Divisions</option>
            {divisionsList.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Category:</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]">
            <option value="All">All Categories</option>
            {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-500 cursor-pointer select-none ml-2">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="rounded text-slate-900 focus:ring-0 w-3.5 h-3.5 accent-slate-900" />
          In Stock Only
        </label>

        {(divisionFilter !== 'All' || categoryFilter !== 'All' || onlyAvailable || search !== '') && (
          <button 
            onClick={handleClearFilters}
            className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md transition-colors ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Advanced Interactive Master Table */}
      <div className="bg-white/40 backdrop-blur-sm border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/70 border-b border-slate-200/60">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Identity SKU</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Description / Classification</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Customer Allocation</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Logistics Deployment</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Value Cost</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Stock Availability</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 text-xs font-bold">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const isLowStock = item.available <= (item.minThreshold || 20);
                  return (
                    <tr key={item.id} className="hover:bg-white/60 transition-colors group">
                      {/* Interactive Identifier SKU */}
                      <td 
                        onClick={() => navigate(`/inventory/${item.id}`)}
                        className="p-4 font-mono font-black text-slate-900 tracking-wider text-[13px] cursor-pointer"
                      >
                        <span className="bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all px-2 py-0.5 rounded-md border border-slate-200/40 flex items-center gap-1 w-max">
                          {item.code} <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        </span>
                      </td>

                      {/* Summary + Image Node */}
                      <td 
                        onClick={() => navigate(`/inventory/${item.id}`)}
                        className="p-4 max-w-[340px] cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-10 h-10 object-cover rounded-xl bg-slate-100 border border-slate-200/60 shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-400">
                              <Package size={15} />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-slate-800 text-[13px] font-extrabold truncate group-hover:text-slate-900 group-hover:underline decoration-slate-400 underline-offset-2">{item.desc}</p>
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-slate-100 text-slate-600 font-black tracking-wide uppercase px-1.5 py-0.5 rounded-md">
                              <Tag size={10} className="text-slate-400" /> {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer / Account Assignment */}
                      <td className="p-4">
                        <div className="text-slate-900 flex items-center gap-1.5 text-[13px] font-extrabold">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span>{item.customer || 'Unassigned Pool'}</span>
                        </div>
                      </td>

                      {/* Logistics Deployment */}
                      <td className="p-4 space-y-0.5">
                        <p className="text-slate-500 font-black uppercase tracking-wider text-[10px]">{item.division}</p>
                        <div className="flex items-center gap-1 text-slate-600 text-[11px] font-medium">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.location}</span>
                        </div>
                      </td>

                      {/* Cost Valuations */}
                      <td className="p-4 text-slate-800 font-mono text-[13px] font-extrabold">
                        {item.price > 0 ? (
                          <span className="flex items-center text-slate-900 font-black">
                            <DollarSign size={12} className="text-slate-400 -mr-0.5" />
                            {item.price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px] tracking-wide uppercase bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">N/A</span>
                        )}
                      </td>

                      {/* Stock Counters */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <span className={`inline-block text-center min-w-[42px] px-2 py-0.5 rounded-md text-[11px] font-mono font-black border ${isLowStock ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200/40'}`}>
                              {item.available}
                            </span>
                            <span className="block text-[9px] font-bold tracking-wider text-slate-400 uppercase text-center">Avail</span>
                          </div>
                          
                          {item.onOrder > 0 && (
                            <div className="space-y-1 border-l border-slate-200 pl-3">
                              <span className="block text-[11px] text-blue-600 font-mono font-black">+{item.onOrder}</span>
                              <span className="block text-[9px] font-bold tracking-wider text-blue-400 uppercase">Inbound</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Modification Actions Bar */}
                      <td className="p-4">
                        <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditMode(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-all"
                            title="Modify Asset Node"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Purge Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-semibold text-slate-400 text-xs bg-white/10">
                    No active stock parameters matching your exact query criteria could be indexed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}