import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet, useLocation } from 'react-router-dom';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Track location to re-trigger route animations
  const location = useLocation();

  return (
    // 1. Foundation: Immersive container with custom text selection colors
    <div className="relative flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-brand-gold/30 selection:text-brand-black z-0">
      
      {/* 2. Cinemagraph & Aurora Background (Global Layer) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Ambient vignette to focus the eye on the center of the application */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-100/30 to-slate-200/60 z-10" />
        
        {/* Moving Aurora Nodes - Scaled slightly for broader coverage */}
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-brand-gold/10 blur-[140px] animate-aurora mix-blend-multiply opacity-80" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-slate-300/40 blur-[150px] animate-aurora-reverse mix-blend-multiply opacity-80" />
      </div>

      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Main Content Area (Glassmorphic Pane) */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden bg-white/20 backdrop-blur-[4px] shadow-[inset_1px_0_0_rgba(255,255,255,0.4)] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
        
        {/* Top Glass Edge Highlight for physical depth */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent z-50 pointer-events-none" />

        <Topbar />
        
        {/* Scrollable Page Content */}
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide perspective-1000">
          
          {/* 3. Kinetic Typography Watermark: Deep background structural element */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[-1] select-none flex flex-col items-center justify-center w-full opacity-[0.02]">
            <span className="text-[25vw] font-black tracking-tighter leading-none text-slate-900 animate-pulse-slow">
              COBRA
            </span>
            <span className="text-[4vw] font-black tracking-[1em] text-brand-gold uppercase -mt-8 opacity-60">
              Command System
            </span>
          </div>

          {/* 4. Page Entrance Transition: Re-renders on route change */}
          <div 
            key={location.pathname} 
            className="animate-slide-in-right h-full transform-gpu" 
            style={{ animationDuration: '0.6s' }}
          >
            <Outlet />
          </div>
          
        </main>
      </div>
    </div>
  );
}