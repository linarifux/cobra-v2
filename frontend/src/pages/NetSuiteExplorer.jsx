import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, RefreshCw, Search, Database, Users, FileText, Package, LayoutList, Code, Info, ChevronRight, X, Calendar, User, Tag } from 'lucide-react';
import { fetchNetSuiteRecords } from '../store/slices/netSuiteSlice';

// --- RECORD TYPE CONFIGURATION ---
const RECORD_TYPES = [
  { id: 'customer', name: 'Customers', icon: <Users size={16} /> },
  { id: 'salesOrder', name: 'Sales Orders', icon: <FileText size={16} /> },
  { id: 'inventoryItem', name: 'Inventory Items', icon: <Package size={16} /> },
];

export default function NetSuiteExplorer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local State
  const [activeRecordType, setActiveRecordType] = useState('customer');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'json'

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Redux State
  const netSuiteState = useSelector((state) => state.netsuite || {});
  const { status, error, recordsByRecordType } = netSuiteState;
  
  const rawRecords = recordsByRecordType[activeRecordType] || [];

  // --- DATA FETCHING ---
  const loadData = (forceRefresh = false) => {
    if (forceRefresh || !recordsByRecordType[activeRecordType]) {
      dispatch(fetchNetSuiteRecords({ recordType: activeRecordType }));
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRecordType, dispatch]);

  // Reset filters when switching tabs
  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('All');
    setCustomerFilter('All');
    setDateFilter('');
  }, [activeRecordType]);

  // --- DYNAMIC FILTER DROPDOWN OPTIONS ---
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    rawRecords.forEach(record => {
      const st = record.status?.refName || record.entityStatus?.refName || record.priceLevel?.refName;
      if (st) statuses.add(st);
    });
    return Array.from(statuses).sort();
  }, [rawRecords]);

  // Generates a list of all unique customers for the dropdown
  const uniqueCustomers = useMemo(() => {
    const customers = new Set();
    
    // For Sales Orders, the customer name is usually under 'entity'
    if (activeRecordType === 'salesOrder') {
      rawRecords.forEach(record => {
        const custName = record.entity?.refName || record.entity?.name;
        if (custName) customers.add(custName);
      });
    } 
    // For the Customer tab, list all customers
    else if (activeRecordType === 'customer') {
      rawRecords.forEach(record => {
        // Attempt to safely extract the name, handling NetSuite object wrappers
        let name = record.companyName || record.altName || record.entityId;
        if (typeof name === 'object') name = name.refName || name.name;
        if (typeof name === 'string') customers.add(name);
      });
    }
    
    return Array.from(customers).sort();
  }, [rawRecords, activeRecordType]);

  // --- DATA FILTERING LOGIC ---
  const filteredRecords = useMemo(() => {
    return rawRecords.filter(record => {
      
      // 1. Text Search Filter
      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchesSearch = Object.values(record).some(val => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'string' || typeof val === 'number') {
            return String(val).toLowerCase().includes(query);
          }
          if (typeof val === 'object' && val.refName) {
            return String(val.refName).toLowerCase().includes(query);
          }
          return false;
        });
      }

      // 2. Status Filter
      let matchesStatus = true;
      if (statusFilter !== 'All') {
        const recStatus = record.status?.refName || record.entityStatus?.refName || record.priceLevel?.refName;
        matchesStatus = recStatus === statusFilter;
      }

      // 3. Customer Filter
      let matchesCustomer = true;
      if (customerFilter !== 'All') {
        if (activeRecordType === 'salesOrder') {
           matchesCustomer = (record.entity?.refName === customerFilter) || (record.entity?.name === customerFilter);
        } else if (activeRecordType === 'customer') {
           let name = record.companyName || record.altName || record.entityId;
           if (typeof name === 'object') name = name.refName || name.name;
           matchesCustomer = name === customerFilter;
        }
      }

      // 4. Exact Date Filter
      let matchesDate = true;
      if (dateFilter) {
        const recDateStr = record.trandate || record.dateCreated || '';
        if (recDateStr) {
          const recDateIso = new Date(recDateStr).toISOString().split('T')[0];
          matchesDate = recDateIso === dateFilter;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
    });
  }, [rawRecords, searchQuery, statusFilter, customerFilter, dateFilter, activeRecordType]);

  const activeFilterCount = (searchQuery ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0) + (customerFilter !== 'All' ? 1 : 0) + (dateFilter ? 1 : 0);

  // --- DATA PARSING HELPERS ---
  const renderValue = (val) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-300 italic">null</span>;
    if (typeof val === 'boolean') {
      return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${val ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
          {val ? 'Yes' : 'No'}
        </span>
      );
    }
    if (typeof val === 'object') {
      if (val.refName) return <span className="text-blue-600 font-bold">{val.refName} <span className="text-slate-400 font-normal text-[10px]">(ID: {val.id})</span></span>;
      if (val.name) return <span className="text-blue-600 font-bold">{val.name}</span>;
      
      return (
        <div className="pl-2 border-l-2 border-slate-200 my-1 space-y-1">
          {Object.entries(val).map(([k, v]) => {
            if (k === 'links') return null;
            return (
              <div key={k} className="text-xs">
                <span className="text-slate-400 font-medium mr-2">{k}:</span>
                {renderValue(v)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (typeof val === 'string' && val.startsWith('<a href=')) {
      return <div dangerouslySetInnerHTML={{ __html: val }} className="text-blue-600 underline text-xs break-all" />;
    }

    return <span className="text-slate-700 break-words">{String(val)}</span>;
  };

  const categorizeKeys = (record) => {
    const primary = [];
    const standard = [];
    const custom = [];

    const primaryKeys = ['id', 'tranId', 'entityId', 'companyName', 'altName', 'status', 'entityStatus'];
    
    Object.keys(record).forEach(key => {
      if (key === 'links') return;
      if (primaryKeys.includes(key)) {
        primary.push(key);
      } else if (key.startsWith('custbody') || key.startsWith('custentity') || key.startsWith('custrecord')) {
        custom.push(key);
      } else {
        standard.push(key);
      }
    });

    return { primary, standard: standard.sort(), custom: custom.sort() };
  };

  const handleCardClick = (record) => {
    if (activeRecordType === 'salesOrder') {
      navigate(`/netsuite/salesOrder/${record.id}`);
    } else if (activeRecordType === 'customer') {
      navigate(`/netsuite/customer/${record.id}`);
    }
  };

  const isLoading = status === 'loading' && rawRecords.length === 0;
  const selectClass = "w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs font-bold outline-none cursor-pointer focus:border-brand-gold/50 focus:ring-2 focus:ring-brand-gold/20 transition-all appearance-none truncate";

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto p-4 sm:p-6 overflow-hidden">
      
      {/* 1. Header Section */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Database className="text-brand-gold" /> NetSuite Explorer
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Direct REST API view into the live NetSuite database.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white/60 backdrop-blur-md border border-slate-200 p-1 rounded-xl shadow-sm">
            <button 
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'cards' ? 'bg-slate-900 text-brand-gold shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <LayoutList size={14} /> Cards
            </button>
            <button 
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'json' ? 'bg-slate-900 text-brand-gold shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Code size={14} /> JSON
            </button>
          </div>
          
          <button 
            onClick={() => loadData(true)}
            disabled={status === 'loading'}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Force refresh database"
          >
            <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} /> 
          </button>
        </div>
      </div>

      {/* 2. Controls & Dynamic Filter Board */}
      <div className="flex-shrink-0 space-y-4">
        
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white/40 backdrop-blur-xl border border-white/60 p-2 sm:p-3 rounded-2xl shadow-sm">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {RECORD_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveRecordType(type.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeRecordType === type.id 
                    ? 'bg-slate-900 text-brand-gold shadow-md' 
                    : 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                {type.icon} {type.name}
              </button>
            ))}
          </div>

          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search within any field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative min-w-[180px] max-w-[250px]">
            <Tag className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All {activeRecordType === 'inventoryItem' ? 'Price Levels' : 'Statuses'}</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {(activeRecordType === 'salesOrder' || activeRecordType === 'customer') && (
            <div className="relative min-w-[200px] max-w-[300px]">
              <User className="absolute left-3 top-2.5 text-brand-gold" size={14} />
              <select className={selectClass} value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                <option value="All">All Customers</option>
                {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {(activeRecordType === 'salesOrder' || activeRecordType === 'customer') && (
            <div className="relative min-w-[160px]">
              <Calendar className="absolute left-3 top-2.5 text-brand-gold" size={14} />
              <input 
                type="date" 
                className={selectClass} 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)} 
                title={activeRecordType === 'salesOrder' ? 'Order Date' : 'Created Date'}
              />
            </div>
          )}

          {activeFilterCount > 0 && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setCustomerFilter('All');
                setDateFilter('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-white/60 rounded-xl transition-all border border-transparent hover:border-slate-200"
            >
              <X size={14} /> Clear
            </button>
          )}

          <div className="ml-auto text-xs font-bold text-slate-400">
            Showing {filteredRecords.length} records
          </div>
        </div>
      </div>

      {/* 3. Main Data Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full text-slate-400 gap-4 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem]">
            <Loader2 className="animate-spin text-brand-gold" size={40} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Querying NetSuite API...</p>
          </div>
        ) : status === 'failed' && rawRecords.length === 0 ? (
          <div className="flex justify-center items-center h-full p-6 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem]">
             <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center border border-red-200 max-w-md w-full">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
                <h3 className="text-sm font-black uppercase tracking-widest mb-2">Connection Error</h3>
                <p className="text-xs font-medium opacity-80">{error}</p>
             </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full p-6 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] text-slate-400">
            <Database className="mx-auto mb-3 opacity-20" size={48} />
            <p className="text-sm font-black uppercase tracking-widest mb-1">No Records Found</p>
            <p className="text-xs font-bold">Try adjusting your filters.</p>
          </div>
        ) : viewMode === 'json' ? (
          <div className="h-full bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl border border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Code size={14}/> Raw Array Payload ({filteredRecords.length} records)
               </span>
            </div>
            <div className="p-6 overflow-auto h-full custom-scrollbar">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-words">
                {JSON.stringify(filteredRecords, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRecords.map((record, idx) => {
                const { standard, custom } = categorizeKeys(record);
                
                // Helper to robustly extract a display title
                // Safely handles when companyName or entity is a string OR a nested object
                let cardTitleStr = '';
                if (record.companyName) {
                    cardTitleStr = typeof record.companyName === 'object' ? (record.companyName.refName || record.companyName.name) : record.companyName;
                } else if (record.altName) {
                    cardTitleStr = typeof record.altName === 'object' ? (record.altName.refName || record.altName.name) : record.altName;
                } else if (record.entity) {
                    cardTitleStr = typeof record.entity === 'object' ? (record.entity.refName || record.entity.name) : record.entity;
                } else if (record.tranId) {
                    cardTitleStr = typeof record.tranId === 'object' ? (record.tranId.refName || record.tranId.name) : record.tranId;
                } else if (record.entityId) {
                    cardTitleStr = typeof record.entityId === 'object' ? (record.entityId.refName || record.entityId.name) : record.entityId;
                }
                
                const cardTitle = cardTitleStr || `Record ${idx + 1}`;
                const cardStatus = record.status?.refName || record.entityStatus?.refName || record.priceLevel?.refName || null;
                const cardDateStr = record.trandate || record.dateCreated || null;
                const cardDate = cardDateStr ? new Date(cardDateStr).toLocaleDateString() : null;

                return (
                  <div 
                    key={record.id || idx} 
                    onClick={() => handleCardClick(record)}
                    className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full"
                  >
                    {/* Card Header (Primary Identifiers) */}
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h2 className="text-lg font-black text-slate-900 leading-tight group-hover:text-brand-gold transition-colors line-clamp-2">
                          {cardTitle}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-slate-400 shadow-sm whitespace-nowrap">
                            ID: {record.id}
                          </span>
                          {cardStatus && (
                            <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm whitespace-nowrap">
                              {cardStatus}
                            </span>
                          )}
                          {cardDate && (
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm whitespace-nowrap">
                              {cardDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-full shadow-sm text-slate-300 group-hover:text-brand-gold group-hover:bg-brand-gold/10 transition-all shrink-0">
                        <ChevronRight size={16} />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 overflow-auto custom-scrollbar max-h-[400px]">
                      <div className="space-y-6">
                        
                        {/* Standard Properties */}
                        {standard.length > 0 && (
                          <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1 sticky top-0 bg-white/90 backdrop-blur z-10">
                              <Info size={12}/> Standard Info
                            </h3>
                            <div className="space-y-2.5">
                              {standard.map(key => (
                                <div key={key} className="grid grid-cols-[1fr_2fr] gap-3 text-xs items-start">
                                  <span className="font-bold text-slate-500 truncate" title={key}>{key}</span>
                                  <div className="text-slate-800 break-words">{renderValue(record[key])}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Custom Fields (custbody/custentity) */}
                        {custom.length > 0 && (
                          <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1 sticky top-0 bg-white/90 backdrop-blur pt-2 mt-[-8px] z-10">
                              <Database size={12}/> Custom Fields
                            </h3>
                            <div className="space-y-2.5">
                              {custom.map(key => (
                                <div key={key} className="grid grid-cols-[1fr_2fr] gap-3 text-xs items-start">
                                  <span className="font-bold text-slate-500 truncate" title={key}>{key}</span>
                                  <div className="text-slate-800 break-words">{renderValue(record[key])}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}