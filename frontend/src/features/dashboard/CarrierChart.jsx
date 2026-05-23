import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Sector } from 'recharts';
import { Truck } from 'lucide-react';

const data = [
  { name: 'FedEx', value: 45, color: '#B88645' }, 
  { name: 'UPS', value: 30, color: '#334155' },   
  { name: 'USPS', value: 20, color: '#94a3b8' },  
  { name: 'DHL', value: 5, color: '#cbd5e1' },    
];

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} 
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 ease-out"
        style={{ 
          filter: `drop-shadow(0px 8px 16px ${payload.color}60)`, 
          outline: 'none' 
        }} 
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-white/90 backdrop-blur-3xl border border-white/80 p-3.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] z-50">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-2.5 h-2.5 rounded-full shadow-sm" 
            style={{ backgroundColor: entry.payload.color }} 
          />
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 tracking-tighter leading-none">
              {entry.value}%
            </span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">
              {entry.name} Share
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function CarrierChart() {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <div className="relative overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl p-5 sm:p-6 h-[420px] flex flex-col group transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      
      {/* Aurora Integration: Organic fluid movement using your specialized classes */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-gold/10 rounded-full blur-[60px] animate-aurora pointer-events-none mix-blend-multiply transition-opacity duration-700 opacity-60 group-hover:opacity-90" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-slate-300/40 rounded-full blur-[60px] animate-aurora-reverse pointer-events-none mix-blend-multiply" />

      {/* Kinetic Entrance Title block */}
      <div className="relative z-10 flex flex-col mb-4 animate-slide-in-right">
        <h3 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 tracking-tight flex items-center gap-2 transition-transform duration-500 origin-left group-hover:scale-[1.01]">
          {/* Cinemagraph Icon Pulse */}
          <Truck className="w-4 h-4 text-brand-gold scale-110 animate-pulse-slow" />
          Carrier Distribution
        </h3>
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase mt-1">
          Percentage of total weekly dispatch
        </p>
      </div>
      
      <div className="relative z-10 flex-1 w-full min-h-0">
        
        {/* Central Hub with smooth opacity transition */}
        <div 
          className={`absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center text-center transition-opacity duration-300 ${
            activeIndex !== null ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
            Total
          </span>
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-700 tracking-tighter leading-none">
            100%
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="carrier-grad-0" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#B88645" />
                <stop offset="100%" stopColor="#966a33" />
              </linearGradient>
              <linearGradient id="carrier-grad-1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="carrier-grad-2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="carrier-grad-3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>

            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={75}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth={2}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#carrier-grad-${index})`}
                  style={{ outline: 'none' }}
                  className={`transition-opacity duration-300 cursor-pointer ${
                    activeIndex !== null && activeIndex !== index ? 'opacity-60' : 'opacity-100'
                  }`}
                />
              ))}
            </Pie>

            <Tooltip 
              content={<CustomTooltip />} 
              cursor={false} 
              wrapperStyle={{ zIndex: 100 }} 
            />
            
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1 hover:text-slate-900 transition-colors">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}