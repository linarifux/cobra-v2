import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit2, Trash2, PackageSearch } from 'lucide-react';

export default function ReceivingTable({ filteredData, openEditModal, handleDelete }) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] min-h-[400px] p-3 lg:p-0 relative">
      {/* Wrapper enables horizontal scrolling, but keeps our right column locked */}
      <div className="overflow-x-auto custom-scrollbar">
        
        {/* lg:min-w-[1200px] ensures columns have breathing room on desktop before scrolling */}
        <table className="w-full text-left border-collapse lg:min-w-[1200px] relative">
          
          <thead className="hidden lg:table-header-group">
            <tr className="border-b border-slate-200/60 bg-slate-50/80">
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">RCV ID</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer/Divison</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Code</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Inventory Item</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Locations</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Wt (lbs)</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Skids</th>
              
              {/* STICKY HEADER: Locked to the right */}
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky right-0 bg-slate-50/95 backdrop-blur-sm z-20 border-l border-slate-200/60 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-transparent lg:divide-slate-100/60">
            {filteredData.length > 0 ? (
              filteredData.map((row) => {
                
                // Safely extract populated vendor/carrier logic
                const vendorName = row.vendor?.vendorName || row.fallbackVendor || 'Unknown Vendor';
                const carrierName = row.carrier?.carrierName || row.fallbackCarrier || '';

                return (
                  <tr 
                    key={row._id} 
                    className="block lg:table-row bg-white lg:bg-transparent border border-slate-200/50 lg:border-none shadow-sm lg:shadow-none rounded-3xl lg:rounded-none mb-4 lg:mb-0 p-2 lg:p-0 hover:bg-slate-50/50 transition-colors group relative"
                  >
                    
                    {/* Date */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        {new Date(row.dateReceived).toLocaleDateString()}
                      </span>
                    </td>

                    {/* RCV ID */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">RCV ID</span>
                      <span className="text-xs font-mono font-black text-brand-gold tracking-wider bg-brand-gold/5 rounded-xl px-2 py-1 lg:py-1.5 inline-flex border border-brand-gold/10 whitespace-nowrap">
                        {row.receivingId}
                      </span>
                    </td>

                    {/* Vendor & Carrier */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</span>
                      <div className="text-right lg:text-left text-sm font-black text-slate-800">
                        <div>{vendorName}</div>
                        {carrierName && <div className="text-[10px] text-slate-400 uppercase mt-0.5">VIA: {carrierName}</div>}
                      </div>
                    </td>

                    {/* Customer / Division */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer / Div</span>
                      <div className="text-right lg:text-left flex flex-col text-sm font-semibold text-slate-600">
                        <span>{row.customer?.customerName || '—'}</span>
                        <span className='text-[10px] uppercase tracking-widest text-slate-400 font-bold'>{row?.inventoryItem?.division?.divisionName}</span>
                      </div>
                    </td>

                    {/* Item Code */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Code</span>
                      <span className="text-[12px] text-slate-600 font-mono font-bold">{row?.inventoryItem?.sku || '—'}</span>
                    </td>

                    {/* Inventory Item */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Item</span>
                      <div className="text-right lg:text-left flex flex-col text-sm font-bold text-slate-900">
                        <span>{row.inventoryItem?.itemName || '—'}</span>
                        {row.lot && row.lot !== 'N/A' && <span className="text-[10px] text-slate-400 font-mono mt-0.5">Lot: {row.lot}</span>}
                      </div>
                    </td>

                    {/* Locations */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Locations</span>
                      <div className="text-xs font-bold text-slate-600">
                        {row.locations?.length > 0 ? (
                          <div className="flex flex-wrap justify-end lg:justify-start gap-1">
                            {row.locations.map((loc, i) => (
                              <span key={i} className="bg-white border border-slate-200 shadow-sm px-1.5 py-0.5 rounded-md text-[9px] uppercase">
                                {loc.designation || loc}
                              </span>
                            ))}
                          </div>
                        ) : row.location?.designation ? (
                          <span className="bg-white shadow-sm border border-slate-200 px-2 py-1 rounded-md">{row.location.designation}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</span>
                      <span className="text-sm font-black text-emerald-600 lg:text-center block lg:w-full bg-emerald-50 lg:bg-transparent px-2 py-0.5 rounded-md">
                        {Number(row.quantity).toLocaleString()}
                      </span>
                    </td>

                    {/* Total Wt */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 border-b border-slate-100/60 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Wt (lbs)</span>
                      <span className="text-sm font-black text-slate-700 lg:text-center block lg:w-full">
                        {Number(row.totalWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Skids / Pallets */}
                    <td className="flex lg:table-cell justify-between items-center py-2.5 px-3 lg:p-5 lg:border-none">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Skids</span>
                      <span className="text-sm font-bold text-slate-600 lg:text-center block lg:w-full">
                        {row.pallets || row.skids || 0}
                      </span>
                    </td>

                    {/* STICKY ACTIONS BODY CELL: Locked to the right on desktop, footer on mobile */}
                    <td className="flex lg:table-cell justify-between lg:justify-center items-center py-3 px-3 lg:p-5 mt-2 lg:mt-0 bg-slate-50 lg:bg-white lg:group-hover:bg-slate-50 rounded-b-2xl lg:rounded-none border-t border-slate-100/80 lg:border-t-0 lg:border-l lg:border-slate-200/60 lg:sticky lg:right-0 lg:shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] lg:z-10 transition-colors">
                      <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage Record</span>
                      
                      <div className="flex justify-end lg:justify-center gap-2 lg:gap-1 lg:opacity-60 lg:group-hover:opacity-100 transition-opacity">
                        <Link 
                          to={`/receiving/${row._id}`} 
                          className="p-2.5 lg:p-2 bg-white lg:bg-transparent rounded-xl text-brand-gold lg:text-slate-400 hover:text-brand-gold lg:hover:bg-white transition-colors border border-slate-200 lg:border-transparent hover:border-slate-300 lg:hover:border-slate-200 shadow-sm"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </Link>
                        <button 
                          onClick={() => openEditModal(row)} 
                          className="p-2.5 lg:p-2 bg-white lg:bg-transparent rounded-xl text-blue-500 lg:text-slate-400 hover:text-blue-600 lg:hover:text-brand-gold lg:hover:bg-white transition-colors border border-slate-200 lg:border-transparent hover:border-slate-300 lg:hover:border-slate-200 shadow-sm"
                          title="Edit Log"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(row._id)} 
                          className="p-2.5 lg:p-2 bg-white lg:bg-transparent rounded-xl text-red-500 lg:text-slate-400 hover:text-red-600 lg:hover:text-red-500 lg:hover:bg-red-50 transition-colors border border-red-100 lg:border-transparent hover:border-red-200 shadow-sm"
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" className="block lg:table-cell py-24 text-center text-slate-400 bg-white/30 rounded-3xl lg:rounded-none">
                  <div className="flex flex-col items-center justify-center">
                    <PackageSearch size={48} className="text-slate-300 mb-3" />
                    <span className="font-bold text-sm text-slate-500">No receiving logs found matching your criteria.</span>
                    <span className="text-xs mt-1">Try adjusting your filters to see more results.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}