import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building, Mail, Phone, MapPin, 
  Package, Users, DollarSign, Truck, BarChart3, 
  Settings, CheckCircle, AlertCircle, Plus, Edit
} from 'lucide-react';

export default function VendorDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = ['Overview', 'Inventory', 'Logistics', 'Fees', 'Staff'];

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-4 rounded-2xl border border-white/50 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={18} /> <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl text-xs font-bold border border-white/50 hover:bg-white transition-all">
            <Edit size={14} /> Edit Profile
          </button>
          <button className="bg-brand-gold text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-transform">
            View Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar (Vendor Info) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
              <Building size={32} className="text-brand-gold" />
            </div>
            <h1 className="text-lg font-black">Global Logistics Corp</h1>
            <p className="text-xs text-slate-400 mb-6">ID: {id || 'V-001'}</p>
            
            <div className="space-y-4 text-xs border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-slate-300"><Mail size={14} /> ops@globallog.com</div>
              <div className="flex items-center gap-2 text-slate-300"><Phone size={14} /> +1 (555) 123-4567</div>
              <div className="flex items-start gap-2 text-slate-300"><MapPin size={14} /> 123 Supply Chain Way, Chicago, IL</div>
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-md border border-white/60 p-6 rounded-3xl">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span>Orders/Mo</span> <span className="font-bold">1,240</span></div>
              <div className="flex justify-between"><span>Active SKUs</span> <span className="font-bold">84</span></div>
              <div className="flex justify-between"><span>Status</span> <span className="text-emerald-600 font-bold">Active</span></div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex gap-2 bg-white/20 p-1.5 rounded-2xl w-fit">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Dynamic Content Based on Tab */}
          <TabContent activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}

function TabContent({ activeTab }) {
  // Simple switch for demonstration
  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-3xl min-h-[400px]">
       {activeTab === 'Overview' && (
         <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white/50 rounded-2xl border border-white/50">
              <h3 className="font-bold mb-4">Operational Divisions</h3>
              <div className="flex gap-2">
                {['Retail', 'B2B', 'Wholesale'].map(d => <span key={d} className="px-3 py-1 bg-brand-gold/10 text-brand-gold rounded-lg text-xs font-bold">{d}</span>)}
              </div>
            </div>
            <div className="p-6 bg-white/50 rounded-2xl border border-white/50">
              <h3 className="font-bold mb-4">Requested Carriers</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• UPS Ground/Air</li>
                <li>• FedEx Freight</li>
                <li>• USPS Priority</li>
              </ul>
            </div>
         </div>
       )}

       {activeTab === 'Fees' && (
         <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
              <div><p className="font-bold">Pick & Pack Fee</p><p className="text-xs text-slate-500">Per unit</p></div>
              <span className="font-black text-lg">$0.75</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
              <div><p className="font-bold">Storage Fee</p><p className="text-xs text-slate-500">Per pallet/month</p></div>
              <span className="font-black text-lg">$25.00</span>
            </div>
         </div>
       )}

       {activeTab === 'Staff' && (
         <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div><p className="font-bold">John Doe</p><p className="text-[10px] text-slate-500">Account Manager</p></div>
                </div>
                <button className="text-xs font-bold text-slate-400 hover:text-slate-900">Edit Permissions</button>
            </div>
            <button className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:border-slate-400 transition-colors">
                <Plus size={16} /> Add Staff Member
            </button>
         </div>
       )}
    </div>
  );
}