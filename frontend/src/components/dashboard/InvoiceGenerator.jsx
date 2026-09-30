import React, { useState, useMemo } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export default function InvoiceGenerator({ orders, receivingLogs, customers }) {
  const [exportCustomer, setExportCustomer] = useState('');
  const [exportTimeframe, setExportTimeframe] = useState('This Month');
  const [isExporting, setIsExporting] = useState(false);

  const reportCustomersList = useMemo(() => {
    const map = new Map();
    orders.forEach(o => o.customer && map.set(o.customer._id, o.customer.customerName));
    receivingLogs.forEach(r => r.customer && map.set(r.customer._id, r.customer.customerName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, receivingLogs]);

  const isDateInRange = (dateStr, timeframe) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (timeframe === 'This Month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    if (timeframe === 'Last Month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }
    if (timeframe === 'This Year') return d.getFullYear() === currentYear;
    return true; 
  };

  const handleGenerateInvoice = async () => {
    if (!exportCustomer) return alert("Please select a customer to generate an invoice.");
    setIsExporting(true);

    try {
      const selectedCustData = customers.find(c => String(c._id) === String(exportCustomer));
      const customerName = selectedCustData ? selectedCustData.customerName : 'Client';

      const filteredOrders = orders.filter(o => String(o.customer?._id || o.customer) === String(exportCustomer) && isDateInRange(o.createdAt, exportTimeframe));
      const filteredReceiving = receivingLogs.filter(r => String(r.customer?._id || r.customer) === String(exportCustomer) && isDateInRange(r.dateReceived, exportTimeframe));

      // Aggregate Processing Fees
      let orderProcessingBase = 0;
      let orderProcessingCartons = 0;
      let orderProcessingRush = 0;
      let orderProcessingIntl = 0;
      let totalProcessingUnits = 0;
      
      let intlShipmentsCount = 0;
      let rushShipmentsCount = 0;

      filteredOrders.forEach(o => {
        const fees = o.processingFees || {};
        orderProcessingBase += (Number(fees.baseFee) || 0) + (Number(fees.lineItemSurcharge) || 0) + (Number(fees.weightSurcharge) || 0) + (Number(fees.pieceSurcharge) || 0);
        orderProcessingCartons += (Number(fees.cartonSurcharge) || 0) + (Number(fees.packageSurcharge) || 0);
        orderProcessingRush += (Number(fees.rushFee) || 0);
        orderProcessingIntl += (Number(fees.internationalFee) || 0);
        
        totalProcessingUnits += o.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
        if (o.isRushOrder) rushShipmentsCount++;
        if (o.isInternational) intlShipmentsCount++;
      });
      const grandProcessingTotal = orderProcessingBase + orderProcessingCartons + orderProcessingRush + orderProcessingIntl;

      // Aggregate Receiving Fees
      let receivingTotal = 0;
      let receivingPallets = 0;
      let receivingCartons = 0;
      
      filteredReceiving.forEach(r => {
        receivingTotal += Number(r.charge) || 0;
        receivingPallets += (Number(r.palletsReceived) || 0) + (Number(r.suppliedPallets) || 0);
        receivingCartons += (Number(r.numberOfCartons) || 0);
      });

      const grandTotal = grandProcessingTotal + receivingTotal;

      // Build PDF Layout
      const doc = new jsPDF();
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(customerName.toUpperCase(), 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Monthly Invoice (${exportTimeframe})`, 14, 26);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Activity Period: ${exportTimeframe} - ${customerName} Monthly Inventory`, 14, 35);
      
      // Table Data
      const tableData = [
        ["Order Processing:", totalProcessingUnits.toLocaleString(), "-", formatCurrency(orderProcessingBase)],
        ["Cartons / Packages:", "-", "-", formatCurrency(orderProcessingCartons)],
        ["International Shipments:", intlShipmentsCount.toLocaleString(), "-", formatCurrency(orderProcessingIntl)],
        ["Rush Orders:", rushShipmentsCount.toLocaleString(), "-", formatCurrency(orderProcessingRush)],
        ["Receiving (Inbound):", `${receivingCartons.toLocaleString()} Cartons, ${receivingPallets.toLocaleString()} Pallets`, "-", formatCurrency(receivingTotal)]
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
      doc.text(formatCurrency(grandTotal), 194, finalY, { align: 'right' });

      doc.save(`Invoice_${customerName.replace(/\s+/g, '_')}_${exportTimeframe.replace(/\s+/g, '')}.pdf`);

    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF invoice.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl mt-6 animate-slide-in-right" style={{ animationDelay: '350ms' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
         <div>
           <h4 className="text-sm font-black text-white flex items-center gap-2">
             <FileText className="w-4 h-4 text-brand-gold" />
             Invoice & Billing Generator
           </h4>
           <p className="text-xs text-slate-400 mt-1">Export structured PDF invoices for client billing.</p>
         </div>
         
         <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={exportCustomer} 
              onChange={(e) => setExportCustomer(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-gold"
            >
              <option value="">Select Customer...</option>
              {reportCustomersList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select 
              value={exportTimeframe} 
              onChange={(e) => setExportTimeframe(e.target.value)}
              className="w-full sm:w-36 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-gold"
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
            </select>
         </div>
      </div>
      
      <button 
        onClick={handleGenerateInvoice}
        disabled={isExporting || !exportCustomer}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-slate-900 px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isExporting ? 'Generating Invoice...' : 'Download PDF Invoice'}
      </button>
    </div>
  );
}
