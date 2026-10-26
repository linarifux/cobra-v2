import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, RefreshCw, Search, Database, FileText, LayoutList, Code, Info, ChevronRight, X, Calendar, User, Tag, ChevronLeft } from 'lucide-react';
import { fetchNetSuiteRecords, prefetchNetSuiteRecords } from '../store/slices/netSuiteSlice';

const parseNetSuiteError = (err) => {
  if (!err) return 'An unknown error occurred while communicating with NetSuite.';
  if (typeof err === 'string') return err;
  
  if (err['o:errorDetails'] && Array.isArray(err['o:errorDetails']) && err['o:errorDetails'][0]) {
    return err['o:errorDetails'][0].detail || err['o:errorDetails'][0]['o:errorCode'] || 'NetSuite API validation failed.';
  }
  
  if (err.message) return err.message;
  if (err.title) return `${err.title}: ${err.status || ''}`;
  if (err.error) return typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
  
  return 'A complex data error occurred. Check console for details.';
};

const RecordCard = ({ record, onClick, categorizeKeys, renderValue }) => {
  const { standard, custom } = categorizeKeys(record);

  let cardTitleStr = '';
  if (record.entity) {
    cardTitleStr = typeof record.entity === 'object' ? (record.entity.refName || record.entity.name) : record.entity;
  } else if (record.companyName) {
    cardTitleStr = typeof record.companyName === 'object' ? (record.companyName.refName || record.companyName.name) : record.companyName;
  } else if (record.tranId) {
    cardTitleStr = `SO #${record.tranId}`;
  }

  const cardTitle = cardTitleStr || `Order #${record.id}`;
  const cardStatus = record.status?.refName || record.entityStatus?.refName || null;
  const cardDateStr = record.trandate || record.dateCreated || null;
  const cardDate = cardDateStr ? new Date(cardDateStr).toLocaleDateString() : null;

  return (
    <div 
      onClick={() => onClick(record)}
      className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full relative"
    >
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-black text-slate-900 leading-tight group-hover:text-brand-gold transition-colors line-clamp-2">
            {cardTitle}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-slate-400 shadow-sm whitespace-nowrap">
              SO: {record.tranId || record.id}
            </span>
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

      <div className="p-5 flex-1 overflow-auto custom-scrollbar max-h-[400px]">
        <div className="space-y-6">
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
};

export default function NetSuiteExplorer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const activeRecordType = 'salesOrder';
  const [viewMode, setViewMode] = useState('cards'); 

  const RECORDS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const netSuiteState = useSelector((state) => state.netsuite || {});
  const { status, error, recordsByRecordType, hasMoreByRecordType } = netSuiteState;
  
  const rawRecords = recordsByRecordType[activeRecordType] || [];
  const hasPossibleNextPage = hasMoreByRecordType[activeRecordType] === true;

  const buildQueryString = useCallback((page, search) => {
    const offset = (page - 1) * RECORDS_PER_PAGE;
    const params = new URLSearchParams();
    params.append('limit', RECORDS_PER_PAGE.toString());
    params.append('offset', offset.toString());
    if (search && search.trim() !== '') {
      params.append('q', search.trim());
    }
    return params.toString();
  }, []);

  const loadData = useCallback((pageToFetch = 1, activeSearch = '', forceRefresh = false) => {
    const query = buildQueryString(pageToFetch, activeSearch);
    dispatch(fetchNetSuiteRecords({ 
      recordType: activeRecordType,
      query,
      forceRefresh
    }));
  }, [activeRecordType, buildQueryString, dispatch]);

  // Automatically prefetch the next page in the background once current page succeeds
  useEffect(() => {
    if (status === 'succeeded' && hasPossibleNextPage) {
      const nextQuery = buildQueryString(currentPage + 1, searchQuery);
      dispatch(prefetchNetSuiteRecords({
        recordType: activeRecordType,
        query: nextQuery
      }));
    }
  }, [status, hasPossibleNextPage, currentPage, searchQuery, activeRecordType, buildQueryString, dispatch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData(1, searchQuery, false);
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData(1, '', false);
  }, [loadData]);

  useEffect(() => {
    setStatusFilter('All');
    setCustomerFilter('All');
    setDateFilter('');
  }, [currentPage]);

  const handleNextPage = () => {
    if (!hasPossibleNextPage) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadData(nextPage, searchQuery, false);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    loadData(prevPage, searchQuery, false);
  };

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    rawRecords.forEach(record => {
      const st = record.status?.refName;
      if (st) statuses.add(st);
    });
    return Array.from(statuses).sort();
  }, [rawRecords]);

  const uniqueCustomers = useMemo(() => {
    const customers = new Set();
    rawRecords.forEach(record => {
      const custName = record.entity?.refName || record.entity?.name;
      if (custName) customers.add(custName);
    });
    return Array.from(customers).sort();
  }, [rawRecords]);

  const filteredRecords = useMemo(() => {
    return rawRecords.filter(record => {
      let matchesStatus = true;
      if (statusFilter !== 'All') {
        matchesStatus = record.status?.refName === statusFilter;
      }

      let matchesCustomer = true;
      if (customerFilter !== 'All') {
        const custName = record.entity?.refName || record.entity?.name;
        matchesCustomer = custName === customerFilter;
      }

      let matchesDate = true;
      if (dateFilter) {
        const recDateStr = record.trandate || record.dateCreated || '';
        if (recDateStr) {
          const d = new Date(recDateStr);
          const recDateIso = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
          matchesDate = recDateIso === dateFilter;
        } else {
          matchesDate = false;
        }
      }

      return matchesStatus && matchesCustomer && matchesDate;
    });
  }, [rawRecords, statusFilter, customerFilter, dateFilter]);

  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (customerFilter !== 'All' ? 1 : 0) + (dateFilter ? 1 : 0);

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
    navigate(`/netsuite/salesOrder/${record.id}`);
  };

  const isLoading = status === 'loading';
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
            High-speed cached view into live NetSuite Sales Orders.
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
            onClick={() => loadData(currentPage, searchQuery, true)}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Bypass cache and force refresh from NetSuite"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> 
          </button>
        </div>
      </div>

      {/* 2. Controls & Dynamic Filter Board */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white/40 backdrop-blur-xl border border-white/60 p-2 sm:p-3 rounded-2xl shadow-sm">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap bg-slate-900 text-brand-gold shadow-md">
              <FileText size={16} /> Sales Orders
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md group">
            <button type="submit" className="absolute left-3 top-2.5 text-slate-400 hover:text-brand-gold transition-colors">
               <Search size={16} />
            </button>
            <input 
              type="text"
              placeholder="Search by SO #, Customer Name, or Memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all shadow-sm"
            />
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] max-w-[250px]">
            <Tag className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="relative min-w-[200px] max-w-[300px]">
            <User className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="All">All Customers</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative min-w-[160px]">
            <Calendar className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <input 
              type="date" 
              className={selectClass} 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)} 
              title="Order Date"
            />
          </div>

          {activeFilterCount > 0 && (
            <button 
              onClick={() => {
                setStatusFilter('All');
                setCustomerFilter('All');
                setDateFilter('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-white/60 rounded-xl transition-all border border-transparent hover:border-slate-200"
            >
              <X size={14} /> Clear Page Filters
            </button>
          )}

          {/* SERVER-SIDE PAGINATION CONTROLS */}
          <div className="ml-auto flex items-center gap-4 bg-white/60 backdrop-blur border border-white shadow-sm p-1 rounded-xl">
             <button 
                onClick={handlePrevPage} 
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} />
             </button>
             <div className="text-xs font-black tracking-widest text-slate-700 min-w-[60px] text-center">
                PAGE {currentPage}
             </div>
             <button 
                onClick={handleNextPage} 
                disabled={!hasPossibleNextPage || isLoading}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </div>

      {/* 3. Main Data Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading && rawRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-slate-400 gap-4 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem]">
            <Loader2 className="animate-spin text-brand-gold" size={40} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Querying NetSuite SuiteQL...</p>
          </div>
        ) : status === 'failed' && rawRecords.length === 0 ? (
          <div className="flex justify-center items-center h-full p-6 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem]">
             <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center border border-red-200 max-w-md w-full">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
                <h3 className="text-sm font-black uppercase tracking-widest mb-2">Connection Error</h3>
                <p className="text-xs font-medium opacity-80 break-words">{parseNetSuiteError(error)}</p>
             </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full p-6 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] text-slate-400">
            <Database className="mx-auto mb-3 opacity-20" size={48} />
            <p className="text-sm font-black uppercase tracking-widest mb-1">No Records Found</p>
            <p className="text-xs font-bold">Try adjusting your search criteria or changing pages.</p>
          </div>
        ) : viewMode === 'json' ? (
          <div className="h-full bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl border border-slate-800 flex flex-col relative">
            {isLoading && (
               <div className="absolute top-4 right-4 z-10">
                 <Loader2 size={16} className="animate-spin text-brand-gold" />
               </div>
            )}
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
          <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-20 relative">
            {isLoading && (
               <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center rounded-[2rem]">
                 <Loader2 size={40} className="animate-spin text-brand-gold" />
               </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRecords.map((record, idx) => (
                <RecordCard 
                  key={record.id || idx}
                  record={record}
                  onClick={handleCardClick}
                  categorizeKeys={categorizeKeys}
                  renderValue={renderValue}
                />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}