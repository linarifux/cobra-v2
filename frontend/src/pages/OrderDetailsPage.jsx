import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner'; 
import { 
  ArrowLeft, Truck, MapPin, User, CreditCard, 
  Trash2, Edit2, Check, Plus, MessageSquare, 
  Mail, Phone, X, Weight, Loader2, Save, ExternalLink, 
  CloudUpload, FileText, CheckCircle2, PackageCheck, AlertTriangle, Clock,
  Box, Printer
} from 'lucide-react';

// --- PDF GENERATION LIBRARIES ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import api from '../utils/api'; 

// Redux Actions
import { fetchOrderById, updateOrder, clearCurrentOrder, generateOrderLabel, downloadPurchasedLabel } from '../store/slices/orderSlice'; 
import { fetchInventory, updateInventory } from '../store/slices/inventorySlice'; 

import NotFoundPage from './NotFoundPage';

// --- Utilities ---
const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateTrackingLink = (carrier, trackingNumber) => {
  if (!trackingNumber) return '#';
  const c = (carrier || '').toLowerCase().replace(/\s+/g, '');
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c.includes('dhl')) return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`;
  return `https://www.google.com/search?q=track+package+${trackingNumber}`;
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(id || '');

  const { currentOrder, status: orderLoadStatus, error: orderError } = useSelector((state) => state.orders || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});
  
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [shipping, setShipping] = useState({ carrierType: '', serviceCode: '', trackingNumber: '', shippingCost: 0 });
  const [address, setAddress] = useState({ name: '', email: '', phone: '', street: '', line2: '', city: '', state: '', zip: '', country: '' });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  const [editing, setEditing] = useState({ logistics: false, address: false });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPushingShipment, setIsPushingShipment] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isDownloadingLabel, setIsDownloadingLabel] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- WAREHOUSE STATE ---
  const [warehouses, setWarehouses] = useState([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  // --- FULFILLMENT WORKFLOW STATE ---
  const [packingSlipDownloaded, setPackingSlipDownloaded] = useState(false);
  const [pickingListDownloaded, setPickingListDownloaded] = useState(false);

  const [fulfillmentData, setFulfillmentData] = useState({
    shipFromId: '', 
    isResidential: false
  });
  
  const [packages, setPackages] = useState([
    { id: generateLocalId(), weightInOunces: 16, length: 10, width: 10, height: 10 }
  ]);

  // --- DYNAMIC WORKFLOW STATUSES ---
  const isLabelPurchased = !!shipping.trackingNumber || ['Shipped', 'Delivered'].includes(orderStatus);
  const isShipmentCreated = isLabelPurchased || ['Processing', 'Ready to Ship'].includes(orderStatus);
  const isPackingSlipDone = packingSlipDownloaded || isLabelPurchased;
  const isPickingListDone = pickingListDownloaded || isLabelPurchased;
  const canPurchaseLabel = isShipmentCreated && isPackingSlipDone && isPickingListDone && !isLabelPurchased;

  // --- Calculations ---
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0);
  const shippingCost = Number(shipping.shippingCost) || 0;
  const tax = subtotal * 0.08; 
  const grandTotal = subtotal + shippingCost + tax;
  const totalItemWeightOz = items.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);
  const totalPackageWeightOz = packages.reduce((acc, pkg) => acc + Number(pkg.weightInOunces || 0), 0);
  const isWeightMismatched = Math.abs(totalItemWeightOz - totalPackageWeightOz) > 1;

  const ssData = currentOrder?.shipstationDetails || currentOrder?.shipstationOrder || currentOrder?.shipstation || null;
  const ssOrderId = ssData?.orderId || currentOrder?.shipstationOrderId || null;

  // Fetch Order and Inventory
  useEffect(() => {
    if (isValidMongoId) dispatch(fetchOrderById(id));
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
    return () => dispatch(clearCurrentOrder());
  }, [id, isValidMongoId, inventoryStatus, dispatch]);

  // Fetch ShipStation Warehouses
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingWarehouses(true);
      try {
        const res = await api.get('/shipstation/warehouses');
        let fetchedWarehouses = res?.data?.data?.warehouses || [];
        if (fetchedWarehouses.warehouses) fetchedWarehouses = fetchedWarehouses.warehouses;
        
        setWarehouses(fetchedWarehouses);
        if (fetchedWarehouses.length > 0) {
          setFulfillmentData(p => ({ ...p, shipFromId: fetchedWarehouses[0].warehouse_id }));
        }
      } catch (err) {
        console.error("Failed to fetch warehouses:", err);
      } finally {
        setIsLoadingWarehouses(false);
      }
    };
    fetchLocations();
  }, []);

  const availableInventories = useMemo(() => {
    return inventoryData.map(inv => ({
      id: inv._id,
      name: inv.itemName || 'Unnamed Item',
      sku: inv.sku,
      price: inv.unitCost || inv.price || 0,
      weight: inv.weight || 0
    }));
  }, [inventoryData]);

  useEffect(() => {
    if (currentOrder) {
      setOrderStatus(currentOrder.status || 'Pending');
      
      setShipping({ 
        carrierType: currentOrder.shippingDetails?.carrierType || '', 
        serviceCode: currentOrder.shippingDetails?.serviceCode || '', 
        trackingNumber: currentOrder.shippingDetails?.trackingNumber || '',
        shippingCost: currentOrder.shippingDetails?.shippingCost || 0
      });
      
      setAddress({ 
        name: currentOrder.shippingAddress?.recipientName || '', 
        email: currentOrder.shippingAddress?.email || '',
        phone: currentOrder.shippingAddress?.phone || '',
        street: currentOrder.shippingAddress?.line1 || '', 
        line2: currentOrder.shippingAddress?.line2 || '', 
        city: currentOrder.shippingAddress?.city || '', 
        state: currentOrder.shippingAddress?.state || '', 
        zip: currentOrder.shippingAddress?.zip || '',
        country: currentOrder.shippingAddress?.country || 'US'
      });
      
      setNotes(currentOrder.notes || '');
      
      const mappedItems = currentOrder.items?.map((i) => {
        const matchedStock = availableInventories.find(inv => inv.sku === i.sku);
        return {
          id: generateLocalId(), 
          name: i.name,
          sku: i.sku,
          qty: i.quantity,
          price: i.unitPrice,
          weight: matchedStock?.weight || 0 
        };
      }) || [];
      
      setItems(mappedItems);

      const calculatedOz = mappedItems.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);
      if (packages.length === 1 && packages[0].weightInOunces === 16) {
         setPackages([{ id: generateLocalId(), weightInOunces: calculatedOz > 0 ? calculatedOz : 16, length: 10, width: 10, height: 10 }]);
      }
    }
  }, [currentOrder, availableInventories]); 

  // Dynamically attach weight to added items if missing
  useEffect(() => {
    if (availableInventories.length > 0 && items.length > 0) {
      setItems(prevItems => prevItems.map(item => {
        if (!item.weight || item.weight === 0) {
          const matchedStock = availableInventories.find(inv => inv.sku === item.sku);
          if (matchedStock) return { ...item, weight: matchedStock.weight };
        }
        return item;
      }));
    }
  }, [availableInventories]);


  // --- AUTO-PRINT PDF GENERATION LOGIC ---
  const handlePrintPackingSlip = () => {
    try {
      const doc = new jsPDF();
      
      const selectedWarehouse = warehouses.find(w => w.warehouse_id === fulfillmentData.shipFromId);
      const origin = selectedWarehouse?.origin_address || {};
      
      const divisionName = currentOrder?.division?.name || 'Warehouse Fulfillment'; 
      const customerName = currentOrder?.customer?.customerName || address.name || 'Valued Customer';
      const orderDate = currentOrder?.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString() : 'N/A';

      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); 
      doc.text("PACKING SLIP", 196, 22, { align: 'right' }); 
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(divisionName, 14, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      
      doc.text(`Order Ref: ${currentOrder.orderNumber || 'N/A'}`, 14, 32);
      doc.text(`Order Date: ${orderDate}`, 14, 38);
      if (ssOrderId) doc.text(`ShipStation ID: ${ssOrderId}`, 14, 44);

      doc.text(`Printed On: ${new Date().toLocaleDateString()}`, 196, 32, { align: 'right' });
      if (shipping.carrierType || shipping.serviceCode) {
         doc.text(`Shipping Method: ${shipping.carrierType.toUpperCase()} ${shipping.serviceCode || ''}`, 196, 38, { align: 'right' });
      }
      if (shipping.trackingNumber) {
         doc.text(`Tracking: ${shipping.trackingNumber}`, 196, 44, { align: 'right' });
      }
      
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text("Ship From:", 14, 58);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      if (origin.name || origin.company_name) {
        doc.text(origin.company_name || origin.name, 14, 64);
        doc.text(`${origin.address_line1 || ''} ${origin.address_line2 || ''}`.trim(), 14, 70);
        doc.text(`${origin.city_locality || ''}, ${origin.state_province || ''} ${origin.postal_code || ''}`.trim(), 14, 76);
        doc.text(origin.country_code || 'US', 14, 82);
      } else {
        doc.text("Origin Warehouse (Pending)", 14, 64);
      }

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text("Ship To:", 110, 58);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      doc.text(address.name || 'N/A', 110, 64);
      doc.text(`${address.street || ''} ${address.line2 || ''}`.trim(), 110, 70);
      doc.text(`${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim(), 110, 76);
      doc.text(address.country || 'US', 110, 82);

      let currentY = 96;
      if (notes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(51, 65, 85);
        doc.text(`Customer Notes: ${notes}`, 14, currentY);
        currentY += 8;
      }

      const tableColumn = ["Item Description", "SKU", "Qty", "Weight"];
      const tableRows = items.map(item => [
        item.name,
        item.sku,
        item.qty.toString(),
        `${(Number(item.weight) / 16).toFixed(2)} lbs`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'right' }
        }
      });

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text("Thank you for your business!", 105, doc.lastAutoTable.finalY + 15, { align: 'center' });

      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
      
      setPackingSlipDownloaded(true);
      toast.success("Packing slip opened for printing.");
    } catch(err) {
      console.error(err);
      toast.error("Failed to generate PDF. Make sure jspdf is installed.");
    }
  };

  const handlePrintPickingList = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("WAREHOUSE PICKING LIST", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Order Ref: ${currentOrder.orderNumber}`, 14, 32);
      doc.text(`Date Printed: ${new Date().toLocaleDateString()}`, 14, 38);
      if (ssOrderId) doc.text(`ShipStation ID: ${ssOrderId}`, 120, 32);

      const tableColumn = ["Picked", "SKU", "Item Description", "Qty Required"];
      const tableRows = items.map(item => [
        " [   ] ", 
        item.sku,
        item.name,
        item.qty.toString()
      ]);

      autoTable(doc, {
        startY: 50,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        columnStyles: { 
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 5 },
      });

      doc.setFontSize(10);
      doc.text("Packed By: ___________________________    Date: ______________", 14, doc.lastAutoTable.finalY + 30);

      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');

      setPickingListDownloaded(true);
      toast.success("Picking list opened for printing.");
    } catch(err) {
      console.error(err);
      toast.error("Failed to generate PDF. Make sure jspdf is installed.");
    }
  };

  // --- Handlers ---
  const handleInventoryChange = (e) => {
    const selectedId = e.target.value;
    const matchedStock = availableInventories.find(inv => inv.id === selectedId);
    if (matchedStock) {
      setNewItem({ ...newItem, name: matchedStock.name, sku: matchedStock.sku, price: matchedStock.price, weight: matchedStock.weight });
    } else {
      setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || newItem.price === undefined) return;
    setItems([
      ...items, 
      { 
        ...newItem, 
        id: generateLocalId(), 
        qty: Number(newItem.qty), 
        price: Number(newItem.price), 
        weight: Number(newItem.weight || 0) 
      }
    ]);
    setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  };

  const addPackage = () => {
    setPackages([...packages, { id: generateLocalId(), weightInOunces: 16, length: 10, width: 10, height: 10 }]);
  };

  const updatePackage = (id, field, value) => {
    setPackages(packages.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePackage = (id) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const autoSyncWeights = () => {
    if (packages.length === 0 || totalItemWeightOz === 0) return;
    const weightPerBox = Math.ceil(totalItemWeightOz / packages.length);
    setPackages(packages.map(p => ({ ...p, weightInOunces: weightPerBox })));
    toast.success('Package weights synced with item weights.');
  };

  const restoreInventoryStock = async () => {
    try {
      await Promise.all(items.map(async (item) => {
        const stockItem = inventoryData.find(inv => inv.sku === item.sku);
        if (stockItem) {
          const currentStock = Number(stockItem.unitsOnHand) || Number(stockItem.available) || 0;
          const restoredStock = currentStock + Number(item.qty);
          
          const updatedData = { ...stockItem, unitsOnHand: restoredStock, available: restoredStock };
          await dispatch(updateInventory({ id: stockItem._id, inventoryData: updatedData })).unwrap();
        }
      }));
    } catch (err) {
      console.error("Failed to restore inventory:", err);
    }
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    const isChangingToCancelled = orderStatus === 'Cancelled' && currentOrder?.status !== 'Cancelled';

    const payload = {
      status: orderStatus,
      notes: notes,
      shippingAddress: {
        recipientName: address.name, email: address.email, phone: address.phone,
        line1: address.street, line2: address.line2, city: address.city,
        state: address.state, zip: address.zip, country: address.country
      },
      shippingDetails: {
        ...currentOrder.shippingDetails,
        carrierType: shipping.carrierType, serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber, shippingCost: Number(shipping.shippingCost)
      },
      items: items.map(item => ({
        sku: item.sku, name: item.name, quantity: Number(item.qty),
        unitPrice: Number(item.price), totalPrice: Number(item.qty) * Number(item.price)
      }))
    };

    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();
      
      if (isChangingToCancelled) {
        await restoreInventoryStock();
        toast.success('Order cancelled. Items returned to stock.');
      } else {
        toast.success('Order saved successfully.');
      }
      
      setEditing({ logistics: false, address: false }); 
    } catch (error) {
      toast.error(`Failed to save order: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;
    setIsDeleting(true);

    const safeToDeleteStatus = ['shipped', 'delivered', 'cancelled'];
    const currentStatus = currentOrder?.status?.toLowerCase() || 'pending';
    const needsRestock = !safeToDeleteStatus.includes(currentStatus);

    try {
      if (needsRestock) await restoreInventoryStock();
      await api.delete(`/orders/${currentOrder._id}`);
      
      toast.success(needsRestock ? 'Order deleted and items returned to stock.' : 'Order deleted successfully.');
      navigate('/orders');
    } catch (error) {
      toast.error(`Failed to delete order: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePushShipment = async () => {
    if (!shipping.carrierType || !shipping.serviceCode) {
      return toast.warning("Please configure shipping carrier and service code on the order before pushing.");
    }
    if (!fulfillmentData.shipFromId) {
      return toast.warning("Please select a Ship From warehouse location.");
    }

    setIsPushingShipment(true);

    const selectedWarehouse = warehouses.find(w => w.warehouse_id === fulfillmentData.shipFromId);
    const originAddress = selectedWarehouse?.origin_address || {};

    const payload = {
      orderNumber: currentOrder.orderNumber, 
      externalShipmentId: currentOrder.orderNumber, 
      shipFromId: fulfillmentData.shipFromId,
      packages: packages.map(p => ({
        weightInOunces: Number(p.weightInOunces),
        length: Number(p.length),
        width: Number(p.width),
        height: Number(p.height)
      })),
      shipFrom: {
        name: originAddress.name || "Fulfillment Center",
        company_name: originAddress.company_name || "DSM Logistics",
        phone: originAddress.phone || "",
        email: originAddress.email || "",
        address_line1: originAddress.address_line1 || "",
        address_line2: originAddress.address_line2 || "",
        city_locality: originAddress.city_locality || "",
        state_province: originAddress.state_province || "",
        postal_code: originAddress.postal_code || "",
        country_code: originAddress.country_code || "US",
        address_residential_indicator: fulfillmentData.isResidential ? "yes" : "no"
      },
      isResidential: fulfillmentData.isResidential,
      carrierCode: shipping.carrierType,
      serviceCode: shipping.serviceCode
    };

    try {
      const response = await api.post(`/shipstation/shipments/${currentOrder._id}`, payload);
      
      toast.success('Pushed to ShipStation', {
        description: 'Order is now waiting in your ShipStation dashboard.'
      });

      if (response.data?.data?.order?.status) {
        setOrderStatus(response.data.data.order.status);
      }
      
      dispatch(fetchOrderById(currentOrder._id));

    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Failed to push shipment to ShipStation.";
      toast.error('ShipStation API Error', { description: errMsg });
    } finally {
      setIsPushingShipment(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!shipping.carrierType || !shipping.serviceCode) {
      return toast.warning("Please configure shipping carrier and service code on the order before purchasing.");
    }
    if (!fulfillmentData.shipFromId) {
      return toast.warning("Please select a Ship From warehouse location.");
    }

    setIsGeneratingLabel(true);

    const selectedWarehouse = warehouses.find(w => w.warehouse_id === fulfillmentData.shipFromId);
    const originAddress = selectedWarehouse?.origin_address || {};

    const payload = {
      orderNumber: currentOrder.orderNumber,
      externalShipmentId: currentOrder.orderNumber, 
      packages: packages.map(p => ({
        weightInOunces: Number(p.weightInOunces),
        length: Number(p.length),
        width: Number(p.width),
        height: Number(p.height)
      })),
      shipFrom: {
        name: originAddress.name || "Fulfillment Center",
        phone: originAddress.phone || "",
        company_name: originAddress.company_name || "DSM Logistics",
        address_line1: originAddress.address_line1 || "",
        address_line2: originAddress.address_line2 || "",
        city_locality: originAddress.city_locality || "",
        state_province: originAddress.state_province || "",
        postal_code: originAddress.postal_code || "",
        country_code: originAddress.country_code || "US",
        address_residential_indicator: fulfillmentData.isResidential ? "yes" : "no",
        instructions: originAddress.instructions || ""
      },
      isResidential: fulfillmentData.isResidential,
      carrierCode: shipping.carrierType,
      serviceCode: shipping.serviceCode
    };

    try {
      const response = await dispatch(generateOrderLabel({ orderId: currentOrder._id, fulfillmentData: payload })).unwrap();
      
      setFulfillOpen(false);

      if (response.labelData) {
        const pdfWindow = window.open("");
        pdfWindow.document.write(
          `<iframe width='100%' height='100%' style='border:none;' src='data:application/pdf;base64,${encodeURI(response.labelData)}'></iframe>`
        );
      } else if (response.labelUrl) {
        window.open(response.labelUrl, "_blank");
      }
      
      if (response.trackingNumber) {
        setShipping(prev => ({ ...prev, trackingNumber: response.trackingNumber }));
        setOrderStatus('Shipped');
      }
      
      toast.success('Label Purchased!', { description: `Tracking Number: ${response.trackingNumber}`});
    } catch (error) {
      const errMsg = typeof error === 'string' ? error : (error.message || "An unknown error occurred.");
      toast.error(`Label Generation Failed`, { description: errMsg });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handlePrintPurchasedLabel = async () => {
    setIsDownloadingLabel(true);
    try {
      const response = await dispatch(downloadPurchasedLabel(currentOrder._id)).unwrap();
      const labelUrl = response.labelUrl || response.downloadUrl;
      const labelData = response.labelData;

      if (labelUrl) {
        window.open(labelUrl, "_blank");
        toast.success("Label opened for printing.");
      } else if (labelData) {
        const binary = atob(labelData);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        window.open(url, "_blank");
        toast.success("Label ready for printing.");
      } else {
        toast.error("Label URL not found in response.");
      }
    } catch (error) {
      toast.error('Print Failed', { description: error || "Failed to fetch label." });
    } finally {
      setIsDownloadingLabel(false);
    }
  };

  if (!isValidMongoId) return <NotFoundPage />;
  if (orderLoadStatus === 'failed' || orderError) return <NotFoundPage />;
  if (orderLoadStatus === 'loading' || !currentOrder) {
    return (
      <div className="h-full flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Loading Order Details...</p>
        </div>
      </div>
    );
  }

  const creationDate = currentOrder.createdAt 
    ? new Date(currentOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Unknown Date';

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4 box-border text-slate-900">
      
      <div className="flex items-center justify-between bg-white/30 p-3 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300 gap-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0">
          <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Orders</span>
        </button>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleDeleteOrder}
            disabled={isSaving || isDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[11px] font-black shadow-sm hover:bg-red-100 transition-all duration-200 disabled:opacity-70"
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
          </button>
          
          <div className="w-px h-6 bg-slate-300/60 mx-1"></div>

          <button 
            onClick={handleSaveOrder}
            disabled={isSaving || isDeleting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
          </button>
          <button 
            onClick={() => setFulfillOpen(true)}
            className="flex items-center gap-1.5 bg-brand-gold text-white px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200"
          >
            <CloudUpload size={14} /> Fulfill Order
          </button>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${fulfillOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setFulfillOpen(false)} />
        <div className={`relative w-full max-w-[400px] bg-white/95 backdrop-blur-2xl border-l border-white/50 p-6 shadow-2xl h-full overflow-y-auto transition-transform duration-300 ease-in-out flex flex-col ${fulfillOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-black uppercase tracking-wider text-sm text-slate-800 flex items-center gap-2">
                <PackageCheck size={18} className="text-brand-gold"/> Fulfillment Pipeline
              </h2>
            </div>
            <button onClick={() => setFulfillOpen(false)} className="text-slate-500 hover:text-slate-900 bg-slate-100 p-1.5 rounded-full transition-colors"><X size={16}/></button>
          </div>
          
          <div className="space-y-5 flex-1">
            
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 shadow-sm">
              <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1.5">
                <MapPin size={12}/> Origin Warehouse
              </label>
              {isLoadingWarehouses ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 p-2 border border-slate-100 rounded-lg bg-white/50">
                  <Loader2 size={14} className="animate-spin text-brand-gold"/> Loading locations...
                </div>
              ) : (
                <select
                  value={fulfillmentData.shipFromId}
                  onChange={(e) => setFulfillmentData(p => ({ ...p, shipFromId: e.target.value }))}
                  className="w-full bg-white p-2.5 rounded-lg text-xs font-bold outline-none border border-slate-200 focus:border-brand-gold shadow-sm transition-all"
                >
                  <option value="" disabled>Select a shipping origin...</option>
                  {warehouses?.map(wh => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.name}</option>
                  ))}
                </select>
              )}
              
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none mt-3">
                <input 
                  type="checkbox" 
                  checked={fulfillmentData.isResidential}
                  onChange={(e) => setFulfillmentData(p => ({...p, isResidential: e.target.checked}))}
                  className="accent-brand-gold w-3.5 h-3.5 rounded-sm" 
                /> Residential Destination
              </label>
            </div>

            <hr className="border-slate-200" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1.5">
                  <Truck size={12}/> Package Configuration
                </h3>
                {isWeightMismatched && (
                  <button onClick={autoSyncWeights} className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1 hover:bg-amber-100 transition-colors">
                    <AlertTriangle size={10} /> Sync Weights
                  </button>
                )}
              </div>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
                {packages.map((pkg, index) => (
                  <div key={pkg.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 relative group">
                    {packages.length > 1 && (
                      <button onClick={() => removePackage(pkg.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold border-b border-slate-100 pb-2 mb-2">Box {index + 1}</p>
                    
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Weight (Ounces)</label>
                      <input 
                        type="number"
                        min="1"
                        value={pkg.weightInOunces}
                        onChange={(e) => updatePackage(pkg.id, 'weightInOunces', e.target.value)}
                        className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold outline-none border border-slate-200 focus:border-brand-gold focus:bg-white transition-all" 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Dimensions (L x W x H)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" min="1" value={pkg.length} onChange={(e) => updatePackage(pkg.id, 'length', e.target.value)} className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold outline-none border border-slate-200 focus:border-brand-gold focus:bg-white text-center transition-all" placeholder="L" />
                        <input type="number" min="1" value={pkg.width} onChange={(e) => updatePackage(pkg.id, 'width', e.target.value)} className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold outline-none border border-slate-200 focus:border-brand-gold focus:bg-white text-center transition-all" placeholder="W" />
                        <input type="number" min="1" value={pkg.height} onChange={(e) => updatePackage(pkg.id, 'height', e.target.value)} className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold outline-none border border-slate-200 focus:border-brand-gold focus:bg-white text-center transition-all" placeholder="H" />
                      </div>
                    </div>
                  </div>
                ))}

                <button onClick={addPackage} className="w-full py-2 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border border-slate-200">
                  <Plus size={14} /> Add Another Box
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200 shrink-0 bg-white/95">
            {!isShipmentCreated ? (
              <button 
                onClick={handlePushShipment}
                disabled={isPushingShipment || !fulfillmentData.shipFromId}
                className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black shadow-xl hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPushingShipment ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                {isPushingShipment ? 'Creating Shipment...' : 'Create Shipment to Fulfill'}
              </button>
            ) : (
              <div className="space-y-3">
                 <button 
                   onClick={handlePrintPackingSlip}
                   disabled={isLabelPurchased}
                   className={`w-full flex justify-center items-center gap-2 border py-3.5 rounded-xl text-xs font-black shadow-sm transition-all ${
                     isPackingSlipDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                   } disabled:opacity-50`}
                 >
                   {isPackingSlipDone ? <CheckCircle2 size={16} /> : <Printer size={16} />} 
                   {isPackingSlipDone ? 'Packing Slip Printed' : 'Print Packing Slip'}
                 </button>

                 <button 
                   onClick={handlePrintPickingList}
                   disabled={isLabelPurchased}
                   className={`w-full flex justify-center items-center gap-2 border py-3.5 rounded-xl text-xs font-black shadow-sm transition-all ${
                     isPickingListDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                   } disabled:opacity-50`}
                 >
                   {isPickingListDone ? <CheckCircle2 size={16} /> : <Printer size={16} />} 
                   {isPickingListDone ? 'Picking List Printed' : 'Print Picking List'}
                 </button>
                 
                 {!isLabelPurchased ? (
                   <button 
                     onClick={handleGenerateLabel}
                     disabled={!canPurchaseLabel || isGeneratingLabel}
                     className="w-full flex justify-center items-center gap-2 text-white py-3.5 rounded-xl text-xs font-black shadow-md transition-all bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isGeneratingLabel ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                     Purchase Label
                   </button>
                 ) : (
                   <button 
                     onClick={handlePrintPurchasedLabel}
                     disabled={isDownloadingLabel}
                     className="w-full flex justify-center items-center gap-2 text-white py-3.5 rounded-xl text-xs font-black shadow-md transition-all bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                   >
                     {isDownloadingLabel ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                     Print Purchased Label
                   </button>
                 )}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-2">
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">
          
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 border border-white/60 p-5 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Order Reference</span>
              <span className="text-xl font-black text-slate-900 tracking-tight">{currentOrder.orderNumber}</span>
            </div>
            <span className="px-3 py-1.5 text-[10px] uppercase font-black tracking-widest bg-slate-900 text-white rounded-lg shadow-md flex items-center gap-1.5">
              <Clock size={12} /> {creationDate}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
               <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Order Status</h3>
               <select 
                 value={orderStatus} 
                 onChange={(e) => setOrderStatus(e.target.value)} 
                 className="w-full bg-white text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer outline-none focus:border-brand-gold transition-all shadow-sm"
                >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Ready to Ship">Ready to Ship</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="On Hold">On Hold</option>
                </select>
            </div>

            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
               <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Truck size={14}/> Shipping Method</h3>
                <button onClick={() => setEditing({...editing, logistics: !editing.logistics})} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0 bg-white/50 p-1.5 rounded-md border border-slate-100">
                    {editing.logistics ? <Check size={12} className="text-emerald-600"/> : <Edit2 size={12}/>}
                </button>
               </div>
               
               {editing.logistics ? (
                   <div className="space-y-2 mt-auto">
                       <input className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.carrierType} onChange={(e) => setShipping({...shipping, carrierType: e.target.value})} placeholder="Carrier (e.g. UPS)" />
                       <input className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.serviceCode} onChange={(e) => setShipping({...shipping, serviceCode: e.target.value})} placeholder="Service Code" />
                       <input className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.trackingNumber} onChange={(e) => setShipping({...shipping, trackingNumber: e.target.value})} placeholder="Tracking Number" />
                       <input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.shippingCost} onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} placeholder="Shipping Cost ($)" />
                   </div>
               ) : (
                   <div className="text-sm font-bold text-slate-900 min-w-0 flex flex-col justify-between h-full mt-auto">
                       <div>
                         <p className="truncate text-slate-800 tracking-tight">{shipping.carrierType || 'No Carrier'} {shipping.serviceCode && `- ${shipping.serviceCode}`}</p>
                         <p className="text-slate-400 font-medium text-xs mt-1 border-b border-slate-100 pb-2">Cost: ${Number(shipping.shippingCost).toFixed(2)}</p>
                       </div>
                       
                       {orderStatus === 'Shipped' && shipping.trackingNumber ? (
                          <div className="mt-2">
                             <a 
                               href={generateTrackingLink(shipping.carrierType, shipping.trackingNumber)}
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="inline-flex items-center justify-between w-full text-blue-600 hover:text-blue-800 text-[10px] font-mono bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-100"
                             >
                               <span className="truncate">{shipping.trackingNumber}</span>
                               <ExternalLink size={12} className="shrink-0 ml-2" />
                             </a>
                          </div>
                       ) : (
                          shipping.trackingNumber && orderStatus !== 'Shipped' && (
                             <p className="text-slate-400 text-[10px] break-all font-mono mt-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                               Tracking: {shipping.trackingNumber}
                             </p>
                          )
                       )}
                   </div>
               )}
            </div>

            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
                 <span className="flex items-center gap-1.5"><Weight size={14}/> Est. Weight</span>
                 {isWeightMismatched && <AlertTriangle size={12} className="text-amber-500" title="Item weight and package weight do not match" />}
               </h3>
               <div className="text-xs font-bold text-slate-900 mt-auto">
                   <p className="text-2xl font-black text-slate-800 tracking-tight truncate">{(totalItemWeightOz / 16).toFixed(2)} <span className="text-xs font-bold text-slate-400">lbs</span></p>
                   <p className="text-slate-400 text-[9px] font-medium mt-1 uppercase tracking-wider">Calculated from items</p>
                </div>
            </div>
          </div>

          {/* <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
             <div className="flex justify-between items-center mb-4 border-b border-white/60 pb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <Box size={14}/> ShipStation Fulfillment Details
                </h3>
                {ssOrderId && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                       <CheckCircle2 size={10} /> Synced
                    </span>
                )}
             </div>
             
             {ssData || ssOrderId ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">ShipStation ID</p>
                      <p className="text-xs font-bold text-slate-900">{ssOrderId || 'N/A'}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">SS Status</p>
                      <p className="text-xs font-bold text-slate-900 capitalize">
                        {(ssData?.orderStatus || ssData?.status || 'N/A').replace('_', ' ')}
                      </p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Order Key</p>
                      <p className="text-xs font-bold text-slate-900">{ssData?.orderKey || 'N/A'}</p>
                   </div>
                   <div className="flex justify-end">
                      {ssOrderId && (
                        <a 
                          href={`https://ship.shipstation.com/orders/details/${ssOrderId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold shadow-md transition-colors"
                        >
                          View in SS <ExternalLink size={12} />
                        </a>
                      )}
                   </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                   <p className="text-xs font-bold text-slate-500 mb-3">Order hasn't been pushed to ShipStation yet.</p>
                   <button 
                      onClick={() => setFulfillOpen(true)}
                      className="bg-brand-gold text-white px-4 py-2 rounded-xl text-[11px] font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200"
                   >
                      Configure Fulfillment
                   </button>
                </div>
             )}
          </div> */}

          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4 border-b border-white/60 pb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MapPin size={14}/> Shipping Address</h3>
                <button onClick={() => setEditing({...editing, address: !editing.address})} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0 bg-white/50 p-1.5 rounded-md border border-slate-100">
                    {editing.address ? <Check size={12} className="text-emerald-600"/> : <Edit2 size={12}/>}
                </button>
            </div>
            {editing.address ? (
                <div className="grid grid-cols-2 gap-3 transition-all duration-300">
                    <input className="col-span-2 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} placeholder="Recipient Name" />
                    <input className="col-span-1 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.email} onChange={(e) => setAddress({...address, email: e.target.value})} placeholder="Email Address" type="email" />
                    <input className="col-span-1 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})} placeholder="Phone Number" />
                    <input className="col-span-2 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Address Line 1" />
                    <input className="col-span-2 bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.line2} onChange={(e) => setAddress({...address, line2: e.target.value})} placeholder="Address Line 2 (Optional)" />
                    <input className="bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
                    <div className="flex gap-3">
                        <input className="w-full bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none min-w-0 shadow-sm" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} placeholder="ST" />
                        <input className="w-full bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none min-w-0 shadow-sm" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip" />
                    </div>
                </div>
            ) : (
                <div className="text-sm font-bold text-slate-900 space-y-1 break-words leading-relaxed">
                    <p className="text-base tracking-tight">{address.name || 'No recipient set'}</p>
                    
                    {(address.email || address.phone) && (
                      <div className="py-2 flex gap-4 flex-wrap">
                        {address.email && <p className="text-slate-500 font-medium text-xs flex items-center gap-1.5"><Mail size={12}/> {address.email}</p>}
                        {address.phone && <p className="text-slate-500 font-medium text-xs flex items-center gap-1.5"><Phone size={12}/> {address.phone}</p>}
                      </div>
                    )}

                    <div className="bg-white/50 p-4 rounded-xl border border-slate-100 mt-2 inline-block min-w-[50%]">
                      <p className="text-slate-600 font-medium text-xs">{address.street || 'No street address'}</p>
                      {address.line2 && <p className="text-slate-600 font-medium text-xs">{address.line2}</p>}
                      <p className="text-slate-600 font-medium text-xs">
                        {address.city ? `${address.city}, ` : ''}{address.state} {address.zip}
                      </p>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-2">{address.country || 'US'}</p>
                    </div>
                </div>
            )}
          </div>

          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
              <PackageCheck size={14} /> Manifest Items
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[600px]">
                <thead className="text-left text-[9px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-200/50">
                  <tr>
                    <th className="pb-3 w-[35%] pl-2">Item</th>
                    <th className="pb-3 w-[15%]">SKU</th>
                    <th className="pb-3 w-[10%] text-center">Qty</th>
                    <th className="pb-3 w-[12%] text-right">Unit Wt</th>
                    <th className="pb-3 w-[15%] text-right">Price</th>
                    <th className="pb-3 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 text-xs">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors duration-200 hover:bg-white/50 group">
                      <td className="py-3.5 font-bold text-slate-900 break-words pr-2 pl-2 tracking-tight">{item.name}</td>
                      <td className="py-3.5 font-mono text-[10px] text-slate-500 break-all pr-2">{item.sku}</td>
                      <td className="py-3.5">
                        <div className="bg-white border border-slate-200 rounded-lg text-center font-bold py-1 w-12 mx-auto shadow-sm">
                          {item.qty}
                        </div>
                      </td>
                      <td className="py-3.5 font-medium text-slate-500 text-right">{(Number(item.weight) / 16).toFixed(2)} lbs</td>
                      <td className="py-3.5 font-black text-slate-800 text-right">${Number(item.price).toFixed(2)}</td>
                      <td className="py-3.5 text-right">
                         <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors duration-200 p-1 opacity-0 group-hover:opacity-100">
                           <Trash2 size={14}/>
                         </button>
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="bg-slate-50/50">
                    <td className="py-3 pl-2 pr-2">
                      <select 
                        className="w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-brand-gold text-slate-700 cursor-pointer transition-all shadow-sm"
                        value={availableInventories.find(i => i.name === newItem.name)?.id || ''}
                        onChange={handleInventoryChange}
                        disabled={inventoryStatus === 'loading'}
                      >
                        <option className="text-slate-400" value="">{inventoryStatus === 'loading' ? 'Loading Catalog...' : 'Select Item to Add...'}</option>
                        {availableInventories.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-2">
                      <input className="w-full bg-slate-100 p-2.5 rounded-lg text-xs font-mono text-slate-500 border border-slate-200 outline-none shadow-inner" placeholder="SKU" value={newItem.sku} readOnly disabled />
                    </td>
                    <td className="py-3 pr-2">
                      <input type="number" min="1" className="w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 text-center outline-none focus:border-brand-gold shadow-sm" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} />
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">{newItem.weight ? `${(Number(newItem.weight) / 16).toFixed(2)} lbs` : '-'}</span>
                    </td>
                    <td className="py-3 pr-2">
                      <div className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-black border border-slate-200 text-right text-slate-400 cursor-not-allowed select-none shadow-inner">
                        {newItem.price ? `$${Number(newItem.price).toFixed(2)}` : '$0.00'}
                      </div>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button onClick={handleAddItem} className="bg-slate-900 text-white p-2.5 rounded-lg hover:bg-slate-800 transition-all shadow-md active:scale-95"><Plus size={14}/></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6 w-full min-w-0">
          
          <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white/60">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
               <Truck size={14}/> Activity Log
             </h3>
             
             <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:ml-[11px] md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-200 before:via-slate-200 before:to-transparent">
               
               <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${isShipmentCreated ? 'bg-emerald-500' : 'bg-slate-200 text-slate-400'}`}>
                   {isShipmentCreated && <Check size={10} className="text-white" strokeWidth={4}/>}
                 </div>
                 <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] pl-3">
                   <span className={`text-[11px] font-bold uppercase tracking-wider block ${isShipmentCreated ? 'text-slate-900' : 'text-slate-400'}`}>Shipment Created</span>
                   {isShipmentCreated && <span className="text-[9px] text-slate-400 mt-0.5 block">Pushed to fulfillment</span>}
                 </div>
               </div>
               
               <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${isPackingSlipDone ? 'bg-emerald-500' : 'bg-slate-200 text-slate-400'}`}>
                   {isPackingSlipDone && <Check size={10} className="text-white" strokeWidth={4}/>}
                 </div>
                 <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] pl-3">
                   <span className={`text-[11px] font-bold uppercase tracking-wider block ${isPackingSlipDone ? 'text-slate-900' : 'text-slate-400'}`}>Packing Slip</span>
                 </div>
               </div>

               <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${isPickingListDone ? 'bg-emerald-500' : 'bg-slate-200 text-slate-400'}`}>
                   {isPickingListDone && <Check size={10} className="text-white" strokeWidth={4}/>}
                 </div>
                 <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] pl-3">
                   <span className={`text-[11px] font-bold uppercase tracking-wider block ${isPickingListDone ? 'text-slate-900' : 'text-slate-400'}`}>Picking List</span>
                 </div>
               </div>

               <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${isLabelPurchased ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-200 text-slate-400'}`}>
                   {isLabelPurchased && <Check size={10} className="text-white" strokeWidth={4}/>}
                 </div>
                 <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] pl-3">
                   <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLabelPurchased ? 'text-emerald-600' : 'text-slate-400'}`}>Label Purchased</span>
                   {isLabelPurchased && <span className="text-[9px] text-slate-400 mt-0.5 block">Ready for carrier</span>}
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-900 relative overflow-hidden">
             <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none"></div>
             <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-white/10 relative z-10">
                <div className="min-w-0">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Billed To</h3>
                    <p className="font-black text-xl tracking-tight text-white truncate" title={currentOrder.customer?.customerName}>
                      {currentOrder.customer?.customerName || 'Unknown Customer'}
                    </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-brand-gold to-amber-500 text-slate-950 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-gold/20">
                  <User size={22} strokeWidth={2.5}/>
                </div>
             </div>
             <div className="space-y-3 text-xs font-medium relative z-10">
                {currentOrder.customer?.contactEmail && (
                  <div className="flex items-center gap-3 min-w-0 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <Mail size={14} className="text-brand-gold shrink-0"/> 
                    <span className="break-all select-all text-slate-200 tracking-wide">{currentOrder.customer.contactEmail}</span>
                  </div>
                )}
                {currentOrder.customer?.contactNumber && (
                  <div className="flex items-center gap-3 min-w-0 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <Phone size={14} className="text-brand-gold shrink-0"/> 
                    <span className="truncate text-slate-200 tracking-wide">{currentOrder.customer.contactNumber}</span>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/60 p-6 rounded-3xl transition-all duration-300 shadow-sm backdrop-blur-xl">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2"><MessageSquare size={14}/> Order Notes</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               className="w-full bg-white border border-amber-200/60 rounded-xl p-4 text-xs font-medium text-slate-700 focus:border-amber-400 outline-none resize-none min-h-[120px] shadow-inner"
               placeholder="Add internal notes or customer requests here..."
             />
          </div>

          <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3"><CreditCard size={14}/> Invoice Summary</h3>
             <div className="text-sm font-bold space-y-3">
               <div className="flex justify-between text-slate-500"><span>Subtotal</span> <span className="font-mono text-slate-700">${subtotal.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-500"><span>Shipping</span> <span className="font-mono text-slate-700">${shippingCost.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-500"><span>Estimated Tax</span> <span className="font-mono text-slate-700">${tax.toFixed(2)}</span></div>
               <div className="flex justify-between border-t pt-4 mt-2 border-slate-200 text-slate-900 items-end">
                 <span className="text-xs uppercase tracking-widest font-black text-slate-400">Total</span> 
                 <span className="font-mono text-3xl font-black text-brand-gold tracking-tight">${grandTotal.toFixed(2)}</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}