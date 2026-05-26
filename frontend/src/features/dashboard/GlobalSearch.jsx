import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Ensure you have react-router-dom installed
import { Search, Package, User, FileText } from 'lucide-react';

// Mock database - In a real app, you would fetch this from an API or prop
const SEARCH_DB = [
  { id: 'ORD-092', title: 'Order #ORD-092', client: 'DSM i-Health', type: 'Order' },
  { id: 'ORD-091', title: 'Order #ORD-091', client: 'Main Account', type: 'Order' },
  { id: 'ORD-090', title: 'Order #ORD-090', client: 'Main Account', type: 'Order' },
  { id: 'CLI-001', title: 'DSM i-Health', client: 'Client Profile', type: 'Client' },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 0) {
      const filtered = SEARCH_DB.filter(item => 
        item.title.toLowerCase().includes(value.toLowerCase()) ||
        item.id.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    // Replace this path with your actual route structure
    navigate(`/orders/${item.id}`); 
  };

  return (
    <div className="relative w-64" ref={searchRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={query}
          onChange={handleSearch}
          placeholder="Search..." 
          className="w-full bg-white/50 border border-white/60 text-slate-700 placeholder-slate-400 text-sm pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all shadow-sm"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in duration-200">
          {results.length > 0 ? (
            results.map((item) => (
              <button 
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 p-3 hover:bg-brand-gold/5 rounded-xl transition-all text-left group"
              >
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-brand-gold/10">
                  <Package className="w-4 h-4 text-slate-600 group-hover:text-brand-gold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.client}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-xs text-slate-400 text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}