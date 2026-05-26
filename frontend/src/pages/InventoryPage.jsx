import React, { useState, useMemo } from 'react';
import { Search, PlusCircle, Filter, Package, Trash2, Edit } from 'lucide-react';

export default function InventoryPage() {
  const [inventory] = useState([
    { id: 1, code: '61943', desc: 'Hy-D vs. Bio-D Comparison', vendor: 'DSM', division: 'Animal Nutrition', category: 'Supplements', price: 0.00, available: 325, onOrder: 0 },
    { id: 2, code: 'A0091', desc: 'MaxiChick', vendor: 'DSM', division: 'Animal Nutrition', category: 'Feeds', price: 0.00, available: 30, onOrder: 10 },
    { id: 3, code: 'A0200', desc: 'White Paper', vendor: 'Client A', division: 'Human Nutrition', category: 'Marketing', price: 0.00, available: 155, onOrder: 0 },
  ]);

  // Filter States
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Filter Logic
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.desc.toLowerCase().includes(search.toLowerCase()) || item.code.includes(search);
      const matchesVendor = vendorFilter === 'All' || item.vendor === vendorFilter;
      const matchesDivision = divisionFilter === 'All' || item.division === divisionFilter;
      const matchesStock = onlyAvailable ? item.available > 0 : true;
      return matchesSearch && matchesVendor && matchesDivision && matchesStock;
    });
  }, [search, vendorFilter, divisionFilter, onlyAvailable, inventory]);

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm">Track stock levels across all divisions and vendors.</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all">
          <PlusCircle size={16} /> Add New Item
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-4 rounded-3xl flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input 
            placeholder="Search code or description..." 
            className="w-full bg-white/50 pl-10 pr-4 py-2 rounded-xl text-sm font-bold border border-white/50"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select className="bg-white/50 px-4 py-2 rounded-xl text-xs font-black border border-white/50" onChange={(e) => setVendorFilter(e.target.value)}>
          <option value="All">All Vendors</option>
          <option value="DSM">DSM</option>
          <option value="Client A">Client A</option>
        </select>

        <select className="bg-white/50 px-4 py-2 rounded-xl text-xs font-black border border-white/50" onChange={(e) => setDivisionFilter(e.target.value)}>
          <option value="All">All Divisions</option>
          <option value="Animal Nutrition">Animal Nutrition</option>
          <option value="Human Nutrition">Human Nutrition</option>
        </select>

        <label className="flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer">
          <input type="checkbox" className="rounded" onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Show Only Available
        </label>
      </div>

      {/* Table */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-black/5">
            <tr>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Code</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Description</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Division</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Price</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500">Available</th>
              <th className="p-6 text-xs font-black uppercase text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-white/30 transition-colors">
                <td className="p-6 font-mono text-sm font-bold text-slate-900">{item.code}</td>
                <td className="p-6 text-sm font-bold text-slate-700">{item.desc}</td>
                <td className="p-6 text-xs font-black text-slate-500 uppercase">{item.division}</td>
                <td className="p-6 text-sm font-bold text-slate-700">${item.price.toFixed(2)}</td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded-lg text-xs font-black ${item.available > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.available}
                  </span>
                </td>
                <td className="p-6 flex justify-end gap-2">
                  <button className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><Edit size={16} /></button>
                  <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}