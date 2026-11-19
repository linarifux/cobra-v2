import React from "react";
import { Loader2 } from "lucide-react";

export default function NetSuiteOrderLoader({ isProcessing = false }) {
  return (
    <div className="h-full flex items-center justify-center min-h-[600px]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
        <p className="text-xs font-black uppercase tracking-widest">
          {isProcessing ? "Importing to COBRA..." : "Loading NetSuite Data..."}
        </p>
      </div>
    </div>
  );
}