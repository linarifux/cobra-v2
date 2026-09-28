import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BillingTable({
  filteredOrders,
  selectedIds,
  handleSelectAll,
  handleSelectRow
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white/50 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[1300px] border-collapse">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                  className="w-[18px] h-[18px] rounded border-slate-300 accent-brand-gold cursor-pointer"
                />
              </th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900">Date</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900">Customer / Division</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900">Order/Receiver #</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900">Charge Type</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Quantity</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Weight (lbs)</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Packages</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Carton Fee</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Total Order Processing</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Shipping Fee</th>
              <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Charge Total</th>
              <th className="px-6 py-4 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length > 0 ? filteredOrders.map((order) => {
              
              // Safe Data Extraction
              const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
              const customerName = order.customer?.customerName || 'Unknown';
              const divisionName = order.division?.divisionName || 'All';
              
              // Metrics
              const totalItems = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
              const weightLbs = ((order.shippingDetails?.totalWeightOunces || 0) / 16).toFixed(2);
              const boxes = order.shippingDetails?.totalBoxes || 0;
              
              // Fees
              const cartonFee = order.processingFees?.cartonSurcharge || 0;
              const processingFee = order.processingFees?.totalProcessingFee || 0;
              const shippingFee = order.shippingDetails?.shippingCost || 0;
              const grandTotal = processingFee + shippingFee;

              return (
                <tr 
                  key={order._id} 
                  className={`transition-colors duration-150 group ${selectedIds.includes(order._id) ? 'bg-brand-gold/5' : 'hover:bg-white/40'}`}
                >
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(order._id)}
                      onChange={() => handleSelectRow(order._id)}
                      className="w-[18px] h-[18px] rounded border-slate-300 accent-brand-gold cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{date}</td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                    {customerName} / {divisionName}
                  </td>
                  <td className="px-3 py-4 text-xs font-bold text-slate-800 whitespace-nowrap">
                    {order.orderNumber}
                  </td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600">
                    Processing
                  </td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{totalItems}</td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{weightLbs}</td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{boxes}</td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{cartonFee.toFixed(2)}</td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{processingFee.toFixed(2)}</td>
                  <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{shippingFee.toFixed(2)}</td>
                  <td className="px-3 py-4 text-xs font-bold text-slate-900 text-right">
                    ${grandTotal.toFixed(2)}
                  </td>
                  
                  <td className="px-6 py-3 text-center align-middle">
                    <div className="flex flex-col items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="w-14 py-1 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded transition-colors shadow-sm" 
                        title="View/Edit Order"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="13" className="px-6 py-16 text-center text-slate-500 font-medium bg-white/20">
                  No unbilled orders found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}