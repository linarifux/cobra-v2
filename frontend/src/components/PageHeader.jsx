export default function PageHeader({ title, subtitle, action }) {
  return (
    // 1. Ultra-Glass Container: Frosted pill/card shape that sits slightly above the layout background
    <div className="relative mb-8 p-6 sm:p-8 rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden group">
      
      {/* 2. Embedded Aurora Accents: Subtly glowing orbs inside the header card */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-gold/15 rounded-full blur-[40px] animate-pulse-slow pointer-events-none mix-blend-multiply" />
      <div className="absolute -bottom-16 -left-12 w-64 h-64 bg-slate-400/10 rounded-full blur-[50px] animate-pulse-slow pointer-events-none mix-blend-multiply" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        
        <div className="space-y-1.5 sm:space-y-2">
          {/* 3. Cinemagraph Accent Line: Continuous slow pulsing accent above the title */}
          <div className="flex items-center space-x-2 mb-3 opacity-80">
            <div className="h-1 w-8 bg-gradient-to-r from-brand-gold to-brand-gold/30 rounded-full animate-pulse-slow" />
            <div className="h-1 w-2 bg-brand-gold/50 rounded-full" />
            <div className="h-1 w-1 bg-brand-gold/30 rounded-full" />
          </div>

          {/* 4. Kinetic Typography: Deep gradient clip text with a sharp drop shadow for contrast */}
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 tracking-tight leading-none drop-shadow-sm transition-all duration-500 origin-left hover:scale-[1.01]">
            {title}
          </h1>
          
          {/* Subtitle with a staggered entrance animation */}
          {subtitle && (
            <p 
              className="text-sm sm:text-base font-semibold text-slate-600 max-w-2xl drop-shadow-sm animate-slide-in-right" 
              style={{ animationDelay: '100ms' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        
        {/* 5. Action Slot: Wraps buttons with a staggered animation so they pop in after the text */}
        {action && (
          <div 
            className="relative animate-slide-in-right shrink-0" 
            style={{ animationDelay: '200ms' }}
          >
            {action}
          </div>
        )}
      </div>
    </div>
  );
}