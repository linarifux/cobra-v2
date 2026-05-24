import React from 'react';
import { Package } from 'lucide-react';

export default function InventoryTab() {
  const inventory = [
    { sku: 'GL-101', name: 'Leather Satchel', stock: 45, status: 'In Stock' },
    { sku: 'GL-102', name: 'Travel Wallet', stock: 12, status: 'Low Stock' },
  ];

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-400 border-b border-white/20">
          <th className="pb-3 text-left">SKU</th>
          <th className="pb-3 text-left">Item Name</th>
          <th className="pb-3 text-right">Stock</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/20">
        {inventory.map(item => (
          <tr key={item.sku}>
            <td className="py-4 font-bold">{item.sku}</td>
            <td className="py-4">{item.name}</td>
            <td className="py-4 text-right font-black">{item.stock}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}