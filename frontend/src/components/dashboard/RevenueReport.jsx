import React, { useState, useMemo } from 'react';
import { Filter, CalendarDays, Users, AlertCircle } from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export default function RevenueReport({ orders, receivingLogs }) {
  const [reportCustomer, setReportCustomer] = useState('All');
  const [reportTimeframe, setReportTimeframe] = useState('This Month');
  const [reportType, setReportType] = useState('Combined');

  const reportCustomersList = useMemo(() => {
    const map = new Map();
    orders.forEach(o => o.customer && map.set(o.customer._id, o.customer.customerName));
    receivingLogs.forEach(r => r.customer && map.set(r.customer._id, r.customer.customerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, receivingLogs]);

  const customReportData = useMemo(() => {
    const isDateInRange = (dateStr, timeframe) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      if (timeframe === 'This Month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (timeframe === 'Last Month') {
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      }
      if (timeframe === 'This Year') return d.getFullYear() === currentYear;
      return true;
    };

    const isCustomerMatch = (custId) => reportCustomer === 'All' || String(custId) === String(reportCustomer);

    const filteredOrders = orders.filter(o => isDateInRange(o.createdAt, reportTimeframe) && isCustomerMatch(o.customer?._id || o.customer));
    const filteredReceiving = receivingLogs.filter(r => isDateInRange(r.dateReceived, reportTimeframe) && isCustomerMatch(r.customer?._id || r.customer));

    let processingTotal = 0;
    let receivingTotal = 0;
    const chartMap = {};

    const getBucket = (dateString) => {
      const d = new Date(dateString);
      if (reportTimeframe.includes('Month')) {
        return {
          sortKey: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
          display: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
      } else {
        return {
          sortKey: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
          display: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        };
      }
    };

    if (reportType === 'Combined' || reportType === 'Processing') {
      filteredOrders.forEach(o => {
        const fee = Number(o.processingFees?.totalProcessingFee) || 0;
        processingTotal += fee;
        
        const bucket = getBucket(o.createdAt);
        if (!bucket) return;

        if (!chartMap[bucket.sortKey]) chartMap[bucket.sortKey] = { sortKey: bucket.sortKey, date: bucket.display, processing: 0, receiving: 0, total: 0 };
        chartMap[bucket.sortKey].processing += fee;
        chartMap[bucket.sortKey].total += fee;
      });
    }

    if (reportType === 'Combined' || reportType === 'Receiving') {
      filteredReceiving.forEach(r => {
        const fee = Number(r.charge) || 0;
        receivingTotal += fee;
        
        const bucket = getBucket(r.dateReceived);
        if (!bucket) return;

        if (!chartMap[bucket.sortKey]) chartMap[bucket.sortKey] = { sortKey: bucket.sortKey, date: bucket.display, processing: 0, receiving: 0, total: 0 };
        chartMap[bucket.sortKey].receiving += fee;
        chartMap[bucket.sortKey].total += fee;
      });
    }

    const chartDataArray = Object.values(chartMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return { processingTotal, receivingTotal, grandTotal: processingTotal + receivingTotal, chartData: chartDataArray };
  }, [orders, receivingLogs, reportCustomer, reportTimeframe, reportType]);

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-6">
      
      {/* Reports Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200/60">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-gold" />
            Custom Revenue Reports & Analytics
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-1">Filter historical data to generate specific financial insights.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Customer Filter */}
          <div className="relative w-full sm:w-auto">
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select 
              value={reportCustomer} 
              onChange={(e) => setReportCustomer(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-gold shadow-sm cursor-pointer appearance-none"
            >
              <option value="All">All Customers</option>
              {reportCustomersList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="relative w-full sm:w-auto">
            <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select 
              value={reportTimeframe} 
              onChange={(e) => setReportTimeframe(e.target.value)}
              className="w-full sm:w-40 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-gold shadow-sm cursor-pointer appearance-none"
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
              <option value="All Time">All Time</option>
            </select>
          </div>

          {/* Charge Type Filter */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center w-full sm:w-auto">
            {['Combined', 'Processing', 'Receiving'].map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  reportType === type ? 'bg-white shadow-sm text-brand-gold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/60 border border-slate-100 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Report Total</span>
          <span className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(customReportData.grandTotal)}</span>
        </div>
        <div className={`p-5 rounded-2xl shadow-sm border transition-all ${reportType === 'Combined' || reportType === 'Processing' ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${reportType === 'Combined' || reportType === 'Processing' ? 'text-blue-600/70' : 'text-slate-400'}`}>Processing Total</span>
          <span className={`text-2xl font-black tracking-tight ${reportType === 'Combined' || reportType === 'Processing' ? 'text-blue-600' : 'text-slate-400'}`}>{formatCurrency(customReportData.processingTotal)}</span>
        </div>
        <div className={`p-5 rounded-2xl shadow-sm border transition-all ${reportType === 'Combined' || reportType === 'Receiving' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${reportType === 'Combined' || reportType === 'Receiving' ? 'text-emerald-600/70' : 'text-slate-400'}`}>Receiving Total</span>
          <span className={`text-2xl font-black tracking-tight ${reportType === 'Combined' || reportType === 'Receiving' ? 'text-emerald-600' : 'text-slate-400'}`}>{formatCurrency(customReportData.receivingTotal)}</span>
        </div>
      </div>

      {/* Dynamic Wave Chart */}
      <div className="h-80 w-full mb-8">
        {customReportData.chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={customReportData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProcessing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReceiving" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                formatter={(value) => formatCurrency(value)}
              />
              
              {/* Dynamically render areas based on selected report type */}
              {(reportType === 'Combined' || reportType === 'Processing') && (
                <Area type="monotone" dataKey="processing" name="Processing" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProcessing)" />
              )}
              {(reportType === 'Combined' || reportType === 'Receiving') && (
                <Area type="monotone" dataKey="receiving" name="Receiving" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceiving)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-400">No financial data found for this selection.</p>
          </div>
        )}
      </div>

    </div>
  );
}