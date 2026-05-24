import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Edit } from 'lucide-react';

// Import the new tab components
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
  
  // State lifted to parent so it can be managed globally if needed
  const [rates, setRates] = useState([
    { id: 1, name: 'Pick & Pack Fee', value: '0.75' },
    { id: 2, name: 'Storage Fee', value: '25.00' }
  ]);

  const [carriers, setCarriers] = useState([
  { id: 1, name: 'UPS', service: 'Ground', account: '12345' }
]);

  const tabs = ['Overview', 'Inventory', 'Processing', 'Carrier', 'Logistics', 'Rates', 'Staff'];

  // Map tabs to components
  const TabComponents = {
    Overview: OverviewTab,
    Inventory: InventoryTab,
    Processing: ProcessingTab,
    Carrier: CarrierTab,
    Logistics: LogisticsTab,
    Rates: RatesTab,
    Staff: StaffTab
  };

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
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl">
             <Building size={32} className="text-brand-gold mb-4" />
             <h1 className="text-lg font-black">Global Logistics Corp</h1>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-wrap gap-2 bg-white/20 p-1.5 rounded-2xl w-fit">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-3xl min-h-[400px]">
             {/* Dynamic Component Injection */}
             <ActiveComponent rates={rates} setRates={setRates} carriers={carriers} setCarriers={setCarriers} />
          </div>
        </div>
      </div>
    </div>
  );
}