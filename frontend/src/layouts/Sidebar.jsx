import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileSpreadsheet, 
  Package, 
  Settings, 
  Menu,
  ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import '../styles/sidebar-animations.css'; 

function cn(...classes) {
  return twMerge(clsx(classes));
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Google Sheets', href: '/imports', icon: FileSpreadsheet },
  { name: 'ShipStation', href: '/shipping', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  return (
    <div 
      className={cn(
        "relative flex flex-col z-20 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] h-screen",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Background Layering System 
        Separated from the main flex container so overflow-hidden doesn't clip our custom tooltips
      */}
      <div className="absolute inset-0 bg-brand-black/40 backdrop-blur-3xl border-r border-white/10 shadow-[8px_0_32px_rgba(0,0,0,0.3)] overflow-hidden -z-10">
        <div className="absolute top-0 -left-1/2 w-[200%] h-64 bg-gradient-to-r from-brand-gold/10 via-transparent to-brand-gold/5 blur-3xl animate-aurora mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 -right-1/2 w-[200%] h-64 bg-gradient-to-r from-transparent via-slate-500/10 to-brand-gold/10 blur-3xl animate-aurora-reverse mix-blend-screen pointer-events-none" />
      </div>

      {/* Sidebar Header & Toggle */}
      <div className="relative z-10 flex items-center h-20 px-4 border-b border-white/5 transition-all duration-300">
        <div className={cn(
          "flex items-center transition-all duration-500 w-full",
          isOpen ? "justify-between" : "justify-center"
        )}>
          <span className={cn(
            "text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-slate-400 font-black tracking-[0.2em] overflow-hidden whitespace-nowrap drop-shadow-md transition-all duration-500",
            isOpen ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-8 hidden"
          )}>
            COBRA <span className="text-brand-gold font-light">II</span>
          </span>
          
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/20 text-slate-300 hover:text-brand-gold shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:shadow-[0_0_15px_rgba(184,134,69,0.3)] transition-all duration-300 border border-white/10 flex-shrink-0"
          >
            <Menu size={20} className="transition-transform duration-300 hover:rotate-180 drop-shadow-sm" />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-8 px-3 scrollbar-hide">
        <ul className="space-y-3">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <li 
                key={item.name} 
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn("relative", isOpen && "animate-slide-in-right")}
              >
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center py-3.5 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                    isOpen ? "px-4" : "justify-center px-0",
                    isActive 
                      ? "text-white shadow-[0_8px_32px_-8px_rgba(184,134,69,0.6)] border border-brand-gold/40" 
                      : "text-slate-100 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/20"
                  )}
                >
                  {/* Active State Highlight Line */}
                  <div className={cn(
                    "absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full transition-all duration-300 origin-left z-20",
                    isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                  )} />

                  {/* Dynamic Gradient Background for Active State */}
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/95 to-brand-gold/50 opacity-100 rounded-2xl transition-opacity duration-500" />
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl mix-blend-overlay" />
                    </>
                  )}
                  
                  {/* Icon */}
                  <div className="relative flex items-center justify-center">
                    <item.icon 
                      size={22} 
                      className={cn(
                        "min-w-[22px] relative z-10 transition-all duration-500 ease-out drop-shadow-md", 
                        isActive 
                          ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.9)] animate-pulse-slow" 
                          : "text-slate-300 group-hover:text-brand-gold group-hover:scale-110 group-hover:-rotate-3"
                      )} 
                    />
                  </div>
                  
                  {/* Text */}
                  <span className={cn(
                    "whitespace-nowrap font-bold tracking-wide relative z-10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] drop-shadow-md",
                    isOpen ? "ml-4 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-6 hidden absolute"
                  )}>
                    {item.name}
                  </span>
                </Link>

                {/* Custom Glassmorphism Tooltip for Closed State */}
                {!isOpen && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-white/10 text-white text-xs font-bold tracking-wide rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 whitespace-nowrap z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] translate-x-2 group-hover:translate-x-0">
                    {item.name}
                    {/* Tooltip Arrow */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-900/90"></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Terminal Node / User Profile Dock */}
      <div className="relative z-10 p-4 border-t border-white/5 bg-gradient-to-t from-brand-black/60 to-transparent">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          !isOpen && "justify-center"
        )}>
          {/* Avatar Base */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold to-amber-700 p-[1px] flex-shrink-0 cursor-pointer group">
            <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center transition-colors group-hover:bg-slate-800">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 font-black text-sm tracking-wider">NI</span>
            </div>
            {/* Status Indicator */}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-brand-black rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          </div>
          
          {/* Meta Details */}
          <div className={cn(
            "flex flex-col whitespace-nowrap overflow-hidden transition-all duration-500",
            isOpen ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-4 hidden"
          )}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-wide">Naimul Islam</span>
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
            </div>
            <span className="text-[10px] text-slate-400 font-black tracking-[0.15em] uppercase mt-0.5">
              CodeXym Admin
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}