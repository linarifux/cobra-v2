import React from "react";
import { Hash, Globe, Briefcase, Building2 } from "lucide-react";

export default function NetSuiteOrderMetadataBar({
  legacyNumber,
  orderSource,
  customerName,
  divisionName,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 px-4 py-3 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Hash size={11} className="text-indigo-500" /> Legacy Number
        </p>
        <p className="text-xs font-mono font-black text-indigo-600 mt-1 truncate">
          {legacyNumber || "N/A"}
        </p>
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 px-4 py-3 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Globe size={11} className="text-purple-500" /> Order Source
        </p>
        <div className="mt-1">
          <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-md">
            {orderSource || "NETSUITE"}
          </span>
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 px-4 py-3 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Briefcase size={11} className="text-brand-gold" /> Customer
        </p>
        <p className="text-xs font-black text-slate-800 mt-1 truncate">
          {customerName || "N/A"}
        </p>
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 px-4 py-3 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Building2 size={11} className="text-brand-gold" /> Division
        </p>
        <p className="text-xs font-black text-slate-800 mt-1 truncate">
          {divisionName || "N/A"}
        </p>
      </div>
    </div>
  );
}