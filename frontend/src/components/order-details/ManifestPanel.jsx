import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PackageCheck, Trash2, ChevronDown, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ManifestPanel({ items, setItems, inventoryData, inventoryStatus }) {
  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  
  const inventoryDropdownRef = useRef(null);

  const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(event.target)) {
        setIsInventoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableInventories = useMemo(() => {
    return inventoryData.map(inv => ({
      id: inv._id,
      name: inv.itemName || 'Unnamed Item',
      sku: inv.sku || '',
      price: inv.unitCost || inv.price || 0,
      weight: inv.weight || 0
    })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [inventoryData]);

  const filteredInventories = useMemo(() => {
    return availableInventories.filter(inv =>
      inv.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      inv.sku.toLowerCase().includes(inventorySearch.toLowerCase())
    );
  }, [availableInventories, inventorySearch]);

  const handleAddItem = () => {
    if (!newItem.name || newItem.price === undefined) return toast.error("Please select an item to add.");
    setItems(prev => [
      ...prev, 
      { 
        ...newItem, 
        id: generateLocalId(), 
        qty: Number(newItem.qty), 
        price: Number(newItem.price), 
        weight: Number(newItem.weight || 0) 
      }
    ]);
    setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  };

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-30">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
        <PackageCheck size={14} /> Edit Manifest Items
      </h3>
      
      <div className="space-y-4">
          {items.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl">
                  No items added to this order yet.
              </div>
          )}
          
          {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-slate-100 group">
                  <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{item.sku}</p>
                  </div>
                  <div className="w-16 shrink-0">
                      <input 
                          type="number" 
                          min="1" 
                          className="w-full bg-white border border-slate-200 rounded-lg text-center text-xs font-bold py-1.5 outline-none focus:border-brand-gold shadow-sm"
                          value={item.qty}
                          onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setItems(items.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
                          }}
                      />
                  </div>
                  <div className="w-20 shrink-0 text-right">
                      <p className="text-xs font-black text-slate-800">${(item.price * item.qty).toFixed(2)}</p>
                  </div>
                  <button 
                      onClick={() => setItems(items.filter(i => i.id !== item.id))} 
                      className="text-slate-300 hover:text-red-500 transition-colors duration-200 p-1 shrink-0"
                  >
                      <Trash2 size={16}/>
                  </button>
              </div>
          ))}

          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 shadow-inner space-y-3 mt-4">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Add Product</h4>
              
              <div className="relative w-full" ref={inventoryDropdownRef}>
                <div
                  className={`w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus-within:border-brand-gold shadow-sm flex items-center justify-between transition-all ${inventoryStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => { if (inventoryStatus !== 'loading') setIsInventoryDropdownOpen(!isInventoryDropdownOpen); }}
                >
                  <span className={newItem.name ? "text-slate-900" : "text-slate-400"}>
                    {newItem.name ? `${newItem.name} (SKU: ${newItem.sku})` : (inventoryStatus === 'loading' ? 'Loading Catalog...' : 'Select Item from Catalog...')}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>

                <AnimatePresence>
                  {isInventoryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                    >
                      <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                          autoFocus
                          className="w-full text-xs outline-none font-medium text-slate-700"
                          placeholder="Search by name or SKU..."
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredInventories.length > 0 ? (
                          filteredInventories.map(inv => (
                            <div
                              key={inv.id}
                              className="px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer flex flex-col transition-colors"
                              onClick={() => {
                                setNewItem({ ...newItem, name: inv.name, sku: inv.sku, price: inv.price, weight: inv.weight });
                                setIsInventoryDropdownOpen(false);
                                setInventorySearch('');
                              }}
                            >
                              <span className="font-bold">{inv.name}</span>
                              <span className="text-slate-400 text-[10px]">SKU: {inv.sku}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-400 text-center">No items found</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2">
                  <input 
                      type="number" 
                      min="1" 
                      className="w-20 bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 text-center outline-none focus:border-brand-gold shadow-sm" 
                      value={newItem.qty} 
                      onChange={(e) => setNewItem({...newItem, qty: e.target.value})} 
                  />
                  <div className="flex-1 bg-slate-100 p-2.5 rounded-lg text-xs font-black border border-slate-200 flex items-center justify-end text-slate-400 shadow-inner cursor-not-allowed">
                      {newItem.price ? `$${Number(newItem.price).toFixed(2)}` : '$0.00'}
                  </div>
                  <button 
                      onClick={handleAddItem} 
                      className="bg-slate-900 text-white px-4 rounded-lg hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center"
                  >
                      <Plus size={16}/>
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}