import { 
  Package, RefreshCw, CheckCircle2, AlertCircle, RefreshCcw, 
  Database, Server, AlertTriangle, ArrowRight, Clock, Box, 
  FileText, Download, Terminal, Activity 
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import RecentActivityTable from '../features/dashboard/RecentActivityTable';
import OrderVolumeChart from '../features/dashboard/OrderVolumeChart';
import CarrierChart from '../features/dashboard/CarrierChart';

export default function DashboardHome() {
  
  // --- Data Definitions ---
  const statsData = [
    { title: 'Total Network Orders', value: '2,842', icon: Package, colorTheme: 'gold', trend: { value: '12%', isPositive: true } },
    { title: 'Pending Sheets Import', value: '14', icon: RefreshCw, colorTheme: 'orange' },
    { title: 'Dispatched via ShipStation', value: '856', icon: CheckCircle2, colorTheme: 'green', trend: { value: '4.2%', isPositive: true } },
    { title: 'Active Sync Errors', value: '2', icon: AlertCircle, colorTheme: 'red', trend: { value: '1 down', isPositive: true } },
  ];

  const recentActivityData = [
    { id: 'ORD-092', client: 'DSM i-Health', status: 'Shipped', carrier: 'FedEx', time: '10 mins ago' },
    { id: 'ORD-091', client: 'Main Account', status: 'Pending Sync', carrier: '-', time: '25 mins ago' },
    { id: 'ORD-090', client: 'Main Account', status: 'Error', carrier: '-', time: '1 hour ago' },
    { id: 'ORD-089', client: 'DSM i-Health', status: 'Shipped', carrier: 'UPS', time: '2 hours ago' },
    { id: 'ORD-088', client: 'Main Account', status: 'Shipped', carrier: 'USPS', time: '3 hours ago' },
  ];

  const systemStatus = [
    { name: 'Google Sheets API', status: 'Connected', time: 'Synced 5 mins ago', icon: Database, isError: false },
    { name: 'ShipStation Webhooks', status: 'Healthy', time: 'Last ping 2 mins ago', icon: Server, isError: false },
  ];

  const actionRequired = [
    { id: 'ORD-090', issue: 'Invalid Zip Code', client: 'Main Account' },
    { id: 'ORD-075', issue: 'SKU Not Found in DB', client: 'DSM i-Health' },
  ];

  const inventoryAlerts = [
    { sku: 'DSM-PRO-90', name: 'i-Health Probiotics 90ct', stock: 12, status: 'Critical' },
    { sku: 'MIK-BOX-LG', name: 'Large Shipping Cartons', stock: 45, status: 'Low' },
  ];

  const liveLogs = [
    { time: '10:37:01', type: 'INFO', msg: 'ShipStation Webhook received [ORD-092]' },
    { time: '10:36:45', type: 'SUCCESS', msg: 'PostgreSQL record updated' },
    { time: '10:35:12', type: 'WARN', msg: 'Google Sheets API rate limit nearing (85%)' },
    { time: '10:30:00', type: 'INFO', msg: 'Cron Job: Initiated background sync' },
  ];

  return (
    <div className="relative min-h-full bg-slate-50/50 p-6 space-y-6 rounded-3xl overflow-hidden z-0">
      
      {/* 1. Ambient Aurora Background Layer */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-gold/10 rounded-full blur-[100px] animate-aurora pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-[100px] animate-aurora-reverse pointer-events-none -z-10" />

      {/* 2. Kinetic Entrance Header */}
      <div className="animate-slide-in-right" style={{ animationDelay: '0ms' }}>
        <PageHeader 
          title="Dashboard Overview" 
          subtitle="Welcome back. Here is your operational summary for today."
          action={
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_16px_rgba(184,134,69,0.3)] hover:shadow-[0_6px_24px_rgba(184,134,69,0.4)] hover:-translate-y-0.5 group whitespace-nowrap">
                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
                Force Sync Now
              </button>
            </div>
          }
        />
      </div>

      {/* Row 1: Key Metrics (Staggered Entrance) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-slide-in-right" style={{ animationDelay: '100ms' }}>
        {statsData.map((stat) => (
          <MetricCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Row 2: Analytics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-in-right" style={{ animationDelay: '200ms' }}>
        <div className="xl:col-span-2">
          <OrderVolumeChart />
        </div>
        <div className="xl:col-span-1">
          <CarrierChart />
        </div>
      </div>

      {/* Row 3: Operational Health (Deep Glassmorphism) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-slide-in-right" style={{ animationDelay: '300ms' }}>
        
        {/* Column 1: Action Required */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl p-6 flex flex-col group">
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 flex items-center gap-2 mb-4">
            Action Required
            <span className="bg-red-500/10 text-red-600 text-xs font-black px-2.5 py-0.5 rounded-full shadow-inner">{actionRequired.length}</span>
          </h3>
          <div className="space-y-3 flex-1">
            {actionRequired.map((alert) => (
              <div key={alert.id} className="relative overflow-hidden flex flex-col p-4 rounded-2xl bg-white/50 border border-red-100/50 hover:border-red-300 hover:bg-red-50/50 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-1 z-10">
                  <span className="text-sm font-bold text-slate-900 transition-colors">{alert.id}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-red-600 font-bold z-10">
                  {/* Cinemagraph Pulse for critical alerts */}
                  <AlertTriangle className="w-4 h-4 animate-pulse-slow" />
                  {alert.issue}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-2 z-10">Client: {alert.client}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Inventory Alerts */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl p-6 flex flex-col">
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 flex items-center gap-2 mb-4">
            <Box className="w-5 h-5 text-brand-gold animate-pulse-slow" />
            Inventory Alerts
          </h3>
          <div className="space-y-3 flex-1">
            {inventoryAlerts.map((item) => (
              <div key={item.sku} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-orange-100/50 hover:bg-orange-50/50 hover:border-orange-200 transition-all">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.sku}</h4>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">{item.name}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg shadow-sm ${item.status === 'Critical' ? 'bg-red-500/10 text-red-600 border border-red-200/50' : 'bg-orange-500/10 text-orange-600 border border-orange-200/50'}`}>
                    {item.stock} left
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-sm font-bold text-brand-gold hover:text-white bg-brand-gold/10 hover:bg-brand-gold py-2.5 rounded-xl transition-all border border-brand-gold/20 hover:shadow-lg shadow-brand-gold/20">
            Request Restock
          </button>
        </div>

        {/* Column 3: Fulfillment SLA Tracker */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl p-6 flex flex-col">
          <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-brand-gold" />
            Fulfillment SLA
          </h3>
          <div className="flex-1 flex flex-col justify-center space-y-7">
            
            {/* Progress Bar 1 */}
            <div className="group">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">On Time (&lt; 24h)</span>
                <span className="font-black text-emerald-600 group-hover:scale-110 transition-transform origin-right">82%</span>
              </div>
              <div className="w-full bg-slate-200/50 rounded-full h-2.5 shadow-inner overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: '82%' }}></div>
              </div>
            </div>

            {/* Progress Bar 2 */}
            <div className="group">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Warning (24-48h)</span>
                <span className="font-black text-brand-gold group-hover:scale-110 transition-transform origin-right">12%</span>
              </div>
              <div className="w-full bg-slate-200/50 rounded-full h-2.5 shadow-inner overflow-hidden">
                <div className="bg-gradient-to-r from-brand-gold-hover to-brand-gold h-full rounded-full shadow-[0_0_10px_rgba(184,134,69,0.4)]" style={{ width: '12%' }}></div>
              </div>
            </div>

            {/* Progress Bar 3 */}
            <div className="group">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Breached (&gt; 48h)</span>
                <span className="font-black text-red-500 group-hover:scale-110 transition-transform origin-right">6%</span>
              </div>
              <div className="w-full bg-slate-200/50 rounded-full h-2.5 shadow-inner overflow-hidden">
                <div className="bg-gradient-to-r from-red-400 to-red-500 h-full rounded-full shadow-[0_0_10px_rgba(239,68,68,0.4)]" style={{ width: '6%' }}></div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Row 4: Advanced Tech Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-in-right" style={{ animationDelay: '400ms' }}>
        
        {/* Live Sync Terminal (Dark Glassmorphism) */}
        <div className="xl:col-span-2 bg-slate-900/80 backdrop-blur-3xl border border-slate-700/50 shadow-[0_16px_40px_rgba(0,0,0,0.2)] rounded-3xl p-6 relative overflow-hidden flex flex-col group hover:border-brand-gold/30 transition-colors duration-500">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-gold" />
              Integration Stream
            </h3>
            {/* Cinemagraph Live Indicator */}
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
          </div>
          
          <div className="flex-1 font-mono text-[11px] sm:text-xs space-y-2.5 overflow-y-auto scrollbar-hide">
            {liveLogs.map((log, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-slate-500 font-medium">[{log.time}]</span>
                <span className={`font-bold w-16 ${
                  log.type === 'INFO' ? 'text-blue-400' : 
                  log.type === 'SUCCESS' ? 'text-emerald-400' : 
                  'text-brand-gold'
                }`}>
                  {log.type}
                </span>
                <span className="text-slate-300">{log.msg}</span>
              </div>
            ))}
            <div className="flex gap-4 animate-pulse-slow opacity-60">
              <span className="text-slate-500 font-medium">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
              <span className="text-slate-600 font-bold w-16">WAIT</span>
              <span className="text-slate-600">Awaiting stream chunk_</span>
            </div>
          </div>
        </div>

        {/* Quick Actions & System Health */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Quick Actions Card */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/60 border border-white hover:border-brand-gold/40 hover:bg-brand-gold/5 hover:shadow-md transition-all text-slate-600 hover:text-brand-gold font-bold group">
                <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs">Pick Lists</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/60 border border-white hover:border-brand-gold/40 hover:bg-brand-gold/5 hover:shadow-md transition-all text-slate-600 hover:text-brand-gold font-bold group">
                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs">Export CSV</span>
              </button>
            </div>
          </div>

          {/* System Health Card */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-3xl p-6 flex-1">
            <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">System Health</h3>
            <div className="space-y-4">
              {systemStatus.map((sys, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-sm border ${sys.isError ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-white text-brand-gold'}`}>
                    <sys.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{sys.name}</h4>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]"></span>
                       {sys.status} • {sys.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Row 5: Data Table */}
      <div className="animate-slide-in-right" style={{ animationDelay: '500ms' }}>
        <RecentActivityTable data={recentActivityData} />
      </div>
      
    </div>
  );
}