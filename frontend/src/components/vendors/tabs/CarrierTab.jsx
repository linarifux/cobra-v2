import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Truck, Loader2, Settings2, ShieldAlert } from 'lucide-react';
import { fetchCarriers } from '../../../store/slices/carrierSlice';
import { updateCustomerCarriersConfig } from '../../../store/slices/customerSlice';

// 1. HARDCODED OFFICIAL CATALOG
const DEFAULT_SERVICES = {
  FedEx: [
    { serviceCode: 'FIRST_OVERNIGHT', serviceName: 'First Overnight' },
    { serviceCode: 'PRIORITY_OVERNIGHT', serviceName: 'Priority Overnight' },
    { serviceCode: 'STANDARD_OVERNIGHT', serviceName: 'Standard Overnight' },
    { serviceCode: 'FEDEX_2_DAY_AM', serviceName: 'FedEx 2Day AM' },
    { serviceCode: 'FEDEX_2_DAY', serviceName: 'FedEx 2Day' },
    { serviceCode: 'EXPRESS_SAVER', serviceName: 'FedEx Express Saver' },
    { serviceCode: 'FEDEX_GROUND', serviceName: 'FedEx Ground' },
    { serviceCode: 'GROUND_HOME_DELIVERY', serviceName: 'FedEx Home Delivery' },
    { serviceCode: 'INTERNATIONAL_FIRST', serviceName: 'FedEx International First' },
    { serviceCode: 'INTERNATIONAL_PRIORITY', serviceName: 'FedEx International Priority' },
    { serviceCode: 'INTERNATIONAL_ECONOMY', serviceName: 'FedEx International Economy' }
  ],
  USPS: [
    { serviceCode: 'USPS_GROUND_ADVANTAGE', serviceName: 'USPS Ground Advantage' },
    { serviceCode: 'PRIORITY_MAIL', serviceName: 'Priority Mail' },
    { serviceCode: 'PRIORITY_MAIL_EXPRESS', serviceName: 'Priority Mail Express' },
    { serviceCode: 'MEDIA_MAIL', serviceName: 'Media Mail' },
    { serviceCode: 'FIRST_CLASS_MAIL_INTERNATIONAL', serviceName: 'First-Class Package International' }
  ],
  UPS: [
    { serviceCode: 'UPS_GROUND', serviceName: 'UPS Ground' },
    { serviceCode: 'UPS_3_DAY_SELECT', serviceName: 'UPS 3 Day Select' },
    { serviceCode: 'UPS_2ND_DAY_AIR', serviceName: 'UPS 2nd Day Air' },
    { serviceCode: 'UPS_NEXT_DAY_AIR', serviceName: 'UPS Next Day Air' },
    { serviceCode: 'UPS_STANDARD_INTERNATIONAL', serviceName: 'UPS Standard' }
  ],
  LTL: [
    { serviceCode: 'LTL_STANDARD', serviceName: 'Standard LTL Freight' },
    { serviceCode: 'LTL_EXPEDITED', serviceName: 'Expedited LTL Freight' }
  ]
};

export default function CarrierTab({ customerData }) {
  const dispatch = useDispatch();
  
  const { items: globalCarriers = [], status: carrierStatus } = useSelector(state => state.carriers || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (carrierStatus === 'idle') {
      dispatch(fetchCarriers());
    }
  }, [carrierStatus, dispatch]);

  const assignedConfigurations = customerData?.carrierConfigurations || [];

  // 2. DYNAMICALLY BUILD THE MASTER SERVICE LIST
  const allAvailableServices = [];

  if (Array.isArray(globalCarriers)) {
    globalCarriers.forEach(carrier => {
      if (!carrier?.isActive) return; // Skip globally inactive carriers

      // Fetch the official catalog for this carrier type instead of relying on global settings
      const catalogServices = DEFAULT_SERVICES[carrier.carrierType] || [];

      catalogServices.forEach(globalService => {
        const customerConfig = assignedConfigurations.find(
          c => (c.carrier?._id || c.carrier) === carrier._id
        );

        let isAllowedForCustomer = false;

        // Check if THIS specific service is marked as active for the customer
        if (customerConfig && customerConfig.isActive) {
          const customerServiceRule = customerConfig.allowedServices?.find(
            s => s.serviceCode === globalService.serviceCode
          );
          if (customerServiceRule && customerServiceRule.isActive) {
            isAllowedForCustomer = true;
          }
        }

        allAvailableServices.push({
          carrierId: carrier._id,
          carrierType: carrier.carrierType,
          accountName: carrier.accountName,
          serviceCode: globalService.serviceCode,
          serviceName: globalService.serviceName,
          isAllowedForCustomer
        });
      });
    });
  }

  // 3. HANDLE TOGGLING A SERVICE
  const handleToggleService = async (carrierId, serviceCode, serviceName, currentIsAllowed) => {
    setIsSubmitting(true);

    // Deep clone the configurations to safely mutate them
    let updatedConfigurations = JSON.parse(JSON.stringify(assignedConfigurations));

    const configIndex = updatedConfigurations.findIndex(
      c => (c.carrier?._id || c.carrier) === carrierId
    );

    if (configIndex > -1) {
      // Configuration exists. Ensure it's active overall.
      const config = updatedConfigurations[configIndex];
      config.isActive = true; 
      
      // Safety check
      if (!config.allowedServices) config.allowedServices = [];

      const serviceIndex = config.allowedServices.findIndex(s => s.serviceCode === serviceCode);
      
      if (serviceIndex > -1) {
        // Flip the boolean
        config.allowedServices[serviceIndex].isActive = !currentIsAllowed;
      } else {
        // Add new service and set to true
        config.allowedServices.push({ serviceCode, serviceName, isActive: true });
      }
    } else {
      // The customer has never used this carrier before. Create the carrier block.
      updatedConfigurations.push({
        carrier: carrierId,
        isActive: true,
        allowedServices: [{ serviceCode, serviceName, isActive: true }]
      });
    }

    try {
      // FIX: Filter out any null carriers and use optional chaining (?.)
      const payload = updatedConfigurations
        .filter(c => c && c.carrier) // Strip out orphaned/null carriers
        .map(c => ({
          ...c,
          carrier: c.carrier?._id || c.carrier // Safely extract the ID
        }));

      await dispatch(updateCustomerCarriersConfig({ 
        id: customerData._id, 
        carrierConfigurations: payload 
      })).unwrap();
    } catch (err) {
      alert(`Failed to update service: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (carrierStatus === 'loading') {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Customer Shipping Allowances</h3>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">Toggle which global shipping services this customer is permitted to use.</p>
        </div>
        <Settings2 className="text-brand-gold opacity-30" size={32} />
      </div>

      {allAvailableServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/40 border border-dashed border-slate-200 rounded-3xl">
          <ShieldAlert size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No Global Services Available</p>
          <p className="text-slate-400 text-xs font-medium mt-1 text-center max-w-sm">
            There are currently no active shipping integrations configured in the main system settings. Configure global carriers first.
          </p>
        </div>
      ) : (
        <div className="bg-white/70 rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">Enable</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Carrier</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Service Name</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Service Code</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Customer Status</th>
                </tr>
              </thead>
              <tbody>
                {allAvailableServices.map((service, index) => (
                  <tr 
                    key={`${service.carrierId}-${service.serviceCode}-${index}`} 
                    className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors group"
                  >
                    {/* Checkbox Toggle */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={service.isAllowedForCustomer}
                        onChange={() => handleToggleService(
                          service.carrierId, 
                          service.serviceCode, 
                          service.serviceName, 
                          service.isAllowedForCustomer
                        )}
                        disabled={isSubmitting}
                        className="w-4 h-4 rounded border-slate-300 text-brand-gold focus:ring-brand-gold accent-brand-gold cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    {/* Carrier Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-slate-400" />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {service.carrierType}
                        </span>
                      </div>
                    </td>

                    {/* Service Name Column */}
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-slate-900 font-bold block">{service.serviceName}</span>
                    </td>

                    {/* Service Code Column */}
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] text-slate-500 font-mono font-medium tracking-widest">{service.serviceCode}</span>
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4 text-right">
                      {service.isAllowedForCustomer ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-slate-100 text-slate-400 border border-slate-200 shadow-sm opacity-60">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}