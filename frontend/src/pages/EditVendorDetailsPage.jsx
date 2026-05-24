import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, X, Building, Mail, 
  Phone, MapPin, Tag, Briefcase, FileText 
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function EditVendorDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock initial state - In a real app, you would fetch this by 'id'
  const [formData, setFormData] = useState({
    name: 'Global Logistics Corp',
    category: 'Courier',
    status: 'Active',
    email: 'ops@globallog.com',
    phone: '+1 (555) 123-4567',
    address: '123 Supply Chain Way, Chicago, IL',
    notes: 'Primary logistics partner for North American retail division.'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    console.log('Saving Vendor Data:', formData);
    // Add API logic here
    navigate(`/vendors/${id}`);
  };

  return (
    <div className="h-full flex flex-col gap-6 max-w-[900px] mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-4 rounded-2xl border border-white/50 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={18} /> <span className="text-xs font-black uppercase tracking-widest">Cancel</span>
        </button>
        <div className="flex gap-3">
          <button onClick={handleSave} className="flex items-center gap-2 bg-brand-gold text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-transform">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-3xl space-y-8">
        
        {/* Section: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Building size={14}/> General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Vendor Name</label>
              <input name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-sm font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-sm font-medium">
                <option value="Courier">Courier</option>
                <option value="Supplier">Supplier</option>
                <option value="Manufacturer">Manufacturer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: Contact */}
        <div className="space-y-4 pt-4 border-t border-white/50">
          <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Mail size={14}/> Contact Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
              <input name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-sm font-medium" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-sm font-medium" />
            </div>
          </div>
        </div>

        {/* Section: Operational */}
        <div className="space-y-4 pt-4 border-t border-white/50">
          <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><MapPin size={14}/> Operational Data</h3>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Office Address</label>
            <input name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-sm font-medium" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Internal Notes</label>
            <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-sm font-medium" />
          </div>
        </div>

      </div>
    </div>
  );
}