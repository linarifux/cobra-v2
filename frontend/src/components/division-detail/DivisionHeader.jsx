import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Building2, User as UserIcon, Mail, Phone, MapPin, Upload, Edit3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadDivisionLogo } from '../../store/slices/divisionSlice'; 

export default function DivisionHeader({ division, formatAddress }) {
  const dispatch = useDispatch();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!division) return null;

  // Handle the file selection and upload process
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size (e.g., max 2MB)
    if (!file.type.startsWith('image/')) {
      return toast.error('Invalid file type. Please upload an image.');
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('File is too large. Maximum size is 2MB.');
    }

    setIsUploading(true);

    try {
      // Dispatch the thunk to the backend to handle the S3 process
      await dispatch(uploadDivisionLogo({ id: division._id, file })).unwrap();
      toast.success('Division logo updated successfully.');
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error(error || 'Failed to upload logo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  // Match the schema field 'divisionLogo'
  const hasLogo = Boolean(division.divisionLogo);

  return (
    <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-2xl border border-slate-900 transition-all duration-300 relative overflow-hidden flex flex-col gap-6">
      
      {/* Decorative Background Blob */}
      <div className="absolute top-0 left-1/2 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/3" />
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleLogoUpload}
      />

      {/* --- Top Section: Logo & Identity --- */}
      <div className="relative z-10 flex flex-col items-center gap-5 border-b border-white/10 pb-6">
        
        {/* Interactive Logo Container */}
        <div 
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white border-2 border-brand-gold/20 flex items-center justify-center shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.5)] group overflow-hidden cursor-pointer"
          onClick={triggerFileInput}
          title={hasLogo ? "Change Logo" : "Upload Logo"}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="animate-spin text-brand-gold" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Uploading</span>
            </div>
          ) : hasLogo ? (
            <img 
              src={division.divisionLogo} 
              alt={`${division.divisionName} Logo`} 
              className="w-full h-full object-contain p-3"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Building2 size={36} className="text-slate-400" strokeWidth={1.5} />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">No Logo</span>
            </div>
          )}

          {/* Hover Overlay for Upload/Edit */}
          {!isUploading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-2">
              {hasLogo ? (
                <>
                  <div className="bg-white/10 p-2 rounded-full">
                    <Edit3 size={18} className="text-brand-gold" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">Update Logo</span>
                </>
              ) : (
                <>
                  <div className="bg-white/10 p-2 rounded-full">
                    <Upload size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Upload</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Text Identity */}
        <div className="flex flex-col items-center text-center w-full px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/80 mb-1 block">Operational Identity</span>
          <p className="font-black text-2xl sm:text-3xl tracking-tight text-white w-full break-words" title={division.divisionName}>
            {division.divisionName}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
              division.status === 'Active' 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
            }`}>
              {division.status || 'Active'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono font-medium px-2 py-1 bg-white/5 rounded-lg border border-white/5">
              ID: {division.divisionCode || division.code || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* --- Micro-Cards for Contact Info --- */}
      <div className="relative z-10 space-y-3 text-xs font-medium">
        <div className="flex items-center gap-3.5 min-w-0 bg-white/5 p-3.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200 cursor-default">
          <UserIcon size={16} className="text-brand-gold shrink-0 opacity-80" />
          <span className="truncate font-semibold tracking-wide text-slate-200">
            {division.contactName || 'No contact specified'}
          </span>
        </div>
        
        <div className="flex items-center gap-3.5 min-w-0 bg-white/5 p-3.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200 cursor-default">
          <Mail size={16} className="text-brand-gold shrink-0 opacity-80" />
          <span className="break-all select-all font-semibold tracking-wide text-slate-200">
            {division.contactEmail || 'No email provided'}
          </span>
        </div>
        
        <div className="flex items-center gap-3.5 min-w-0 bg-white/5 p-3.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200 cursor-default">
          <Phone size={16} className="text-brand-gold shrink-0 opacity-80" />
          <span className="truncate font-semibold tracking-wide text-slate-200">
            {division.contactNumber || 'No phone provided'}
          </span>
        </div>
        
        <div className="flex items-start gap-3.5 min-w-0 bg-white/5 p-3.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200 cursor-default">
          <MapPin size={16} className="text-brand-gold shrink-0 mt-0.5 opacity-80" />
          <span className="break-words font-semibold tracking-wide text-slate-200 leading-relaxed">
            {formatAddress(division.address)}
          </span>
        </div>
      </div>
    </div>
  );
}