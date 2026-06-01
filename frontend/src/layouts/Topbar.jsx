import { useState, useRef, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  Search, Bell, User, ChevronDown, Settings, LogOut, HelpCircle,
  Package, FileText, Users, Command
} from 'lucide-react';

// Mock Data - In a real app, this would come from an API or search index
const SEARCH_INDEX = [
  { id: 1, title: 'Order #ORD-092', type: 'Order', icon: Package, path: '/orders/092' },
  { id: 2, title: 'Order #ORD-091', type: 'Order', icon: Package, path: '/orders/091' },
  { id: 3, title: 'DSM i-Health', type: 'Client', icon: Users, path: '/vendors/v-001' },
  { id: 4, title: 'Generate Pick List', type: 'Action', icon: FileText, path: '/reports/pick-list' },
  { id: 5, title: 'System Logs', type: 'Action', icon: Settings, path: '/settings/logs' },
];

export default function Topbar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Close search on Escape or Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 0) {
      const filtered = SEARCH_INDEX.filter(item =>
        item.title.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/40 backdrop-blur-2xl border-b border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex items-center justify-between px-4 sm:px-6 py-3 transition-all duration-500 ease-out">

      {/* Search Input Area */}
      <div className="flex-1 max-w-2xl relative" ref={searchRef}>
        <div className="relative group transition-all duration-500 ease-out">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-gold/0 via-brand-gold/30 to-brand-gold/0 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500 group-focus-within:text-brand-gold" />
          </div>

          <input
            type="text"
            value={query}
            onChange={handleSearch}
            className="block w-full pl-11 pr-14 py-2.5 border border-white/60 rounded-xl text-sm bg-white/50 backdrop-blur-md placeholder-slate-500 font-semibold text-slate-900 focus:outline-none focus:bg-white/90 focus:ring-1 focus:ring-brand-gold/50 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative z-10"
            placeholder="Search orders, customers, or actions..."
          />

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 border border-white/60 shadow-sm rounded-md text-[10px] font-bold text-slate-500 bg-white/70 backdrop-blur-sm">
              <Command size={10} /> K
            </span>
          </div>
        </div>

        {/* Dynamic Search Results Dropdown */}
        {isOpen && (
          <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-brand-gold/10 rounded-xl transition-all text-left"
                >
                  <div className="p-2 bg-white/50 rounded-lg border border-white/50 text-slate-600">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{item.type}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No results found for "{query}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Section (Kept for consistency) */}
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
            <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl bg-white/90 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white focus:outline-none divide-y divide-slate-100 p-1.5">

              <div className="px-1 py-1 space-y-1">
                <Menu.Item>
                  {({ active }) => (
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