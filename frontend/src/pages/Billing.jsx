import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, FileText, Download, AlertTriangle, Users, Calendar, Calculator, FileSpreadsheet, Eye, ArrowLeft, Package, Box } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Redux Thunks
import { fetchOrders } from '../store/slices/orderSlice';
import { fetchReceivingLogs } from '../store/slices/receivingSlice';
import { fetchCustomers } from '../store/slices/customerSlice';

export default function Billing() {
  const dispatch = useDispatch();

  // --- REDUX STATE ---
  const { items: orders = [], status: ordersStatus } = useSelector(state => state.orders);
  const { items: receivingLogs = [], status: receivingStatus } = useSelector(state => state.receiving);
  const { items: customers = [], status: customersStatus } = useSelector(state => state.customers);

  // --- LOCAL STATES ---
  const [exportCustomer, setExportCustomer] = useState('');
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to first day of current month
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Default to today
  });
  const [isExporting, setIsExporting] = useState(false);
  const [showDetails, setShowDetails] = useState(false); // Toggle for Detailed View

  // Reset details view when filters change
  useEffect(() => {
    setShowDetails(false);
  }, [exportCustomer, exportStartDate, exportEndDate]);

  // --- STRICT FETCH DATA ON MOUNT ---
  useEffect(() => {
    if (ordersStatus === 'idle') dispatch(fetchOrders());
    if (receivingStatus === 'idle') dispatch(fetchReceivingLogs());
    if (customersStatus === 'idle') dispatch(fetchCustomers());
  }, [dispatch, ordersStatus, receivingStatus, customersStatus]);

  const isGlobalLoading = ordersStatus === 'loading' || receivingStatus === 'loading' || customersStatus === 'loading';

  // --- HELPERS ---
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isDateInRange = (dateStr, startDate, endDate) => {
    if (!dateStr) return false;
    const d = new Date(dateStr).toISOString().split('T')[0];
    
    const start = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
    const end = endDate ? new Date(endDate).toISOString().split('T')[0] : null;

    if (start && d < start) return false;
    if (end && d > end) return false;
    
    return true; 
  };

  const reportCustomersList = useMemo(() => {
    const map = new Map();
    orders.forEach(o => o.customer && map.set(o.customer._id || o.customer, o.customer.customerName || 'Unknown'));
    receivingLogs.forEach(r => r.customer && map.set(r.customer._id || r.customer, r.customer.customerName || 'Unknown'));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, receivingLogs]);

  // --- REAL-TIME BILLING AGGREGATION ---
  const billingSummary = useMemo(() => {
    if (!exportCustomer || !exportStartDate || !exportEndDate) return null;

    const filteredOrders = orders.filter(o => String(o.customer?._id || o.customer) === String(exportCustomer) && isDateInRange(o.createdAt, exportStartDate, exportEndDate));
    const filteredReceiving = receivingLogs.filter(r => String(r.customer?._id || r.customer) === String(exportCustomer) && isDateInRange(r.dateReceived, exportStartDate, exportEndDate));

    let orderProcessingBase = 0;
    let orderProcessingCartons = 0;
    let orderProcessingPackages = 0;
    let orderProcessingRush = 0;
    let orderProcessingIntl = 0;
    let orderShippingCosts = 0;
    
    let totalProcessedOrdersCount = filteredOrders.length;
    let totalCartonsUsed = 0;
    let totalPackagesUsed = 0;
    
    let intlShipmentsCount = 0;
    let rushShipmentsCount = 0;
    let shipmentsWithCostCount = 0;

    filteredOrders.forEach(o => {
      const fees = o.processingFees || {};
      orderProcessingBase += (Number(fees.baseFee) || 0) + (Number(fees.lineItemSurcharge) || 0) + (Number(fees.weightSurcharge) || 0) + (Number(fees.pieceSurcharge) || 0);
      
      orderProcessingCartons += (Number(fees.cartonSurcharge) || 0);
      orderProcessingPackages += (Number(fees.packageSurcharge) || 0);
      
      orderProcessingRush += (Number(fees.rushFee) || 0);
      orderProcessingIntl += (Number(fees.internationalFee) || 0);
      
      const shippingCost = Number(o.shippingDetails?.shippingCost) || 0;
      orderShippingCosts += shippingCost;

      totalCartonsUsed += (Number(o.shippingDetails?.cartoons) || 0);
      totalPackagesUsed += (Number(o.shippingDetails?.totalBoxes) || 0);

      if (o.isRushOrder) rushShipmentsCount++;
      if (o.isInternational) intlShipmentsCount++;
      if (shippingCost > 0) shipmentsWithCostCount++;
    });

    const grandProcessingTotal = orderProcessingBase + orderProcessingCartons + orderProcessingPackages + orderProcessingRush + orderProcessingIntl + orderShippingCosts;

    let receivingTotal = 0;
    let receivingPalletsReceived = 0;
    let receivingPalletsSupplied = 0;
    let receivingCartons = 0;
    let receivingUnits = 0;
    let totalReceivingOrdersCount = filteredReceiving.length;
    
    filteredReceiving.forEach(r => {
      receivingTotal += Number(r.totalCharge) || 0;
      receivingPalletsReceived += (Number(r.palletsReceived) || 0);
      receivingPalletsSupplied += (Number(r.suppliedPallets) || 0);
      receivingCartons += (Number(r.numberOfCartons) || 0);
      receivingUnits += (Number(r.quantity) || 0);
    });

    const grandTotal = grandProcessingTotal + receivingTotal;

    return {
      hasData: filteredOrders.length > 0 || filteredReceiving.length > 0,
      filteredOrders,
      filteredReceiving,
      orderProcessingBase,
      orderProcessingCartons,
      orderProcessingPackages,
      orderProcessingRush,
      orderProcessingIntl,
      orderShippingCosts,
      grandProcessingTotal, 
      totalProcessedOrdersCount,
      totalCartonsUsed,
      totalPackagesUsed,
      intlShipmentsCount,
      rushShipmentsCount,
      shipmentsWithCostCount,
      totalReceivingOrdersCount,
      receivingTotal,
      receivingPalletsReceived,
      receivingPalletsSupplied,
      receivingCartons,
      receivingUnits,
      grandTotal
    };
  }, [orders, receivingLogs, exportCustomer, exportStartDate, exportEndDate]);


  // --- INVOICE GENERATOR ---
  const handleGenerateInvoice = async () => {
    if (!exportCustomer) return toast.error("Please select a customer to generate an invoice.");
    if (!exportStartDate || !exportEndDate) return toast.error("Please provide both a start and end date.");
    if (new Date(exportStartDate) > new Date(exportEndDate)) return toast.error("Start date cannot be after end date.");
    if (!billingSummary || !billingSummary.hasData) return toast.warning("No operational data found for this customer in the selected date range.");

    setIsExporting(true);

    try {
      const selectedCustData = customers.find(c => String(c._id) === String(exportCustomer));
      const customerName = selectedCustData ? selectedCustData.customerName : 'Client';

      const doc = new jsPDF();
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(customerName.toUpperCase(), 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice Period: ${exportStartDate} to ${exportEndDate}`, 14, 26);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Activity Recap - ${customerName} Monthly Inventory`, 14, 35);
      
      const tableData = [
        ["Order Processing:", billingSummary.totalProcessedOrdersCount.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingBase)],
        ["Cartons:", billingSummary.totalCartonsUsed.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingCartons)],
        ["Packages:", billingSummary.totalPackagesUsed.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingPackages)],
        ["International Shipments - Other:", billingSummary.intlShipmentsCount.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingIntl)],
        ["Rush Orders:", billingSummary.rushShipmentsCount.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingRush)],
        ["Shipping Costs:", billingSummary.shipmentsWithCostCount.toLocaleString(), "-", formatCurrency(billingSummary.orderShippingCosts)],
        ["Receiving Orders:", billingSummary.totalReceivingOrdersCount.toLocaleString(), "-", "-"],
        ["Receiving Units:", billingSummary.receivingUnits.toLocaleString(), "-", "-"],
        ["Receiving Cartons:", billingSummary.receivingCartons.toLocaleString(), "-", "-"],
        ["Pallets Received / Supplied:", `${billingSummary.receivingPalletsReceived.toLocaleString()} Rcvd, ${billingSummary.receivingPalletsSupplied.toLocaleString()} Supp.`, "-", "-"],
        ["Receiving Total Charges:", "-", "-", formatCurrency(billingSummary.receivingTotal)],
      ];

      autoTable(doc, {
        startY: 40,
        head: [['Activity', 'Quantity', 'Rate', 'Amount']],
        body: tableData,
        theme: 'plain',
        headStyles: { fontStyle: 'bold', textColor: [0, 0, 0], borderBottomWidth: 0.5, borderBottomColor: [0, 0, 0] },
        styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30, halign: 'right' }
        },
        willDrawCell: function(data) {
          if (data.row.section === 'body') {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      // Total Row
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Total:", 14, finalY);
      doc.text(formatCurrency(billingSummary.grandTotal), 194, finalY, { align: 'right' });

      doc.save(`Invoice_${customerName.replace(/\s+/g, '_')}_${exportStartDate}_to_${exportEndDate}.pdf`);
      toast.success(`Invoice generated for ${customerName}`);

    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF invoice.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- RENDER GUARDS ---
  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Scanning Ledgers...</p>
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1200px] mx-auto p-4 sm:p-6 space-y-8 animate-fade-in relative pb-24">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Invoicing</h1>
        <p className="text-sm font-bold text-slate-500">Generate structured PDF bills by aggregating operational processing and receiving actions.</p>
      </div>

      {/* Invoice Generator Controls */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl animate-slide-in-right">
        
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-700/50">
          <div className="p-4 bg-brand-gold/10 text-brand-gold rounded-2xl shadow-inner">
            <FileText size={32} />
          </div>
          <div>
            <h4 className="text-xl font-black text-white">Master Invoice Generator</h4>
            <p className="text-xs font-medium text-slate-400 mt-1">Cross-references all outbound fulfillment and inbound receiving logs to compute the final bill.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="space-y-3 md:col-span-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> Select Client Account
            </label>
            <div className="relative">
              <select 
                value={exportCustomer} 
                onChange={(e) => setExportCustomer(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-brand-gold shadow-sm appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <option value="">-- Choose a Customer --</option>
                {reportCustomersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Start Date
            </label>
            <input 
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-brand-gold shadow-sm cursor-pointer hover:bg-slate-700 transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> End Date
            </label>
            <input 
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-brand-gold shadow-sm cursor-pointer hover:bg-slate-700 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-700/50">
          <div className="flex items-start gap-3 text-slate-400">
            <AlertTriangle size={20} className="text-brand-gold shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed max-w-md">
              Generating an invoice will compile real-time operational data from the database. Ensure all receiving and processing logs for the selected timeframe are finalized.
            </p>
          </div>

          <button 
            onClick={handleGenerateInvoice}
            disabled={isExporting || !exportCustomer || !billingSummary?.hasData}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-gold hover:bg-brand-gold-hover text-slate-900 px-8 py-4 rounded-xl text-sm font-black transition-all shadow-lg hover:shadow-brand-gold/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'Aggregating Logs...' : 'Generate & Download PDF'}
          </button>
        </div>
      </div>

      {/* Live Billing Summary or Detailed Ledger (On-Screen Rendering) */}
      {exportCustomer ? (
        billingSummary?.hasData ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-6 sm:p-8 rounded-3xl shadow-sm animate-slide-in-up transition-all duration-500">
            
            {/* Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-brand-gold" size={24} />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {showDetails ? 'Detailed Invoice Ledger' : 'Invoice Preview Recap'}
                </h3>
              </div>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-brand-gold/50"
              >
                {showDetails ? (
                  <><ArrowLeft size={14} /> Back to Summary</>
                ) : (
                  <><Eye size={14} className="text-brand-gold" /> View Detailed Ledger</>
                )}
              </button>
            </div>
            
            {/* View Switching Logic */}
            {!showDetails ? (
              /* --- 1. SUMMARY VIEW --- */
              <div className="animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 w-1/2">Activity</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 w-1/4">Quantity</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 w-1/4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-bold text-slate-700">
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Order Processing:</td>
                        <td className="py-4 px-4">{billingSummary.totalProcessedOrdersCount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.orderProcessingBase)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Cartons:</td>
                        <td className="py-4 px-4">{billingSummary.totalCartonsUsed.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.orderProcessingCartons)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Packages:</td>
                        <td className="py-4 px-4">{billingSummary.totalPackagesUsed.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.orderProcessingPackages)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">International Shipments - Other:</td>
                        <td className="py-4 px-4">{billingSummary.intlShipmentsCount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.orderProcessingIntl)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Rush Orders:</td>
                        <td className="py-4 px-4">{billingSummary.rushShipmentsCount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.orderProcessingRush)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Shipping Costs:</td>
                        <td className="py-4 px-4">{billingSummary.shipmentsWithCostCount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.orderShippingCosts)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Receiving Orders:</td>
                        <td className="py-4 px-4">{billingSummary.totalReceivingOrdersCount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Receiving Units / Cartons:</td>
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {billingSummary.receivingUnits.toLocaleString()} Units, {billingSummary.receivingCartons.toLocaleString()} Cartons
                        </td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Receiving Pallets:</td>
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {billingSummary.receivingPalletsReceived.toLocaleString()} Rcvd, {billingSummary.receivingPalletsSupplied.toLocaleString()} Supp.
                        </td>
                        <td className="py-4 px-4 text-right text-slate-400">-</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-4 px-4 text-slate-900">Receiving Total Charges:</td>
                        <td className="py-4 px-4 text-slate-400">-</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(billingSummary.receivingTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-6 mt-2">
                  <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center gap-6 shadow-xl">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Calculated Total</span>
                    <span className="text-2xl font-black text-brand-gold">{formatCurrency(billingSummary.grandTotal)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* --- 2. DETAILED VIEW --- */
              <div className="animate-fade-in space-y-10">
                
                {/* Orders Breakdown */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Package size={16} className="text-blue-500" />
                    Order Processing Breakdown 
                    <span className="text-xs font-bold text-slate-500 ml-2">({billingSummary.filteredOrders.length} Orders)</span>
                  </h4>
                  {billingSummary.filteredOrders.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Order #</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Base</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Cartons</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Packages</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Rush</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Intl</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Shipping</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-800 text-right bg-slate-100">Row Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-bold text-slate-700">
                          {billingSummary.filteredOrders.map(o => {
                            const fees = o.processingFees || {};
                            const base = (Number(fees.baseFee)||0) + (Number(fees.lineItemSurcharge)||0) + (Number(fees.weightSurcharge)||0) + (Number(fees.pieceSurcharge)||0);
                            
                            const cartons = (Number(fees.cartonSurcharge)||0);
                            const packages = (Number(fees.packageSurcharge)||0);
                            
                            const rush = Number(fees.rushFee)||0;
                            const intl = Number(fees.internationalFee)||0;
                            const shipping = Number(o.shippingDetails?.shippingCost)||0;
                            const total = base + cartons + packages + rush + intl + shipping;

                            return (
                              <tr key={o._id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono text-blue-600">{o.orderNumber}</td>
                                <td className="py-3 px-4 text-slate-500">{formatDate(o.createdAt)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(base)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(cartons)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(packages)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(rush)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(intl)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(shipping)}</td>
                                <td className="py-3 px-4 text-right text-slate-900 bg-slate-50/50">{formatCurrency(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-800 text-xs">
                          <tr>
                            <td colSpan="2" className="py-3 px-4 text-right uppercase tracking-widest text-[10px] text-slate-500">Totals</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(billingSummary.orderProcessingBase)}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(billingSummary.orderProcessingCartons)}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(billingSummary.orderProcessingPackages)}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(billingSummary.orderProcessingRush)}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(billingSummary.orderProcessingIntl)}</td>
                            <td className="py-3 px-4 text-right">{formatCurrency(billingSummary.orderShippingCosts)}</td>
                            <td className="py-3 px-4 text-right text-brand-gold">{formatCurrency(billingSummary.grandProcessingTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 italic pl-2">No orders processed in this timeframe.</p>
                  )}
                </div>

                {/* Receiving Breakdown */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Box size={16} className="text-emerald-500" />
                    Receiving Breakdown
                    <span className="text-xs font-bold text-slate-500 ml-2">({billingSummary.filteredReceiving.length} RCV Logs)</span>
                  </h4>
                  {billingSummary.filteredReceiving.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">RCV #</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Item Name</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Units</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Cartons</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Pallets (Rcv/Sup)</th>
                            <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-800 text-right bg-slate-100">Charge</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-bold text-slate-700">
                          {billingSummary.filteredReceiving.map(r => {
                            const palletsReceived = Number(r.palletsReceived) || 0;
                            const palletsSupplied = Number(r.suppliedPallets) || 0;
                            const charge = Number(r.totalCharge)||0;
                            const itemName = r.inventoryItem?.itemName || r.inventoryItem?.description || r.description || 'Unknown Item';

                            return (
                              <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono text-emerald-600">{r.receivingId}</td>
                                <td className="py-3 px-4 text-slate-500">{formatDate(r.dateReceived)}</td>
                                <td className="py-3 px-4 truncate max-w-[200px]">{itemName}</td>
                                <td className="py-3 px-4 text-center">{r.quantity || 0}</td>
                                <td className="py-3 px-4 text-center">{r.numberOfCartons || 0}</td>
                                <td className="py-3 px-4 text-center">{palletsReceived} / {palletsSupplied}</td>
                                <td className="py-3 px-4 text-right text-slate-900 bg-slate-50/50">{formatCurrency(charge)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-800 text-xs">
                          <tr>
                            <td colSpan="3" className="py-3 px-4 text-right uppercase tracking-widest text-[10px] text-slate-500">Totals</td>
                            <td className="py-3 px-4 text-center">{billingSummary.receivingUnits.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">{billingSummary.receivingCartons.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">{billingSummary.receivingPalletsReceived.toLocaleString()} / {billingSummary.receivingPalletsSupplied.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right text-brand-gold">{formatCurrency(billingSummary.receivingTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 italic pl-2">No receiving receipts in this timeframe.</p>
                  )}
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-12 rounded-3xl shadow-sm text-center animate-fade-in flex flex-col items-center">
            <Calculator size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-800">No Data Found</h3>
            <p className="text-sm font-bold text-slate-500 mt-2 max-w-sm mx-auto">
              There are no logged orders or receiving receipts for this customer in the selected date range.
            </p>
          </div>
        )
      ) : (
        <div className="bg-transparent border-2 border-dashed border-slate-300 p-12 rounded-3xl text-center flex flex-col items-center opacity-60">
          <FileText size={48} className="text-slate-300 mb-4" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Select a customer above to view the invoice preview</p>
        </div>
      )}

    </div>
  );
}