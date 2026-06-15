import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-slate-50/50">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-slate-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main 404 Card */}
      <div className="relative z-10 max-w-lg w-full bg-white/60 backdrop-blur-2xl border border-white p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] text-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* Icon & 404 Text */}
        <div className="flex justify-center mb-6 relative">
          <div className="relative flex items-center justify-center w-24 h-24 bg-red-50 rounded-3xl border border-red-100 shadow-inner">
            <AlertOctagon size={48} className="text-red-500" strokeWidth={1.5} />
            <div className="absolute -bottom-3 -right-3 bg-slate-900 text-brand-gold text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-widest border border-slate-700">
              Error 404
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
          Signal Lost
        </h1>
        
        <p className="text-sm font-semibold text-slate-500 mb-10 leading-relaxed max-w-sm mx-auto">
          The coordinates you entered do not match any known routing nodes in the COBRA network. The page may have been moved or deleted.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => navigate(-1)} // Goes back one step in browser history
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            <ArrowLeft size={16} />
            Reverse Course
          </button>
          
          <button 
            onClick={() => navigate('/')} // Forces routing back to the dashboard home
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-brand-gold bg-slate-900 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
          >
            <Home size={16} />
            Command Center
          </button>
        </div>

      </div>
    </div>
  );
}