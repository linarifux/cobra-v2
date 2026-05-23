import { MoreVertical, ExternalLink, Activity } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function RecentActivityTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="relative overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-12 text-center group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-300/30 rounded-full blur-[80px] animate-aurora pointer-events-none -z-10" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse-slow">No recent activity found.</p>
      </div>
    );
  }

  return (
    <div className="relative bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl overflow-hidden group/table z-0 flex flex-col">
      
      {/* Aurora Ambient Background Layer */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-brand-gold/5 rounded-full blur-[80px] animate-aurora pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-slate-400/10 rounded-full blur-[100px] animate-aurora-reverse pointer-events-none -z-10" />

      {/* Header Section */}
      <div className="px-6 py-5 border-b border-white/40 flex justify-between items-center relative z-10 bg-white/20 backdrop-blur-md">
        <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-40"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-gold shadow-[0_0_8px_rgba(184,134,69,0.6)]"></span>
          </span>
          Recent Operational Activity
        </h3>
        <button className="text-xs font-bold text-brand-gold hover:text-brand-gold-hover flex items-center gap-1 transition-all hover:bg-brand-gold/10 px-3 py-1.5 rounded-lg group">
          View All 
          <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto relative z-10 flex-1">
        <table className="w-full text-sm text-left text-slate-600 border-collapse">
          
          {/* Table Head (Glassmorphism sub-layer) */}
          <thead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-50/40 backdrop-blur-md border-b border-white/40 shadow-sm sticky top-0 z-20">
            <tr>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Client / Division</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Carrier</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          
          {/* Table Body (Kinetic Entrance) */}
          <tbody className="divide-y divide-white/40">
            {data.map((row, index) => (
              <tr 
                key={row.id} 
                className="hover:bg-white/60 transition-all duration-300 group animate-slide-in-right relative"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                {/* Left Accent Bar on Hover */}
                <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-gold scale-y-0 group-hover:scale-y-100 transition-transform origin-center"></td>
                
                <td className="px-6 py-4.5 font-bold text-slate-900 group-hover:text-brand-gold transition-colors whitespace-nowrap">
                  {row.id}
                </td>
                <td className="px-6 py-4.5 font-medium text-slate-700">
                  {row.client}
                </td>
                <td className="px-6 py-4.5">
                  <div className="group-hover:scale-[1.02] transition-transform origin-left">
                    <StatusBadge status={row.status} />
                  </div>
                </td>
                <td className="px-6 py-4.5 font-semibold text-slate-700 flex items-center gap-2">
                  {row.carrier !== '-' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  )}
                  {row.carrier}
                </td>
                <td className="px-6 py-4.5 text-xs font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wider">
                  {row.time}
                </td>
                <td className="px-6 py-4.5 text-right">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-brand-gold/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm border border-transparent hover:border-brand-gold/20">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
      
    </div>
  );
}