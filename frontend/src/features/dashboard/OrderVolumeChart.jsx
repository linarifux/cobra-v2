import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { name: 'Mon', orders: 120, imports: 110 },
  { name: 'Tue', orders: 240, imports: 230 },
  { name: 'Wed', orders: 180, imports: 185 },
  { name: 'Thu', orders: 320, imports: 300 },
  { name: 'Fri', orders: 450, imports: 440 },
  { name: 'Sat', orders: 380, imports: 390 },
  { name: 'Sun', orders: 410, imports: 410 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-3xl border border-white/80 p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] z-50">
        <p className="text-slate-500 font-extrabold text-[10px] uppercase tracking-[0.2em] mb-2 drop-shadow-sm">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(184,134,69,0.6)]" style={{ backgroundColor: entry.color }} />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 tracking-tighter leading-none">
                {entry.value}
              </span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                {entry.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function OrderVolumeChart() {
  return (
    <div className="relative overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 sm:p-8 h-[420px] flex flex-col group transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
      
      {/* Complex Fluid Backdrop */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-gold/15 rounded-full blur-[80px] animate-aurora pointer-events-none mix-blend-multiply transition-opacity duration-700 opacity-60 group-hover:opacity-100" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-slate-300/30 rounded-full blur-[60px] animate-aurora-reverse pointer-events-none mix-blend-multiply" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4 animate-slide-in-right">
        <div>
          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 tracking-tight drop-shadow-sm transition-transform duration-500 origin-left group-hover:scale-[1.02]">
            Order Volume Trend
          </h3>
          
          <div className="flex items-center mt-1.5 space-x-2">
            {/* Cinemagraph pulsing live dot indicators using your scale + brightness classes */}
            <span className="relative flex h-2 w-2 scale-110 animate-pulse-slow">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/40 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
              7-Day processing history
            </p>
          </div>
        </div>

        <select className="appearance-none bg-white/50 hover:bg-white/70 border border-white/80 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold block px-4 py-2.5 backdrop-blur-md outline-none transition-all duration-300 shadow-sm cursor-pointer">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>This Month</option>
        </select>
      </div>
      
      <div className="relative z-10 flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B88645" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="#B88645" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#B88645" stopOpacity={0}/>
              </linearGradient>
              
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#B88645" floodOpacity="0.4" />
              </filter>
            </defs>
            
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#cbd5e1" opacity={0.4} />
            
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              dx={-10}
            />
            
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} 
              wrapperStyle={{ zIndex: 100 }}
            />
            
            <Area 
              type="monotone" 
              dataKey="orders" 
              stroke="#B88645" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorOrders)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#B88645', style: { filter: 'drop-shadow(0px 0px 8px rgba(184,134,69,0.8))' } }}
              style={{ filter: 'url(#glow)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}