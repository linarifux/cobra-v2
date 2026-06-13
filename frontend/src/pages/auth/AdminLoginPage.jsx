import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useDispatch, useSelector } from 'react-redux';
import { Mail, Lock, ShieldCheck, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser, clearError } from '../../store/slices/authSlice';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const authState = useSelector((state) => state.auth);
  const { status, error, isAuthenticated } = authState || {};

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const isLoading = status === 'loading';

  // Fallback: If they manually navigate to /login while ALREADY authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true }); 
    }
  }, [isAuthenticated, navigate]);

  // FIX: Restored this hook to clear the error banner dynamically when the user types
  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.email, formData.password]);

  // FIX: Restored cleanup on unmount so ghost errors don't persist
  useEffect(() => {
    return () => {
      if (error) dispatch(clearError());
    };
  }, [dispatch, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || isLoading) return;

    try {
      // 1. Dispatch the login and immediately unwrap the payload
      const result = await dispatch(loginUser({ 
        email: formData.email.trim().toLowerCase(),
        password: formData.password, 
        portal: 'admin' 
      })).unwrap();

      // 2. Check the portal directly from the server response
      if (result.data?.user?.portal === 'admin') {
        
        // 3. HARD REDIRECT directly to the homepage ('/')
        navigate('/', { replace: true });
        
      } else {
        alert("Unauthorized access. This portal is for Command Center Admins only.");
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Background Elements for Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-gold/20 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-slate-300/40 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/80 p-8 sm:p-10 rounded-[2rem] shadow-2xl animate-fade-in z-10">
        
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg mb-4 border border-slate-800">
            <ShieldCheck size={28} className="text-brand-gold" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">COBRA Admin</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Command & Logistics Portal</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-3 sm:p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-red-800 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
              Administrator Email
            </label>
            <div className="relative">
              <Mail size={16} className={`absolute left-3.5 top-3 transition-colors ${isLoading ? 'text-slate-300' : 'text-slate-400'}`} />
              <input 
                id="email"
                type="email" 
                required
                autoFocus
                autoComplete="username"
                disabled={isLoading}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="admin@cobra.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-end ml-1">
              <label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Secure Password
              </label>
              <button 
                type="button" 
                onClick={() => alert('Please contact your System Commander to reset your password.')}
                className="text-[10px] font-bold text-brand-gold hover:text-amber-500 transition-colors focus:outline-none"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className={`absolute left-3.5 top-3 transition-colors ${isLoading ? 'text-slate-300' : 'text-slate-400'}`} />
              <input 
                id="password"
                type={showPassword ? 'text' : 'password'} 
                required
                autoComplete="current-password"
                disabled={isLoading}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-white/60 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                tabIndex="-1"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-slate-900/20 transition-all duration-200 mt-4 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-brand-gold" />
                <span>Authenticating...</span>
              </>
            ) : (
              'Access Command Center'
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200/60 pt-6">
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
            Unauthorized access to this portal is strictly prohibited. <br className="hidden sm:block"/> All activity is logged and monitored.
          </p>
        </div>
        
      </div>
    </div>
  );
}