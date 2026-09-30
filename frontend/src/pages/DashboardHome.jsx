import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Package, RefreshCw, AlertCircle, RefreshCcw, Loader2
} from 'lucide-react';

// Redux
import { fetchOrders } from '../store/slices/orderSlice';
import { fetchReceivingLogs } from '../store/slices/receivingSlice';
import { fetchInventory } from '../store/slices/inventorySlice';
import { fetchCustomers } from '../store/slices/customerSlice';

// Components
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import RecentActivityTable from '../features/dashboard/RecentActivityTable';
import FinancialOverview from '../components/dashboard/FinancialOverview';
import OperationalHealth from '../components/dashboard/OperationalHealth';

export default function DashboardHome() {
  const dispatch = useDispatch();

  // 1. Hook into Global States
  const { items: orders = [], status: ordersStatus } = useSelector((state) => state.orders || {});
  const { items: receivingLogs = [], status: receivingStatus } = useSelector((state) => state.receiving || {});
  const { items: inventory = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});
  const { items: customers = [], status: custStatus } = useSelector((state) => state.customers || {});

  const isGlobalLoading = ordersStatus === 'loading' || receivingStatus === 'loading' || inventoryStatus === 'loading' || custStatus === 'loading';

  useEffect(() => {
    if (ordersStatus === 'idle') dispatch(fetchOrders());
    if (receivingStatus === 'idle') dispatch(fetchReceivingLogs());
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
    if (custStatus === 'idle') dispatch(fetchCustomers());
  }, [dispatch, ordersStatus, receivingStatus, inventoryStatus, custStatus]);

  const handleForceSync = () => {
    dispatch(fetchOrders());
    dispatch(fetchReceivingLogs());
    dispatch(fetchInventory());
  };

  // 2. Compute Top-Level Operational Metrics
  const operationalStats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => ['Pending', 'Processing'].includes(o.status)).length;
    const issueOrders = orders.filter(o => ['Cancelled', 'On Hold'].includes(o.status)).length;

    // Real Action Required List
    const actionRequired = orders
      .filter(o => o.status === 'On Hold')
      .slice(0, 3)
      .map(o => ({
        id: o.orderNumber,
        issue: o.notes || 'Action Required (Review Order)',
        client: o.customer?.customerName || 'Unknown'
      }));

    // Real Inventory Alerts List
    const inventoryAlerts = inventory
      .filter(inv => (Number(inv.available) || 0) < 20)
      .sort((a, b) => (Number(a.available) || 0) - (Number(b.available) || 0))
      .slice(0, 4)
      .map(inv => {
        const stock = Number(inv.available) || 0;
        return {
          sku: inv.sku || inv.productCode,
          name: inv.itemName || inv.description,
          stock: stock,
          status: stock === 0 ? 'Critical' : 'Low'
        }
      });

    const recentActivity = [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(order => ({
        id: order.orderNumber,
        client: order.customer?.customerName || 'Unknown Customer',
        status: order.status,
        carrier: order.shippingDetails?.carrierType || '-',
        time: new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }));

    return { totalOrders, pendingOrders, issueOrders, recentActivity, actionRequired, inventoryAlerts };
  }, [orders, inventory]);

  // 3. Compute High-Level Financial Analytics
  const financialStats = useMemo(() => {
    const totalProcessing = orders.reduce((sum, order) => sum + (Number(order.processingFees?.totalProcessingFee) || 0), 0);
    const totalReceiving = receivingLogs.reduce((sum, log) => sum + (Number(log.charge) || 0), 0);
    const grandTotal = totalProcessing + totalReceiving;

    const clientRevenueMap = {};

    orders.forEach(order => {
      const clientName = order.customer?.customerName || 'Unknown';
      const fee = Number(order.processingFees?.totalProcessingFee) || 0;
      if (!clientRevenueMap[clientName]) clientRevenueMap[clientName] = { name: clientName, processing: 0, receiving: 0, total: 0 };
      clientRevenueMap[clientName].processing += fee;
      clientRevenueMap[clientName].total += fee;
    });

    receivingLogs.forEach(log => {
      const clientName = log.customer?.customerName || 'Unknown';
      const fee = Number(log.charge) || 0;
      if (!clientRevenueMap[clientName]) clientRevenueMap[clientName] = { name: clientName, processing: 0, receiving: 0, total: 0 };
      clientRevenueMap[clientName].receiving += fee;
      clientRevenueMap[clientName].total += fee;
    });

    const topClients = Object.values(clientRevenueMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); 

    return { totalProcessing, totalReceiving, grandTotal, topClients };
  }, [orders, receivingLogs]);

  return (
    <div className="relative min-h-full bg-slate-50/50 p-6 space-y-6 rounded-3xl overflow-hidden z-0">
      
      {/* 1. Ambient Aurora Background Layer */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-gold/10 rounded-full blur-[100px] animate-aurora pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-[100px] animate-aurora-reverse pointer-events-none -z-10" />

      {/* 2. Kinetic Entrance Header */}
      <div className="animate-slide-in-right" style={{ animationDelay: '0ms' }}>
        <PageHeader 
          title="Financial & Operational Dashboard" 
          subtitle="Cobra Fulfillment Center - Real-Time Analytics Overview"
          action={
            <div className="flex items-center gap-4">
              <button 
                onClick={handleForceSync}
                disabled={isGlobalLoading}
                className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_16px_rgba(184,134,69,0.3)] hover:shadow-[0_6px_24px_rgba(184,134,69,0.4)] hover:-translate-y-0.5 group whitespace-nowrap disabled:opacity-70"
              >
                <RefreshCcw className={`w-4 h-4 transition-transform duration-700 ease-in-out ${isGlobalLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                {isGlobalLoading ? 'Syncing Data...' : 'Force Sync Now'}
              </button>
            </div>
          }
        />
      </div>

      {/* Row 1 & 2: Financial Summary and Bar Chart */}
      <FinancialOverview financialStats={financialStats} />

      {/* Row 3: Operational Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-slide-in-right" style={{ animationDelay: '150ms' }}>
        <MetricCard title="Total Fulfillment Orders" value={operationalStats.totalOrders.toLocaleString()} icon={Package} colorTheme="gold" />
        <MetricCard title="Processing & Pending" value={operationalStats.pendingOrders.toLocaleString()} icon={RefreshCw} colorTheme="orange" />
        <MetricCard title="Active Order Holds" value={operationalStats.issueOrders.toLocaleString()} icon={AlertCircle} colorTheme="red" />
      </div>

      {/* Row 4: Operational Health Alerts */}
      <OperationalHealth operationalStats={operationalStats} />

      {/* Row 6: Data Table (Connected to Redux) */}
      <div className="animate-slide-in-right" style={{ animationDelay: '400ms' }}>
        {ordersStatus === 'loading' ? (
           <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-10 flex justify-center text-slate-400">
             <Loader2 className="animate-spin text-brand-gold w-8 h-8" />
           </div>
        ) : operationalStats.recentActivity.length > 0 ? (
          <RecentActivityTable data={operationalStats.recentActivity} />
        ) : (
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-10 text-center text-slate-500 font-bold shadow-sm">
             No recent orders found in the database.
          </div>
        )}
      </div>
      
    </div>
  );
}