import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  Search, 
  Bell, 
  User, 
  ChevronDown, 
  Settings, 
  LogOut, 
  HelpCircle 
} from 'lucide-react';
import '../styles/sidebar-animations.css'; 

export default function Topbar() {
  return (
    // 1. Increased base opacity slightly (bg-white/40) to ensure the topbar elements stand out from the layout background
    <header className="sticky top-0 z-30 bg-white/40 backdrop-blur-2xl border-b border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex items-center justify-between px-4 sm:px-6 transition-all duration-500 ease-out">
      
      {/* Left Section: Global Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative group transition-all duration-500 ease-out">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-gold/0 via-brand-gold/30 to-brand-gold/0 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500 group-focus-within:text-brand-gold group-focus-within:scale-110 transition-all duration-300" />
          </div>
          
          <input
            type="text"
            // 2. Text contrast: Changed to text-slate-900 and font-semibold for crisp typing visibility
            className="block w-full pl-11 pr-14 py-2.5 border border-white/60 rounded-xl text-sm bg-white/50 backdrop-blur-md placeholder-slate-500 font-semibold text-slate-900 focus:outline-none focus:bg-white/90 focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative z-10"
            placeholder="Search orders, tracking, or clients..."
          />
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
            <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 border border-white/60 shadow-sm rounded-md text-[10px] font-sans font-bold text-slate-500 bg-white/70 backdrop-blur-sm">
              ⌘K
            </span>
          </div>
        </div>
      </div>

      {/* Right Section: Actions & Profile */}
      <div className="flex items-center space-x-3 sm:space-x-5 pl-4 sm:pl-6">
        
        {/* Notifications Button */}
        <button 
          className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-all duration-300 rounded-xl bg-white/50 border border-white/60 shadow-sm hover:shadow-[0_0_15px_rgba(184,134,69,0.2)] focus:outline-none backdrop-blur-md group"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5 animate-pulse-slow group-hover:animate-none group-hover:text-brand-gold transition-colors" />
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white"></span>
          </span>
        </button>

        {/* Glass Divider */}
        <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-slate-300/60 to-transparent" aria-hidden="true" />

        {/* Interactive Profile Dropdown */}
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="flex items-center space-x-2 sm:space-x-3 p-1.5 rounded-2xl focus:outline-none bg-white/40 hover:bg-white/70 border border-white/60 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-md pr-3 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-black to-slate-800 flex items-center justify-center border border-white/60 shadow-sm overflow-hidden relative group-hover:scale-105 transition-transform duration-300">
                <User className="h-4 w-4 text-brand-gold relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                {/* 3. Gradient text deepens on hover to ensure it remains legible against the lighter hover background */}
                <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 group-hover:from-slate-900 group-hover:to-brand-black leading-none tracking-wide transition-all">
                  Operations Admin
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold mt-1 leading-none">
                  System Manager
                </span>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-slate-500 group-hover:text-slate-900 transition-colors duration-300" />
            </Menu.Button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95 translate-y-2"
            enterTo="transform opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100 translate-y-0"
            leaveTo="transform opacity-0 scale-95 translate-y-2"
          >
            {/* 4. Dropdown Container: High opacity (bg-white/90) with a strong blur to block out distracting background elements */}
            <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl bg-white/90 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white focus:outline-none divide-y divide-slate-100 p-1.5">
              
              <div className="px-1 py-1 space-y-1">
                <Menu.Item>
                  {({ active }) => (
                    // 5. Hover Contrast: When active, the background turns solid white, adding a subtle ring and pushing the text to maximum contrast (slate-900).
                    <button className={`${active ? 'bg-white shadow-sm ring-1 ring-slate-900/5 text-slate-900' : 'text-slate-600'} group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200`}>
                      <Settings className={`mr-3 h-4 w-4 transition-all duration-300 ${active ? 'text-brand-gold rotate-90' : 'text-slate-400'}`} />
                      Account Settings
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button className={`${active ? 'bg-white shadow-sm ring-1 ring-slate-900/5 text-slate-900' : 'text-slate-600'} group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200`}>
                      <HelpCircle className={`mr-3 h-4 w-4 transition-all duration-300 ${active ? 'text-brand-gold scale-110' : 'text-slate-400'}`} />
                      Support Hub
                    </button>
                  )}
                </Menu.Item>
              </div>
              
              <div className="px-1 py-1 mt-1">
                <Menu.Item>
                  {({ active }) => (
                    <button className={`${active ? 'bg-red-50 shadow-sm ring-1 ring-red-100 text-red-700' : 'text-red-500'} group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200`}>
                      <LogOut className={`mr-3 h-4 w-4 transition-all duration-300 ${active ? 'text-red-600 -translate-x-1' : 'text-red-400'}`} />
                      Sign Out
                    </button>
                  )}
                </Menu.Item>
              </div>

            </Menu.Items>
          </Transition>
        </Menu>

      </div>
    </header>
  );
}