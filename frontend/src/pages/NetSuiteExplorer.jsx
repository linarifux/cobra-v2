import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, AlertTriangle, RefreshCw, Search, Database, 
  FileText, LayoutList, Code, X, Calendar, User, Tag, 
  ChevronLeft, ChevronRight, Truck, ExternalLink 
} from 'lucide-react';
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

// --- TABLE ROW COMPONENT ---
const OrderTableRow = ({ record, onClick }) => {
  // 1. Core ID & Order Number
  const orderNumber = record.id;
  const chargeCode = record.tranid;
 
  // Safely handle null/undefined, then remove everything before the first '#'
const rawExternalId = record.externalid;
const sourceNumber = rawExternalId?.replace(/^[^#]*/, '');
  
  // 2. Dynamic Customer/Sales Rep Mapping
  const orderedBy = 'Leah Mockridge GW0003';
  
  // 3. Status Formatting
  const rawStatus = record.status_name ;
  let statusStr = rawStatus.replace(/^Sales Order\s*:\s*/i, '').trim();
  if (statusStr.toLowerCase() === 'pending fulfillment') statusStr = 'PENDING';
  
  // 4. hardcoded Order Type
  const orderType = 'WEBORDER'
  
  // 5. Date Formatting
  const dateStr = record.createddate;
  const orderDate = dateStr ? new Date(dateStr).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-';
  
  const shipDateStr = record.actualshipdate;
  const shipDate = shipDateStr ? new Date(shipDateStr).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Pending';

  // 6. Tracking Numbers (Clean Pill Layout)
  const rawTracking = record.linkedtrackingnumberlist;
  let trackingList = [];
  if (rawTracking) {
    if (Array.isArray(rawTracking)) trackingList = rawTracking;
    else if (typeof rawTracking === 'string') trackingList = rawTracking.split(/[\s,]+/).filter(Boolean);
  }
  
  // Status Color Logic
  const isPending = statusStr.toLowerCase() === 'pending';
  const statusClasses = isPending 
    ? 'bg-blue-50 text-blue-600 border-blue-100' 
    : 'bg-emerald-50 text-emerald-600 border-emerald-100';

  return (
    <tr 
      onClick={() => onClick(record)}
      className="group hover:bg-slate-50/50 transition-all duration-200 border-b border-slate-100 cursor-pointer"
    >
      {/* Order Number */}
      <td className="py-4 pl-6 pr-4 font-bold text-slate-900 group-hover:text-brand-gold transition-colors whitespace-nowrap">
        <div className="flex items-center gap-2">
          {orderNumber}
          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
        </div>
      </td>
      
      {/* Order Type */}
      <td className="py-4 px-4 whitespace-nowrap">
        <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider">
          {orderType}
        </span>
      </td>
      
      {/* Ordered By */}
      <td className="py-4 px-4 text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={orderedBy}>
        {orderedBy}
      </td>
      
      {/* Order Date */}
      <td className="py-4 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">
        {orderDate}
      </td>
      
      {/* Ship Date */}
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {shipDate !== 'Pending' && <Truck size={14} className="text-emerald-500" />}
          <span className={`text-xs font-semibold ${shipDate === 'Pending' ? 'text-slate-400 italic' : 'text-slate-700'}`}>
            {shipDate}
          </span>
        </div>
      </td>
      
      {/* Status */}
      <td className="py-4 px-4 whitespace-nowrap">
        {statusStr && (
          <span className={`border px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider shadow-sm ${statusClasses}`}>
            {statusStr}
          </span>
        )}
      </td>
      
      {/* Tracking - Uses flex-wrap so multiple items form a clean grid block instead of a massive vertical tower */}
      <td className="py-4 px-4 max-w-[220px]">
        {trackingList.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {trackingList.map((trackNum, i) => (
              <span key={i} className="inline-flex bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[11px] font-medium shadow-sm">
                {trackNum}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      
      {/* Charge Code */}
      <td className="py-4 pr-6 pl-4 text-xs font-bold text-slate-700 whitespace-nowrap">
        {chargeCode}
      </td>

      {/* Source Number */}
      <td className="py-4 pr-6 pl-4 text-xs text-center font-bold text-slate-700 whitespace-nowrap">
        {sourceNumber}
      </td>
    </tr>
  );
};


export default function NetSuiteExplorer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const activeRecordType = 'salesOrder';
  const [viewMode, setViewMode] = useState('list');

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
      const st = record.status?.refName || record.status_name;
      if (st) {
        let clean = st.replace(/^Sales Order\s*:\s*/i, '').trim();
        if(clean.toLowerCase() === 'pending fulfillment') clean = 'PENDING';
        statuses.add(clean);
      }
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
        const recStat = record.status?.refName || record.status_name || '';
        let cleanStat = recStat.replace(/^Sales Order\s*:\s*/i, '').trim();
        if(cleanStat.toLowerCase() === 'pending fulfillment') cleanStat = 'PENDING';
        matchesStatus = cleanStat === statusFilter;
      }

      let matchesCustomer = true;
      if (customerFilter !== 'All') {
        const custName = record.entity?.refName || record.entity?.name;
        matchesCustomer = custName === customerFilter;
      }

      let matchesDate = true;
      if (dateFilter) {
        const recDateStr = record.trandate || record.tranDate || record.dateCreated || record.createddate || '';
        if (recDateStr) {
          const d = new Date(recDateStr);
          const recDateIso = !isNaN(d.getTime()) ? new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : '';
          matchesDate = recDateIso === dateFilter;
        } else {
          matchesDate = false;
        }
      }

      return matchesStatus && matchesCustomer && matchesDate;
    });
  }, [rawRecords, statusFilter, customerFilter, dateFilter]);

  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (customerFilter !== 'All' ? 1 : 0) + (dateFilter ? 1 : 0);

  const handleRowClick = (record) => {
    navigate(`/netsuite/salesOrder/${record.id}`);
  };

  const isLoading = status === 'loading';
  const selectClass = "w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all appearance-none truncate shadow-sm hover:border-slate-300";

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
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[11px] font-bold uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-slate-900 text-brand-gold shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <LayoutList size={14} /> List View
            </button>
            <button 
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[11px] font-bold uppercase tracking-wider transition-all ${viewMode === 'json' ? 'bg-slate-900 text-brand-gold shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <Code size={14} /> JSON
            </button>
          </div>
          
          <button 
            onClick={() => loadData(currentPage, searchQuery, true)}
            disabled={isLoading}
            className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-brand-gold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Bypass cache and force refresh"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> 
          </button>
        </div>
      </div>

      {/* 2. Controls & Dynamic Filter Board */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[11px] font-bold uppercase tracking-widest whitespace-nowrap bg-slate-900 text-brand-gold shadow-md">
            <FileText size={16} /> Sales Orders
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md group">
            <button type="submit" className="absolute left-3 top-3 text-slate-400 hover:text-brand-gold transition-colors">
               <Search size={16} />
            </button>
            <input 
              type="text"
              placeholder="Search by SO #, Customer Name, or Memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-[10px] border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:bg-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
            />
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px]">
            <Tag className="absolute left-3 top-3 text-brand-gold" size={14} />
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="relative min-w-[200px] max-w-[250px]">
            <User className="absolute left-3 top-3 text-brand-gold" size={14} />
            <select className={selectClass} value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="All">All Customers</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative min-w-[160px]">
            <Calendar className="absolute left-3 top-3 text-brand-gold" size={14} />
            <input 
              type="date" 
              className={selectClass} 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)} 
            />
          </div>

          {activeFilterCount > 0 && (
            <button 
              onClick={() => {
                setStatusFilter('All');
                setCustomerFilter('All');
                setDateFilter('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors"
            >
              <X size={14} /> Clear
            </button>
          )}

          {/* SERVER-SIDE PAGINATION CONTROLS */}
          <div className="ml-auto flex items-center gap-4 bg-white border border-slate-200 shadow-sm p-1.5 rounded-[10px]">
             <button 
                onClick={handlePrevPage} 
                disabled={currentPage <= 1 || isLoading}
                className="p-1 rounded-[6px] text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} />
             </button>
             <div className="text-[11px] font-black uppercase tracking-widest text-slate-700 min-w-[60px] text-center">
                PAGE {currentPage}
             </div>
             <button 
                onClick={handleNextPage} 
                disabled={!hasPossibleNextPage || isLoading}
                className="p-1 rounded-[6px] text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </div>

      {/* 3. Main Data Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading && rawRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-slate-400 gap-4 bg-white border border-slate-200 rounded-3xl">
            <Loader2 className="animate-spin text-brand-gold" size={40} />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading Data...</p>
          </div>
        ) : status === 'failed' && rawRecords.length === 0 ? (
          <div className="flex justify-center items-center h-full p-6 bg-white border border-slate-200 rounded-3xl">
             <div className="bg-red-50 text-red-600 p-8 rounded-2xl text-center border border-red-100 max-w-md w-full">
                <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
                <h3 className="text-sm font-black uppercase tracking-widest mb-2">Connection Error</h3>
                <p className="text-xs font-medium opacity-80 break-words">{parseNetSuiteError(error)}</p>
             </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full p-6 bg-white border border-slate-200 rounded-3xl text-slate-400">
            <Database className="mx-auto mb-3 opacity-20" size={48} />
            <p className="text-sm font-black uppercase tracking-widest mb-1 text-slate-500">No Records Found</p>
            <p className="text-xs font-medium text-slate-400">Try adjusting your filters or changing pages.</p>
          </div>
        ) : viewMode === 'json' ? (
          <div className="h-full bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-800 flex flex-col relative">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Code size={14}/> Raw Array Payload ({filteredRecords.length} records)
               </span>
            </div>
            <div className="p-6 overflow-auto h-full custom-scrollbar">
              <pre className="text-[11px] leading-5 font-mono text-emerald-400/90 whitespace-pre-wrap break-words">
                {JSON.stringify(filteredRecords, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-hidden relative bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
            {isLoading && (
               <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
                 <Loader2 size={32} className="animate-spin text-brand-gold" />
               </div>
            )}
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)]">
                    <th className="py-4 pl-6 pr-4 whitespace-nowrap">Order Number</th>
                    <th className="py-4 px-4 whitespace-nowrap">Order Type</th>
                    <th className="py-4 px-4 whitespace-nowrap">Ordered By</th>
                    <th className="py-4 px-4 whitespace-nowrap">Order Date</th>
                    <th className="py-4 px-4 whitespace-nowrap">Ship Date</th>
                    <th className="py-4 px-4 whitespace-nowrap">Status</th>
                    <th className="py-4 px-4 whitespace-nowrap">Tracking</th>
                    <th className="py-4 pr-6 pl-4 whitespace-nowrap">Charge Code</th>
                    <th className="py-4 pr-6 pl-4 whitespace-nowrap">Source Number</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredRecords.map((record, idx) => (
                    <OrderTableRow 
                      key={record.id || idx} 
                      record={record} 
                      onClick={handleRowClick} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}