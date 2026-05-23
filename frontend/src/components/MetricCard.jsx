import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({ title, value, icon: Icon, colorTheme, trend }) {
  const themes = {
    gold: { gradient: 'from-brand-gold/30 to-brand-gold/5', text: 'text-brand-gold', glow: 'bg-brand-gold/20' },
    blue: { gradient: 'from-blue-500/30 to-blue-500/5', text: 'text-blue-600', glow: 'bg-blue-400/20' },
    orange: { gradient: 'from-orange-500/30 to-orange-500/5', text: 'text-orange-600', glow: 'bg-orange-400/20' },
    green: { gradient: 'from-emerald-500/30 to-emerald-500/5', text: 'text-emerald-600', glow: 'bg-emerald-400/20' },
    red: { gradient: 'from-rose-500/30 to-rose-500/5', text: 'text-rose-600', glow: 'bg-rose-400/20' },
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    // 1. Tighter Layout: Reduced padding to p-5 sm:p-6 and rounded corners to rounded-2xl for a sleeker profile
    <div className="relative overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] group transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      
      {/* Interactive Aurora Flare: Slightly scaled down to match the smaller card */}
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-[32px] opacity-50 group-hover:opacity-100 group-hover:scale-[2] transition-all duration-700 pointer-events-none mix-blend-multiply ${theme.glow}`} />
      
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-slate-300/30 rounded-full blur-[24px] pointer-events-none mix-blend-multiply" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1.5">
          {/* 2. Refined Title: Switched to font-medium and standard tracking for elegance rather than aggression */}
          <p className="text-xs font-medium text-slate-500 tracking-wider drop-shadow-sm">
            {title}
          </p>
          {/* 3. Balanced Value Typography: Reduced to text-3xl, changed font-black to font-extrabold, and softened the gradient */}
          <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-800 to-slate-500 tracking-tight drop-shadow-sm transition-transform duration-500 origin-left group-hover:scale-105">
            {value}
          </p>
        </div>
        
        {/* 4. Sleeker Icon Receptacle: Reduced padding slightly and icon size to w-5 h-5 */}
        <div className="relative p-2.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_8px_rgba(0,0,0,0.03)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-50 ${theme.gradient}`} />
          <Icon className={`relative z-10 w-5 h-5 ${theme.text} drop-shadow-sm`} strokeWidth={2} />
        </div>
      </div>
      
      {trend && (
        // 5. Compact Trend Pill: Tighter padding, smaller font, and reduced visual weight
        <div className="relative z-10 mt-5 flex items-center text-xs font-semibold bg-white/40 w-fit px-2.5 py-1 rounded-md border border-white/60 shadow-sm backdrop-blur-sm">
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 mr-1.5 animate-pulse-slow drop-shadow-sm" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-600 mr-1.5 animate-pulse-slow drop-shadow-sm" />
          )}
          <span className={trend.isPositive ? 'text-emerald-700' : 'text-rose-700'}>
            {trend.value}
          </span>
          <span className="text-slate-500 font-medium ml-1.5 text-[10px] uppercase tracking-wider">
            vs last week
          </span>
        </div>
      )}
    </div>
  );
}