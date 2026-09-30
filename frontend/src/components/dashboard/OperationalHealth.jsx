import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight, Box } from 'lucide-react';

export default function OperationalHealth({ operationalStats }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-in-right" style={{ animationDelay: '200ms' }}>
      
      {/* Action Required */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl p-6 flex flex-col group">
        <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 flex items-center gap-2 mb-4">
          Action Required
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full shadow-inner ${operationalStats.actionRequired.length > 0 ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
            {operationalStats.actionRequired.length}
          </span>
        </h3>
        <div className="space-y-3 flex-1">
          {operationalStats.actionRequired.length > 0 ? operationalStats.actionRequired.map((alert) => (
            <div 
              key={alert.id} 
              onClick={() => navigate('/orders')}
              className="relative overflow-hidden flex flex-col p-4 rounded-2xl bg-white/50 border border-red-100/50 hover:border-red-300 hover:bg-red-50/50 transition-all cursor-pointer group/alert"
            >
              <div className="flex justify-between items-start mb-1 z-10">
                <span className="text-sm font-bold text-slate-900 transition-colors">{alert.id}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover/alert:text-red-500 group-hover/alert:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-red-600 font-bold z-10 truncate">
                <AlertTriangle className="w-4 h-4 animate-pulse-slow shrink-0" />
                <span className="truncate">{alert.issue}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-2 z-10 truncate">Client: {alert.client}</p>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">All Clear</p>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl p-6 flex flex-col">
        <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 flex items-center gap-2 mb-4">
          <Box className="w-5 h-5 text-brand-gold animate-pulse-slow" />
          Inventory Alerts
        </h3>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {operationalStats.inventoryAlerts.length > 0 ? (
            operationalStats.inventoryAlerts.map((item, idx) => (
              <div key={idx} onClick={() => navigate('/inventory')} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-orange-100/50 hover:bg-orange-50/50 hover:border-orange-200 transition-all cursor-pointer">
                <div className="min-w-0 pr-4">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{item.sku}</h4>
                  <p className="text-xs text-slate-500 font-medium truncate">{item.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg shadow-sm ${item.status === 'Critical' ? 'bg-red-500/10 text-red-600 border border-red-200/50' : 'bg-orange-500/10 text-orange-600 border border-orange-200/50'}`}>
                    {item.stock} left
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60 pt-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Stock Levels Healthy</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => navigate('/inventory')}
          className="w-full mt-4 text-sm font-bold text-brand-gold hover:text-white bg-brand-gold/10 hover:bg-brand-gold py-2.5 rounded-xl transition-all border border-brand-gold/20 hover:shadow-lg shadow-brand-gold/20"
        >
          Review Inventory
        </button>
      </div>

    </div>
  );
}