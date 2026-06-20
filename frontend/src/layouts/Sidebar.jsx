import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileSpreadsheet, 
  Truck,
  UserCheck,
  ShelvingUnit,
  Package, 
  Settings, 
  Menu,
  ShieldCheck,
  LayoutGrid,
  Box,
  UserCircle 
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
  { name: 'Inventory', href: '/inventory', icon: Box },
  { name: 'Receiving', href: '/receiving', icon: Truck },
  { name: 'Customers', href: '/customers', icon: UserCheck },
  // { name: 'Divisions', href: '/divisions', icon: LayoutGrid },
  { name: 'Locations', href: '/locations', icon: ShelvingUnit },
  { name: 'Carriers', href: '/carriers', icon:  Box},
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
      {/* Background Layering System */}
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
            COBRA <span className="text-brand-gold font-light bg-gray-500 p-2 rounded-xl">2.0</span>
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
                  <div className={cn(
                    "absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full transition-all duration-300 origin-left z-20",
                    isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                  )} />

                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/95 to-brand-gold/50 opacity-100 rounded-2xl transition-opacity duration-500" />
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl mix-blend-overlay" />
                    </>
                  )}
                  
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
                  
                  <span className={cn(
                    "whitespace-nowrap font-bold tracking-wide relative z-10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] drop-shadow-md",
                    isOpen ? "ml-4 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-6 hidden absolute"
                  )}>
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Terminal Node / User Profile Dock */}
      <div className={cn(
        "relative z-10 p-4 border-t border-white/5 transition-all duration-500",
        isOpen ? "flex items-center gap-4" : "flex justify-center"
      )}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center border border-white/10 shadow-inner">
          <UserCircle className="text-brand-gold" size={24} />
        </div>
        <div className={cn(
          "overflow-hidden transition-all duration-500",
          isOpen ? "w-auto opacity-100" : "w-0 opacity-0"
        )}>
          <p className="text-xs font-black text-white uppercase tracking-wider">Admin</p>
          <p className="text-[10px] text-slate-400 font-bold">System Manager</p>
        </div>
      </div>
      
    </div>
  );
}