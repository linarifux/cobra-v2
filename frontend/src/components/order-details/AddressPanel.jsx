import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Edit2, Check, Mail, Phone, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const US_STATES = [
  { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' }, { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' }, { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' }, { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' }, { name: 'Hawaii', code: 'HI' }, { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' }, { name: 'Indiana', code: 'IN' }, { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' }, { name: 'Kentucky', code: 'KY' }, { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' }, { name: 'Maryland', code: 'MD' }, { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' }, { name: 'Minnesota', code: 'MN' }, { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' }, { name: 'Montana', code: 'MT' }, { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' }, { name: 'New Hampshire', code: 'NH' }, { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' }, { name: 'New York', code: 'NY' }, { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' }, { name: 'Ohio', code: 'OH' }, { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' }, { name: 'Pennsylvania', code: 'PA' }, { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' }, { name: 'South Dakota', code: 'SD' }, { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' }, { name: 'Utah', code: 'UT' }, { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' }, { name: 'Washington', code: 'WA' }, { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' }, { name: 'Wyoming', code: 'WY' }
];

export default function AddressPanel({ address, setAddress }) {
  const [editing, setEditing] = useState(false);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const stateDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
        setIsStateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStates = US_STATES.filter(s => 
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) || 
    s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-20">
      <div className="flex justify-between items-center mb-4 border-b border-white/60 pb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPin size={14}/> Shipping Address</h3>
          <button onClick={() => setEditing(!editing)} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0 bg-white/50 p-1.5 rounded-md border border-slate-100">
              {editing ? <Check size={12} className="text-emerald-600"/> : <Edit2 size={12}/>}
          </button>
      </div>
      {editing ? (
          <div className="grid grid-cols-2 gap-3 transition-all duration-300">
              <input className="col-span-2 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} placeholder="Recipient Name" />
              <input className="col-span-1 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.email} onChange={(e) => setAddress({...address, email: e.target.value})} placeholder="Email Address" type="email" />
              <input className="col-span-1 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})} placeholder="Phone Number" />
              <input className="col-span-2 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Address Line 1" />
              <input className="col-span-2 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.line2} onChange={(e) => setAddress({...address, line2: e.target.value})} placeholder="Address Line 2 (Optional)" />
              <input className="bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
              
              <div className="col-span-1 flex gap-3 relative z-50">
                  <div className="w-1/2 relative" ref={stateDropdownRef}>
                    <div 
                      className="w-full bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus-within:border-brand-gold shadow-sm flex items-center justify-between cursor-pointer"
                      onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                    >
                      <span className={address.state ? "text-slate-900 font-bold" : "text-slate-400"}>
                        {address.state || "Select..."}
                      </span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </div>

                    <AnimatePresence>
                      {isStateDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-[100] w-full md:w-48 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                        >
                          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                            <Search size={14} className="text-slate-400 shrink-0" />
                            <input 
                              autoFocus
                              className="w-full text-xs outline-none font-medium text-slate-700" 
                              placeholder="Search state..." 
                              value={stateSearch} 
                              onChange={(e) => setStateSearch(e.target.value)} 
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredStates.length > 0 ? (
                              filteredStates.map(s => (
                                <div 
                                  key={s.code} 
                                  className="px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                                  onClick={() => {
                                    setAddress({ ...address, state: s.code });
                                    setIsStateDropdownOpen(false);
                                    setStateSearch('');
                                  }}
                                >
                                  <span>{s.name}</span>
                                  <span className="text-slate-400 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{s.code}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-xs text-slate-400 text-center">No state found</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="w-1/2">
                      <input className="w-full bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip Code" />
                  </div>
              </div>
          </div>
      ) : (
          <div className="text-sm font-bold text-slate-900 space-y-1 break-words leading-relaxed">
              <p className="text-base tracking-tight">{address.name || 'No recipient set'}</p>
              
              {(address.email || address.phone) && (
                <div className="py-2 flex gap-4 flex-wrap">
                  {address.email && <p className="text-slate-500 font-medium text-xs flex items-center gap-1.5"><Mail size={12}/> {address.email}</p>}
                  {address.phone && <p className="text-slate-500 font-medium text-xs flex items-center gap-1.5"><Phone size={12}/> {address.phone}</p>}
                </div>
              )}

              <div className="bg-white/50 p-4 rounded-xl border border-slate-100 mt-2 inline-block min-w-[50%]">
                <p className="text-slate-600 font-medium text-xs">{address.street || 'No street address'}</p>
                {address.line2 && <p className="text-slate-600 font-medium text-xs">{address.line2}</p>}
                <p className="text-slate-600 font-medium text-xs">
                  {address.city ? `${address.city}, ` : ''}{address.state} {address.zip}
                </p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-2">{address.country || 'US'}</p>
              </div>
          </div>
      )}
    </div>
  );
}