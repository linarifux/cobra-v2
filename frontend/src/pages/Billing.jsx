import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, FileText, Download, AlertTriangle, Users, Calendar, Calculator, FileSpreadsheet } from 'lucide-react';
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

  // --- STRICT FETCH DATA ON MOUNT ---
  useEffect(() => {
    if (ordersStatus === 'idle') dispatch(fetchOrders());
    if (receivingStatus === 'idle') dispatch(fetchReceivingLogs());
    if (customersStatus === 'idle') dispatch(fetchCustomers());
  }, [dispatch, ordersStatus, receivingStatus, customersStatus]);

  const isGlobalLoading = ordersStatus === 'loading' || receivingStatus === 'loading' || customersStatus === 'loading';

  // --- HELPERS ---
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

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
    let orderProcessingRush = 0;
    let orderProcessingIntl = 0;
    let orderShippingCosts = 0;
    let totalProcessedOrdersCount = filteredOrders.length;
    let totalCartonsUsed = 0;
    
    let intlShipmentsCount = 0;
    let rushShipmentsCount = 0;
    let shipmentsWithCostCount = 0;

    filteredOrders.forEach(o => {
      // Process Processing Fees
      const fees = o.processingFees || {};
      orderProcessingBase += (Number(fees.baseFee) || 0) + (Number(fees.lineItemSurcharge) || 0) + (Number(fees.weightSurcharge) || 0) + (Number(fees.pieceSurcharge) || 0);
      orderProcessingCartons += (Number(fees.cartonSurcharge) || 0) + (Number(fees.packageSurcharge) || 0);
      orderProcessingRush += (Number(fees.rushFee) || 0);
      orderProcessingIntl += (Number(fees.internationalFee) || 0);
      
      // Process Shipping Costs
      const shippingCost = Number(o.shippingDetails?.shippingCost) || 0;
      orderShippingCosts += shippingCost;

      totalCartonsUsed += (Number(o.shippingDetails?.cartoons) || 0) + (Number(o.shippingDetails?.totalBoxes) || 0);

      if (o.isRushOrder) rushShipmentsCount++;
      if (o.isInternational) intlShipmentsCount++;
      if (shippingCost > 0) shipmentsWithCostCount++;
    });

    const grandProcessingTotal = orderProcessingBase + orderProcessingCartons + orderProcessingRush + orderProcessingIntl + orderShippingCosts;

    let receivingTotal = 0;
    let receivingPallets = 0;
    let receivingCartons = 0;
    
    filteredReceiving.forEach(r => {
      receivingTotal += Number(r.totalCharge) || 0;
      receivingPallets += (Number(r.palletsReceived) || 0) + (Number(r.suppliedPallets) || 0);
      receivingCartons += (Number(r.numberOfCartons) || 0);
    });

    const grandTotal = grandProcessingTotal + receivingTotal;

    return {
      hasData: filteredOrders.length > 0 || filteredReceiving.length > 0,
      orderProcessingBase,
      orderProcessingCartons,
      orderProcessingRush,
      orderProcessingIntl,
      orderShippingCosts,
      totalProcessedOrdersCount,
      totalCartonsUsed,
      intlShipmentsCount,
      rushShipmentsCount,
      shipmentsWithCostCount,
      receivingTotal,
      receivingPallets,
      receivingCartons,
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
      
      // Table Data mapped strictly to Sample_Billing_Recap.pdf
      const tableData = [
        ["Order Processing:", billingSummary.totalProcessedOrdersCount.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingBase)],
        ["Cartons:", billingSummary.totalCartonsUsed.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingCartons)],
        ["International Shipments - Other:", billingSummary.intlShipmentsCount.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingIntl)],
        ["Rush Orders:", billingSummary.rushShipmentsCount.toLocaleString(), "-", formatCurrency(billingSummary.orderProcessingRush)],
        ["Shipping Costs:", billingSummary.shipmentsWithCostCount.toLocaleString(), "-", formatCurrency(billingSummary.orderShippingCosts)],
        ["Receiving:", `${billingSummary.receivingCartons.toLocaleString()} Cartons, ${billingSummary.receivingPallets.toLocaleString()} Pallets`, "-", formatCurrency(billingSummary.receivingTotal)],
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
          {/* Customer Selection */}
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

          {/* Timeframe Selection: Start Date */}
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

          {/* Timeframe Selection: End Date */}
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

      {/* Live Billing Summary (On-Screen Rendering) */}
      {exportCustomer ? (
        billingSummary?.hasData ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-8 rounded-3xl shadow-sm animate-slide-in-up">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
              <FileSpreadsheet className="text-brand-gold" size={24} />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Invoice Preview Recap</h3>
            </div>
            
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
                    <td className="py-4 px-4 text-slate-900">Receiving:</td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {billingSummary.receivingCartons.toLocaleString()} Cartons, {billingSummary.receivingPallets.toLocaleString()} Pallets
                    </td>
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