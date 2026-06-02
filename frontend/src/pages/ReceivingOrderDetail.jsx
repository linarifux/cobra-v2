import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Printer, Package, Calendar, FileText, 
  CheckCircle2, Info, Building2, MapPin, Weight, Clock
} from 'lucide-react';

// This will come from an API or Global State
const MOCK_ORDERS = [
  {
    id: "538",
    orderDate: "2026-05-10",
    expectedDelivery: "2026-05-12",
    supplier: "Joff Company - Global Distribution",
    warehouse: "Dhaka Central Hub - Sector A",
    status: "Received",
    totalWeight: "1,250 kg",
    notes: "Handle with care. Temperature sensitive items included.",
    items: [
      { sku: "PRO-001", name: "Probiotic Blend", qty: 5000, received: 5000, condition: "Perfect" },
      { sku: "CAP-005", name: "Safety Caps", qty: 800, received: 750, condition: "Partial" },
      { sku: "LAB-992", name: "Product Labels", qty: 10000, received: 10000, condition: "Perfect" },
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
  const order = MOCK_ORDERS.find((o) => o.id === id);

  if (!order) {
    return <div className="p-20 text-center text-slate-500 font-bold">Order #{id} not found.</div>;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/receiving-orders" className="p-2 bg-white/50 hover:bg-white/80 border border-white/60 rounded-xl transition-all shadow-sm">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Supplier', val: 'Joff Co.', icon: Building2 },
          { label: 'Warehouse', val: 'Dhaka Central', icon: MapPin },
          { label: 'Weight', val: order.totalWeight, icon: Weight },
          { label: 'Expected', val: order.expectedDelivery, icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-white/60 rounded-lg text-brand-gold"><stat.icon size={20} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
              <p className="text-sm font-bold text-slate-900">{stat.val}</p>
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
              <span className="text-xs font-bold text-slate-400">{order.items.length} Unique SKUs</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/20">
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Item Details</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase text-right">Expected</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase text-right">Received</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {order.items.map((item, i) => (
                  <tr key={i} className="hover:bg-white/30 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-600 text-right">{item.qty}</td>
                    <td className="p-4 text-sm font-bold text-emerald-700 text-right">{item.received}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full ${item.condition === 'Perfect' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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