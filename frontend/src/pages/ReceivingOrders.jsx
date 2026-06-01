import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Plus, Download, Trash2, Edit2, 
  CheckSquare, Square, Search, X, Eye, Calendar, User, Box, Truck, BarChart3
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
  
  // New Shipment Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer: '',
    item: '',
    qty: '',
    skids: ''
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Reactive Filtering Logic
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

  const handleAddShipment = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Math.floor(100 + Math.random() * 900),
      ...formData,
      qty: parseInt(formData.qty),
      skids: parseInt(formData.skids),
      status: 'Pending'
    };
    setData([newEntry, ...data]);
    setFormData({ date: new Date().toISOString().split('T')[0], customer: '', item: '', qty: '', skids: '' });
    setIsModalOpen(false);
  };

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
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Receiving Management</h1>
          <p className="text-slate-500 font-medium">Manage and confirm incoming shipments.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-white/60 hover:bg-white/80 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all"><Download size={16} /> Export</button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-gold/20 transition-all hover:-translate-y-0.5"
          >
            <Plus size={16} /> Add Shipment
          </button>
        </div>
      </div>

      {/* Add Shipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleAddShipment} className="relative w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">New Shipment Entry</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-gold outline-none" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Customer</label>
                <input required type="text" value={formData.customer} onChange={(e) => setFormData({...formData, customer: e.target.value})} placeholder="e.g. Joff Company" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-gold outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Inventory Item</label>
                <input required type="text" value={formData.item} onChange={(e) => setFormData({...formData, item: e.target.value})} placeholder="e.g. Probiotic Blend" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-gold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Quantity</label>
                <input required type="number" value={formData.qty} onChange={(e) => setFormData({...formData, qty: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-gold outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Skids</label>
                <input required type="number" value={formData.skids} onChange={(e) => setFormData({...formData, skids: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-gold outline-none" />
              </div>
            </div>

            <button type="submit" className="w-full mt-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-900/20">
              Submit Shipment
            </button>
          </form>
        </div>
      )}

      {/* 2. Interactive Filter Bar */}
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

      {/* 3. Bulk Action Bar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="font-bold text-sm flex items-center gap-2"><span className="bg-white/20 px-2 py-0.5 rounded-md">{selectedRows.length}</span> selected</p>
          <button onClick={confirmSelected} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold transition-colors">Confirm Selected</button>
        </div>
      )}

      {/* 4. Data Table */}
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
                      <Link to={`/receiving-orders/${row.id}`} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-gold transition-colors"><Eye size={16} /></Link>
                      <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-gold transition-colors"><Edit2 size={16} /></button>
                      <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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