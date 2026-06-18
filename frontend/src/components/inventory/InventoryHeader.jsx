import React from 'react';
import { Package, PlusCircle } from 'lucide-react';

export default function InventoryHeader({ onAddClick }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Package size={24} className="text-slate-800" /> Customer Stock Inventory
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Track quantities, logistics, deposited items, and product assets linked to customer portal orders.
        </p>
      </div>
      <button 
        onClick={onAddClick} 
        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm uppercase tracking-wider"
      >
        <PlusCircle size={15} /> Add New Asset Item
      </button>
    </div>
  );
}