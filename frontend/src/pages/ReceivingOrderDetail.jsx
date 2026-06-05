import { useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { 
  ArrowLeft, Printer, Package, Calendar, FileText, 
  CheckCircle2, Info, Building2, MapPin, Weight, Clock
} from 'lucide-react';

// Centralized Inventory Master Data (matching dashboard registry)
const INVENTORY_ITEMS = [
  { name: 'Probiotic Blend', sku: 'PRO-001', defaultWeight: 2.50 },
  { name: 'Safety Caps', sku: 'CAP-005', defaultWeight: 0.05 },
  { name: 'Product Labels', sku: 'LAB-992', defaultWeight: 0.02 },
  { name: 'Shipping Box L', sku: 'BOX-002', defaultWeight: 0.45 },
  { name: 'Extract A', sku: 'EXT-003', defaultWeight: 1.20 },
  { name: 'Tape Roll 2"', sku: 'TAP-004', defaultWeight: 0.15 },
];

// Simulated Database Source with advanced line item configs
const MOCK_ORDERS = [
  {
    id: "538",
    orderDate: "2026-05-10",
    expectedDelivery: "2026-05-12",
    customer: "Joff Company - Global Distribution",
    warehouse: "Dhaka Central Hub - Sector A",
    location: "Aisle 1-A (Rack)",
    status: "Received",
    notes: "Handle with care. Temperature sensitive items included.",
    items: [
      { name: "Probiotic Blend", cartons: 200, unitsPerCarton: 25, qty: 5000, received: 5000, condition: "Perfect" },
      { name: "Safety Caps", cartons: 10, unitsPerCarton: 80, qty: 800, received: 750, condition: "Partial" },
      { name: "Product Labels", cartons: 100, unitsPerCarton: 100, qty: 10000, received: 10000, condition: "Perfect" },
    ],
    logs: [
      { time: "10:30 AM", event: "Inventory finalized by Warehouse Manager", user: "Naimul Islam" },
      { time: "09:15 AM", event: "Physical QC passed", user: "Inspection Team" },
      { time: "07:00 AM", event: "Arrival at Dock B", user: "System" },
    ]
  }
];

export default function ReceivingOrderDetail() {
  const { id } = useParams();
  
  const order = useMemo(() => {
    return MOCK_ORDERS.find((o) => o.id === id);
  }, [id]);

  // Enriched items containing automatically resolved inventory weights & calculations
  const enrichedItems = useMemo(() => {
    if (!order) return [];
    return order.items.map(item => {
      const match = INVENTORY_ITEMS.find(inv => inv.name === item.name);
      const unitWeight = match ? match.defaultWeight : 0;
      const sku = match ? match.sku : 'N/A';
      const totalLineWeight = item.received * unitWeight;
      
      return {
        ...item,
        sku,
        unitWeight,
        totalLineWeight
      };
    });
  }, [order]);

  // Dynamically calculate the global order weight from total resolved line values
  const calculatedTotalWeight = useMemo(() => {
    const totalKg = enrichedItems.reduce((acc, curr) => acc + curr.totalLineWeight, 0);
    return totalKg > 0 ? `${totalKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '0.00 kg';
  }, [enrichedItems]);

  if (!order) {
    return <div className="p-20 text-center text-slate-500 font-bold">Order #{id} not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/receiving" className="p-2 bg-white/50 hover:bg-white/80 border border-white/60 rounded-xl transition-all shadow-sm">
            <ArrowLeft className="text-slate-600" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">Order #{order.id}</h1>
              <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wide ${order.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {order.status}
              </span>
            </div>
            <p className="text-slate-500 font-medium">Internal Reference: RX-{order.id}-2026</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-white/60 hover:bg-white/80 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all">
            <FileText size={16} /> PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-gold/20 transition-all">
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Customer', val: order.customer.split(' - ')[0], icon: Building2 },
          { label: 'Warehouse', val: order.warehouse.split(' - ')[0], icon: Building2 },
          { label: 'Storage Location', val: order.location || 'Unassigned', icon: MapPin },
          { label: 'Total Weight', val: calculatedTotalWeight, icon: Weight }, // Dynamic updated metric
          { label: 'Expected', val: order.expectedDelivery, icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-white/60 rounded-lg text-brand-gold shrink-0"><stat.icon size={20} /></div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">{stat.label}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Items & Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-white/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Inventory Items</h3>
              <span className="text-xs font-bold text-slate-400">{enrichedItems.length} Unique SKUs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[650px]">
                <thead>
                  <tr className="bg-white/20">
                    <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Item Details</th>
                    <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Pack Configuration</th>
                    <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Expected / Received</th>
                    <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Item Wt</th>
                    <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Total Wt</th>
                    <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {enrichedItems.map((item, i) => (
                    <tr key={i} className="hover:bg-white/30 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 font-mono font-semibold">{item.sku}</p>
                      </td>
                      <td className="p-4 text-center text-xs font-bold text-slate-600">
                        {item.cartons} ctn <span className="text-slate-400 font-normal">×</span> {item.unitsPerCarton} units
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-xs font-bold text-slate-400 line-through decoration-slate-300">{item.qty.toLocaleString()}</div>
                        <div className="text-sm font-black text-emerald-700">{item.received.toLocaleString()}</div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-500 text-right">
                        {item.unitWeight.toFixed(2)}
                      </td>
                      <td className="p-4 text-sm font-black text-slate-900 text-right">
                        {item.totalLineWeight.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${item.condition === 'Perfect' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info className="text-brand-gold" size={18} />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Internal Notes</h3>
            </div>
            <p className="text-sm font-medium text-slate-600 bg-white/30 p-4 rounded-xl">{order.notes}</p>
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-sm h-fit">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6">Activity Audit</h3>
          <div className="space-y-6">
            {order.logs.map((log, i) => (
              <div key={i} className="relative flex gap-4 pl-2">
                {i !== order.logs.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-white/60" />
                )}
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} className="text-brand-gold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{log.event}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">{log.time} • {log.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}