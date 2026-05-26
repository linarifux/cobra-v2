import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Added new icons for the new info
import { ArrowLeft, Building, Edit, Mail, Phone, MapPin, ShieldCheck, Clock, Star, TrendingUp } from 'lucide-react';

import OverviewTab from '../components/vendors/tabs/OverviewTab';
import InventoryTab from '../components/vendors/tabs/InventoryTab';
import ProcessingTab from '../components/vendors/tabs/ProcessingTab';
import LogisticsTab from '../components/vendors/tabs/LogisticsTab';
import RatesTab from '../components/vendors/tabs/RatesTab';
import StaffTab from '../components/vendors/tabs/StaffTab';
import CarrierTab from '../components/vendors/tabs/CarrierTab'; 

export default function VendorDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [rates, setRates] = useState([
    { id: 1, name: 'Pick & Pack Fee', value: '0.75' },
    { id: 2, name: 'Storage Fee', value: '25.00' }
  ]);

  const [carriers, setCarriers] = useState([
    { id: 1, name: 'UPS', service: 'Ground', account: '12345' }
  ]);

  const tabs = ['Overview', 'Inventory', 'Processing', 'Carrier', 'Logistics', 'Rates', 'Staff'];
  const TabComponents = { Overview: OverviewTab, Inventory: InventoryTab, Processing: ProcessingTab, Carrier: CarrierTab, Logistics: LogisticsTab, Rates: RatesTab, Staff: StaffTab };
  const ActiveComponent = TabComponents[activeTab];

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-4 rounded-2xl border border-white/50 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={18} /> <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>
        <button onClick={() => navigate(`/vendors/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl text-xs font-bold border border-white/50 hover:bg-white transition-all">
          <Edit size={14} /> Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Added Contact and Compliance Details */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl">
             <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Building size={32} className="text-brand-gold" />
                </div>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30">ACTIVE</span>
             </div>
             <h1 className="text-lg font-black">Global Logistics Corp</h1>
             <p className="text-xs text-slate-400 mb-6">Vendor ID: {id || 'V-001'}</p>
             
             <div className="space-y-4 text-xs border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 text-slate-300"><Mail size={14} /> ops@globallog.com</div>
                <div className="flex items-center gap-2 text-slate-300"><Phone size={14} /> +1 (555) 123-4567</div>
                <div className="flex items-start gap-2 text-slate-300"><MapPin size={14} /> 123 Supply Chain Way, Chicago, IL</div>
                <div className="flex items-center gap-2 text-slate-300"><Clock size={14} /> Member since 2022</div>
                <div className="flex items-center gap-2 text-emerald-400 pt-2"><ShieldCheck size={14} /> ISO 9001 Certified</div>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* NEW: Performance Summary Row */}
          <div className="grid grid-cols-3 gap-4">
             {[
               { label: 'Avg Rating', value: '4.9/5', icon: <Star size={16} className="text-amber-400" /> },
               { label: 'Orders (Mo)', value: '1,240', icon: <TrendingUp size={16} className="text-emerald-500" /> },
               { label: 'Support Tier', value: 'Premium', icon: <ShieldCheck size={16} className="text-blue-500" /> }
             ].map((stat, i) => (
                <div key={i} className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500">{stat.label}</p>
                        <p className="font-black text-lg">{stat.value}</p>
                    </div>
                    {stat.icon}
                </div>
             ))}
          </div>

          {/* Existing Tab Nav */}
          <div className="flex flex-wrap gap-2 bg-white/20 p-1.5 rounded-2xl w-fit">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-3xl min-h-[400px]">
             <ActiveComponent rates={rates} setRates={setRates} carriers={carriers} setCarriers={setCarriers} />
          </div>
        </div>
      </div>
    </div>
  );
}