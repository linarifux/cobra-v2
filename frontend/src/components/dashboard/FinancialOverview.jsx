import React from 'react';
import { Package, Box, DollarSign, Wallet } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import MetricCard from '../MetricCard';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export default function FinancialOverview({ financialStats }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 animate-slide-in-right" style={{ animationDelay: '50ms' }}>
        <MetricCard 
          title="Total Billed Revenue" 
          value={formatCurrency(financialStats.grandTotal)} 
          icon={Wallet} 
          colorTheme="green" 
        />
        <MetricCard 
          title="Processing Fees (Outbound)" 
          value={formatCurrency(financialStats.totalProcessing)} 
          icon={Package} 
          colorTheme="blue" 
        />
        <MetricCard 
          title="Receiving Fees (Inbound)" 
          value={formatCurrency(financialStats.totalReceiving)} 
          icon={Box} 
          colorTheme="gold" 
        />
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-6 animate-slide-in-right" style={{ animationDelay: '100ms' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand-gold" />
            Top Clients by Billed Volume
          </h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financialStats.topClients} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `$${value/1000}k`} />
              <RechartsTooltip 
                cursor={{fill: 'rgba(241, 245, 249, 0.5)'}}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="processing" name="Processing Revenue" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={32} />
              <Bar dataKey="receiving" name="Receiving Revenue" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-xs font-bold text-slate-600">Processing Fees</span></div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-xs font-bold text-slate-600">Receiving Fees</span></div>
        </div>
      </div>
    </>
  );
}