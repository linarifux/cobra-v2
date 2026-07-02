import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react'; 

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ScrollToTop from '../components/ScrollToTop'; 

export default function DashboardLayout() {
  // Smart initialization: Sidebar open by default only on desktop/tablets
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  
  const scrollRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Automatically adjust sidebar state when the window is resized
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    // Changed to 100dvh (Dynamic Viewport Height) to fix mobile browser URL bar clipping
    <div className="relative flex h-[100dvh] bg-slate-50 overflow-hidden font-sans selection:bg-brand-gold/30 selection:text-brand-black z-0">
      
      {/* Background layer remains intact */}
      <div className="absolute inset-0 z-[-1] pointer-events-none bg-slate-50">
        <div className="absolute top-0 -left-1/4 w-[150%] h-96 bg-gradient-to-br from-brand-gold/10 via-transparent to-brand-gold/5 blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-0 -right-1/4 w-[150%] h-96 bg-gradient-to-tl from-slate-300/30 via-transparent to-brand-gold/10 blur-[100px] mix-blend-multiply" />
      </div>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden bg-white/20 backdrop-blur-[4px]">
        <Topbar onSearch={handleSearch} />
        
        <main 
          ref={scrollRef} 
          className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide perspective-1000"
        >
          {/* Added pb-24 on mobile so content doesn't hide behind the floating buttons */}
          <div key={location.pathname} className="animate-slide-in-right h-full transform-gpu pb-24 md:pb-0">
            <Outlet />
          </div>
        </main>
      </div>

      <ScrollToTop scrollContainerRef={scrollRef} />

      {/* Mobile Menu FAB - Only visible on small screens when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed bottom-6 left-6 z-[40] h-14 w-14 flex items-center justify-center bg-slate-900 text-brand-gold rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-700 active:scale-95 transition-all duration-300"
          aria-label="Open Menu"
        >
          <Menu size={24} />
        </button>
      )}
    </div>
  );
}