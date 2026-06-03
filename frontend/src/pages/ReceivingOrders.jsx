import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Download, Trash2, Edit2, 
  CheckSquare, Square, Search, X, Eye, Calendar, PlusCircle, Check, Minus
} from 'lucide-react';

const INITIAL_DATA = [
  { id: 538, date: '2026-05-12', customer: 'Joff Company', item: 'Probiotic Blend', qty: 5800, skids: 1, status: 'Received' },
  { id: 537, date: '2026-05-11', customer: 'Joff Company', item: 'Shipping Box L', qty: 8900, skids: 0, status: 'Pending' },
  { id: 536, date: '2026-05-11', customer: 'Joff Company', item: 'Tape Roll 2"', qty: 90, skids: 0, status: 'Received' },
  { id: 535, date: '2026-05-10', customer: 'DSM', item: 'Extract A', qty: 1200, skids: 2, status: 'Pending' },
];

export default function ReceivingOrders() {
  const [data, setData] = useState(INITIAL_DATA);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    customer: '',
    shelf: false,
    lot: '',
    location: '',
    inventoryItem: ''
  });

  const [lineItems, setLineItems] = useState([
    { id: Date.now(), skids: '', cartons: '', unitsPerCarton: '', unitWeight: '' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesSearch = row.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            row.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
      const matchesFrom = !fromDate || row.date >= fromDate;
      const matchesTo = !toDate || row.date <= toDate;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [data, searchTerm, statusFilter, fromDate, toDate]);

  // Modal Controls
  const openNewModal = () => {
    setActiveOrderId(null);
    setFormData({ date: new Date().toISOString().split('T')[0], vendor: '', customer: '', shelf: false, lot: '', location: '', inventoryItem: '' });
    setLineItems([{ id: Date.now(), skids: '', cartons: '', unitsPerCarton: '', unitWeight: '' }]);
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setActiveOrderId(row.id);
    setFormData({
      date: row.date,
      vendor: '', // Mocking vendor as it's not in base table
      customer: row.customer,
      shelf: row.skids === 0,
      lot: '',
      location: '',
      inventoryItem: row.item
    });
    // Reverse engineer line items from totals for the sake of the edit view
    setLineItems([
      { id: Date.now(), skids: row.skids, cartons: row.qty, unitsPerCarton: 1, unitWeight: '' }
    ]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setActiveOrderId(null);
    }, 300); // Wait for exit animation
  };

  // Line Item Handlers
  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), skids: '', cartons: '', unitsPerCarton: '', unitWeight: '' }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Save (Create/Update)
  const handleSaveShipment = (e) => {
    e.preventDefault();
    const totalQty = lineItems.reduce((acc, curr) => acc + ((parseInt(curr.cartons) || 0) * (parseInt(curr.unitsPerCarton) || 0)), 0);
    const totalSkids = lineItems.reduce((acc, curr) => acc + (parseInt(curr.skids) || 0), 0);

    const payload = {
      date: formData.date,
      customer: formData.customer,
      item: formData.inventoryItem || 'New Item',
      qty: totalQty,
      skids: formData.shelf ? 0 : totalSkids,
    };

    if (activeOrderId) {
      // Update existing
      setData(prev => prev.map(row => row.id === activeOrderId ? { ...row, ...payload } : row));
    } else {
      // Create new
      const newEntry = { ...payload, id: Math.floor(1000 + Math.random() * 9000), status: 'Pending' };
      setData([newEntry, ...data]);
    }
    
    closeModal();
  };

  // Delete
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this receiving order?')) {
      setData(prev => prev.filter(row => row.id !== id));
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    }
  };

  // Bulk Actions & Helpers
  const toggleRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedRows(selectedRows.length === filteredData.length ? [] : filteredData.map(r => r.id));
  };

  const confirmSelected = () => {
    setData(prev => prev.map(row => selectedRows.includes(row.id) ? { ...row, status: 'Received' } : row));
    setSelectedRows([]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setFromDate('');
    setToDate('');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Receiving #', 'Customer', 'Inventory Item', 'Qty', 'Skids', 'Status'];
    const csvContent = [headers.join(','), ...filteredData.map(row => [row.date, row.id, `"${row.customer}"`, `"${row.item}"`, row.qty, row.skids, row.status].join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hasFilters = searchTerm || statusFilter !== 'All' || fromDate || toDate;

  return (
    <div className="space-y-6 animate-slide-in-right relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Receiving Management</h1>
          <p className="text-slate-500 font-medium">Manage and confirm incoming shipments.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-white/60 hover:bg-white/80 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all"><Download size={16} /> Export</button>
          <button 
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-gold/20 transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} /> Add Shipment
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" 
              onClick={closeModal} 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-white/95 backdrop-blur-2xl shadow-2xl border-l border-white/50 p-6 overflow-y-auto flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-slate-900">
                  {activeOrderId ? 'Edit Receiving Entry' : 'New Receiving Entry'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleSaveShipment} className="flex-1 flex flex-col gap-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date Received</label>
                  <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vendor</label>
                    <select value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold">
                      <option value="">Select</option>
                      <option value="Joff Company">Joff Company</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer</label>
                    <select value={formData.customer} onChange={(e) => setFormData({...formData, customer: e.target.value})} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold">
                      <option value="">Select</option>
                      <option value="Joff Company">Joff Company</option>
                      <option value="DSM">DSM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inventory Item</label>
                  <select value={formData.inventoryItem} onChange={(e) => setFormData({...formData, inventoryItem: e.target.value})} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold">
                    <option value="">Select Item</option>
                    <option value="Probiotic Blend">Probiotic Blend</option>
                    <option value="Shipping Box L">Shipping Box L</option>
                    <option value="Extract A">Extract A</option>
                    <option value='Tape Roll 2"'>Tape Roll 2"</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <input type="checkbox" checked={formData.shelf} onChange={(e) => setFormData({...formData, shelf: e.target.checked})} className="w-4 h-4 accent-brand-gold rounded" />
                  <label className="text-xs font-bold text-slate-700">Add to Shelf Inventory</label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lot #</label>
                    <input type="text" value={formData.lot} onChange={(e) => setFormData({...formData, lot: e.target.value})} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold" />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Location</label>
                    <select value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold">
                      <option value="">Select Location</option>
                      <option value="Aisle 1">Aisle 1</option>
                      <option value="Aisle 2">Aisle 2</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Line Items */}
                <div className="space-y-3 mt-2">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider">Shipment Details</label>
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-4 gap-2 items-end">
                      {!formData.shelf && (
                        <div className="col-span-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Skids</label>
                          <input type="number" value={item.skids} onChange={(e) => updateLineItem(item.id, 'skids', e.target.value)} className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
                        </div>
                      )}
                      <div className={formData.shelf ? "col-span-2" : "col-span-1"}>
                          <label className="text-[9px] font-black text-slate-400 uppercase">Cartons</label>
                          <input type="number" value={item.cartons} onChange={(e) => updateLineItem(item.id, 'cartons', e.target.value)} className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
                      </div>
                      <div className={formData.shelf ? "col-span-2" : "col-span-1"}>
                          <label className="text-[9px] font-black text-slate-400 uppercase">Units/Ctn</label>
                          <input type="number" value={item.unitsPerCarton} onChange={(e) => updateLineItem(item.id, 'unitsPerCarton', e.target.value)} className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
                      </div>
                      <div className="flex gap-1 pb-1">
                          <button type="button" onClick={addLineItem} className="p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-brand-gold hover:text-white"><Plus size={14} /></button>
                          <button type="button" onClick={() => removeLineItem(item.id)} className="p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-red-500 hover:text-white"><Minus size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4">
                  <button type="submit" className="w-full py-3 bg-brand-gold hover:bg-brand-gold-hover text-white font-black rounded-xl shadow-lg shadow-brand-gold/20 transition-all active:scale-95">
                    {activeOrderId ? 'Save Changes' : 'Confirm Shipment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-2 relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Item or Customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none">
              <option value="All">All</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none" />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors">
              <X size={16} /> Clear
            </button>
          )}
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="font-bold text-sm flex items-center gap-2"><span className="bg-white/20 px-2 py-0.5 rounded-md">{selectedRows.length}</span> selected</p>
          <button onClick={confirmSelected} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors">Confirm Selected</button>
        </div>
      )}

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/50 bg-white/20">
              <th className="p-4 w-10"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-brand-gold">{selectedRows.length === filteredData.length ? <CheckSquare size={18} /> : <Square size={18} />}</button></th>
              {['Date', 'Receiving #', 'Customer', 'Inventory Item', 'Qty', 'Skids', 'Status', ''].map((h) => <th key={h} className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {filteredData.map((row) => {
              const isSelected = selectedRows.includes(row.id);
              return (
                <tr key={row.id} className={`${isSelected ? 'bg-brand-gold/5' : ''} hover:bg-white/40 transition-colors group`}>
                  <td className="p-4"><button onClick={() => toggleRow(row.id)} className="text-slate-400 hover:text-brand-gold">{isSelected ? <CheckSquare size={18} className="text-brand-gold" /> : <Square size={18} />}</button></td>
                  <td className="p-4 text-sm font-bold text-slate-600">{row.date}</td>
                  <td className="p-4 text-sm font-mono font-bold text-slate-900">#{row.id}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{row.customer}</td>
                  <td className="p-4 text-sm font-semibold text-slate-800">{row.item}</td>
                  <td className="p-4 text-sm font-bold text-slate-900">{row.qty.toLocaleString()}</td>
                  <td className="p-4 text-sm font-bold text-slate-600">{row.skids}</td>
                  <td className="p-4"><span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${row.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{row.status}</span></td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/receiving/${row.id}`} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-gold transition-colors"><Eye size={16} /></Link>
                      {/* Hooked up openEditModal here */}
                      <button onClick={() => openEditModal(row)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-gold transition-colors"><Edit2 size={16} /></button>
                      {/* Hooked up handleDelete here */}
                      <button onClick={() => handleDelete(row.id)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}