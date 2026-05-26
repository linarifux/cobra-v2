import { useState, useRef } from 'react'; // 1. Import useRef
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ScrollToTop from '../components/ScrollToTop'; // 2. Import the component
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollRef = useRef(null); // 3. Create the ref
  
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="relative flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-brand-gold/30 selection:text-brand-black z-0">
      {/* ... Background code remains the same ... */}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden bg-white/20 backdrop-blur-[4px]">
        <Topbar onSearch={handleSearch} />
        
        {/* 4. Attach ref to main */}
        <main 
          ref={scrollRef} 
          className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide perspective-1000"
        >
          {/* ... Content ... */}
          <div key={location.pathname} className="animate-slide-in-right h-full transform-gpu">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 5. Add the Button here */}
      <ScrollToTop scrollContainerRef={scrollRef} />
    </div>
  );
}