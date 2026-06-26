import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit2, Trash2 } from 'lucide-react';

export default function ReceivingTable({ filteredData, openEditModal, handleDelete }) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] min-h-[400px]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-50/50">
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">RCV ID</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Code</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Item</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Locations</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Wt (lbs)</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Skids</th>
              <th className="p-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {filteredData.length > 0 ? (
              filteredData.map((row) => (
                <tr key={row._id} className="hover:bg-white/80 transition-colors group">
                  <td className="p-5 text-xs font-bold text-slate-500 whitespace-nowrap">
                    {new Date(row.dateReceived).toLocaleDateString()}
                  </td>
                  <td className="p-5 text-xs font-mono font-black text-brand-gold tracking-wider bg-brand-gold/5 rounded-xl m-2 inline-flex border border-brand-gold/10">
                    {row.receivingId}
                  </td>
                  <td className="p-5 text-sm font-black text-slate-800">
                    <div>{row.vendor}</div>
                    {row.carrier && <div className="text-[10px] text-slate-400 uppercase mt-0.5">VIA: {row.carrier}</div>}
                  </td>
                  <td className="p-5 text-sm font-semibold text-slate-600">{row.customer?.customerName || '—'}</td>
                  <td className="p-5 text-[12px] text-slate-600">{row?.inventoryItem?.sku || '—'}</td>
                  <td className="p-5 text-sm font-bold text-slate-900">
                    <div className="flex flex-col">
                      <span>{row.inventoryItem?.itemName || '—'}</span>
                      {row.lot && row.lot !== 'N/A' && <span className="text-[10px] text-slate-400 font-mono mt-0.5">Lot: {row.lot}</span>}
                    </div>
                  </td>
                  <td className="p-5 text-xs font-bold text-slate-600">
                    {row.locations?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.locations.map((loc, i) => (
                          <span key={i} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-[9px] uppercase">
                            {loc.designation || loc}
                          </span>
                        ))}
                      </div>
                    ) : row.location?.designation ? (
                      <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{row.location.designation}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-5 text-sm font-black text-emerald-700 text-center">
                    {Number(row.quantity).toLocaleString()}
                  </td>
                  <td className="p-5 text-sm font-black text-slate-700 text-center">
                    {Number(row.totalWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-5 text-sm font-bold text-slate-600 text-center">
                    {row.skids}
                  </td>
                  <td className="p-5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link to={`/receiving/${row._id}`} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-brand-gold transition-colors border border-transparent hover:border-slate-100 shadow-sm"><Eye size={16} /></Link>
                      <button onClick={() => openEditModal(row)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-brand-gold transition-colors border border-transparent hover:border-slate-100 shadow-sm"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(row._id)} className="p-2 hover:bg-red-50 hover:border-red-100 rounded-xl text-slate-400 hover:text-red-500 transition-colors border border-transparent shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* Updated colSpan from 9 to 10 to account for the new column */}
                <td colSpan="10" className="py-16 text-center text-slate-400 font-bold text-sm bg-white/30">
                  No receiving logs found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}