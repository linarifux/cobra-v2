import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner'; 
import { Loader2 } from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import api from '../utils/api'; 
import { 
  fetchOrderById, updateOrder, clearCurrentOrder, 
  generateOrderLabel, downloadPurchasedLabel,
  voidOrderLabel, cancelOrderShipment, createOrderShipment
} from '../store/slices/orderSlice'; 
import { fetchInventory, updateInventory } from '../store/slices/inventorySlice'; 
import { fetchUsers } from '../store/slices/userSlice'; 
import { fetchCarriers, fetchCarrierPackages } from '../store/slices/carrierSlice';
import { fetchChargeTypes } from '../store/slices/chargeTypeSlice';

import NotFoundPage from '../pages/NotFoundPage';
import CreateShipmentModal from '../components/order-details/CreateShipmentModal';

// Component Imports
import OrderHeaderActions from '../components/order-details/OrderHeaderActions';
import OrderInfoPanel from '../components/order-details/OrderInfoPanel';
import OrderStatusPanel from '../components/order-details/OrderStatusPanel';
import ShippingPanel from '../components/order-details/ShippingPanel';
import AddressPanel from '../components/order-details/AddressPanel';
import NotesAndFeesPanel from '../components/order-details/NotesAndFeesPanel';
import ManifestPanel from '../components/order-details/ManifestPanel';
import InvoicePanel from '../components/order-details/InvoicePanel';
import LabelDrawer from '../components/order-details/LabelDrawer';

const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const downloadBase64PDF = (base64Data, filename) => {
  try {
    let cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    while (cleanBase64.length % 4 > 0) cleanBase64 += '=';

    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Failed to decode Base64 PDF:", error);
    throw new Error("Invalid PDF data format.");
  }
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(id || '');

  // Access core Redux state
  const { currentOrder, status: orderLoadStatus, error: orderError } = useSelector((state) => state.orders || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});
  const { items: usersData = [], status: usersStatus } = useSelector((state) => state.users || {}); 
  const { items: carriersData = [], packageTypes = [] } = useSelector((state) => state.carriers || {});

  // Access dynamic charge types from DB
  const { items: chargeTypes = [], status: chargeTypeStatus } = useSelector((state) => state.chargeTypes || {});

  const [orderStatus, setOrderStatus] = useState('New');
  const [selectedUserId, setSelectedUserId] = useState(''); 
  const [shipping, setShipping] = useState({ carrierId: '', carrierType: '', serviceCode: '', trackingNumber: '', shippingCost: 0, shipStationId: '' });
  const [address, setAddress] = useState({ name: '', email: '', phone: '', street: '', line2: '', city: '', state: '', zip: '', country: '' });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cartoonsCount, setCartoonsCount] = useState(0);
  const [palletsCount, setPalletsCount] = useState(0); 
  const [isRushOrder, setIsRushOrder] = useState(false);
  // REMOVED: isInternational state

  const [createShipmentModalOpen, setCreateShipmentModalOpen] = useState(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isDownloadingLabel, setIsDownloadingLabel] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [isVoidingLabel, setIsVoidingLabel] = useState(false);
  const [isCancellingShipment, setIsCancellingShipment] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  const [fulfillmentData, setFulfillmentData] = useState({ shipFromId: '', isResidential: false });

  const [packages, setPackages] = useState([
    { id: generateLocalId(), packageCode: 'package', weightInOunces: 16, length: 10, width: 10, height: 10 }
  ]);

  const ssData = currentOrder?.shipstationDetails || currentOrder?.shipstationOrder || currentOrder?.shipstation || null;
  const ssOrderId = ssData?.orderId || currentOrder?.shipstationOrderId || null;
  const ssLabelId = ssData?.labelId || null;

  const isLabelPurchased = !!ssLabelId || !!shipping.trackingNumber;
  const isShipmentCreated = !!ssOrderId; 

  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0);
  const shippingCost = Number(shipping.shippingCost) || 0;
  const tax = subtotal * 0.08; 
  const grandTotal = subtotal + shippingCost + tax;

  const totalItemWeightOz = currentOrder?.shippingDetails?.totalWeightOunces || items.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);
  const totalPackageWeightOz = packages.reduce((acc, pkg) => acc + Number(pkg.weightInOunces || 0), 0);
  const isWeightMismatched = Math.abs(totalItemWeightOz - totalPackageWeightOz) > 1;

  const orderUserId = currentOrder?.user?._id || currentOrder?.user;
  const orderCreator = useMemo(() => {
    if (!orderUserId || usersData.length === 0) return null;
    return usersData.find(u => u._id === orderUserId);
  }, [orderUserId, usersData]);

  const orderCreatorName = orderCreator ? (orderCreator.name || orderCreator.firstName || orderCreator.email) : null;

  // --- Ensure Dynamic Charge Types are Loaded ---
  useEffect(() => {
    if (chargeTypeStatus === 'idle') dispatch(fetchChargeTypes());
  }, [chargeTypeStatus, dispatch]);

  // --- LIVE PROCESSING FEES CALCULATION PREVIEW ---
  const processingFeesPreview = useMemo(() => {
    const getFee = (name, fallback = 0) => {
      const ct = chargeTypes.find(c => c.name === name && c.isActive !== false);
      return ct && ct.defaultCharge !== undefined ? Number(ct.defaultCharge) : fallback;
    };

    const weightLbs = totalPackageWeightOz / 16;
    const lineItemsCount = items.length;
    const piecesCount = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const packageCount = packages.length;
    const cartonCount = Number(cartoonsCount) || 0;
    const palletCount = Number(palletsCount) || 0;

    const baseFee = weightLbs <= 10 ? 5.07 : 5.68;
    const weightSurcharge = weightLbs > 20 ? (weightLbs - 20) * getFee('Weight Surcharge', 0.15) : 0;
    const lineItemSurcharge = lineItemsCount > 3 ? (lineItemsCount - 3) * getFee('Line Item Surcharge', 0.81) : 0;
    const packageSurcharge = packageCount > 1 ? (packageCount - 1) * getFee('Package Surcharge', 0.71) : 0;
    const pieceSurcharge = piecesCount * getFee('Piece Surcharge', 0.03);
    const cartonSurcharge = cartonCount * getFee('Carton Surcharge', 2.05);
    const palletFee = palletCount * getFee('Pallet Fee', 8.40);

    const rushFee = isRushOrder ? getFee('Rush Fee', 20) : 0;
    
    // Determine international locally for preview based on current address country
    const isLocalIntl = address.country && !['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(address.country.toUpperCase().trim());
    const internationalFee = isLocalIntl ? getFee('International Fee', 0) : 0;

    const totalProcessingFee = baseFee + weightSurcharge + lineItemSurcharge + 
                               packageSurcharge + pieceSurcharge + cartonSurcharge + 
                               palletFee + rushFee + internationalFee;

    return {
      baseFee,
      weightSurcharge,
      lineItemSurcharge,
      packageSurcharge,
      pieceSurcharge,
      cartonSurcharge,
      palletFee,
      rushFee,
      internationalFee,
      totalProcessingFee
    };
  }, [totalPackageWeightOz, items, packages.length, cartoonsCount, palletsCount, isRushOrder, address.country, chargeTypes]);

  useEffect(() => {
    if (isValidMongoId) dispatch(fetchOrderById(id));
    return () => dispatch(clearCurrentOrder());
  }, [id, isValidMongoId, dispatch]);

  useEffect(() => {
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
  }, [inventoryStatus, dispatch]);

  useEffect(() => {
    if (usersStatus === 'idle') dispatch(fetchUsers()); 
  }, [usersStatus, dispatch]);

  useEffect(() => {
    if (currentOrder?.division) {
       const divId = currentOrder.division._id || currentOrder.division;
       dispatch(fetchCarriers(divId));
    }
  }, [currentOrder?.division, dispatch]);

  useEffect(() => {
    if (fulfillOpen && shipping?.carrierId) {
      const activeCarrier = carriersData.find(c => String(c._id) === String(shipping.carrierId));
      if (activeCarrier && activeCarrier.shipStationId) {
        dispatch(fetchCarrierPackages(activeCarrier.shipStationId));
      }
    }
  }, [fulfillOpen, shipping?.carrierId, carriersData, dispatch]);

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
        console.warn("ShipStation API Error:", err);
        toast.error("Could not load origin warehouses from ShipStation.");
      } finally {
        setIsLoadingWarehouses(false);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (currentOrder) {
      setOrderStatus(currentOrder.status || 'New');
      setSelectedUserId(currentOrder.user?._id || currentOrder.user || ''); 
      setCartoonsCount(currentOrder.shippingDetails?.cartoons || 0);
      setPalletsCount(currentOrder.shippingDetails?.pallets || 0); 
      setIsRushOrder(currentOrder.isRushOrder || false);

      setShipping({ 
        carrierId: currentOrder.shippingDetails?.carrierId?._id || currentOrder.shippingDetails?.carrierId || '',
        carrierType: currentOrder.shippingDetails?.carrierType || '', 
        serviceCode: currentOrder.shippingDetails?.serviceCode || '', 
        trackingNumber: currentOrder.shippingDetails?.trackingNumber || '',
        shippingCost: currentOrder.shippingDetails?.shippingCost || 0,
        shipStationId: currentOrder.shippingDetails?.shipStationId || ''
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
        const matchedStock = inventoryData.find(inv => inv.sku === i.sku);
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

      if (currentOrder.shippingDetails?.packages && currentOrder.shippingDetails.packages.length > 0) {
        setPackages(currentOrder.shippingDetails.packages.map(p => ({
          id: generateLocalId(),
          packageCode: p.packageCode || 'package',
          weightInOunces: p.weightInOunces || 16,
          length: p.length || 10,
          width: p.width || 10,
          height: p.height || 10
        })));
      } else {
        const calculatedOz = currentOrder.shippingDetails?.totalWeightOunces || mappedItems.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);
        if (packages.length === 1 && packages[0].weightInOunces === 16) {
           setPackages([{ id: generateLocalId(), packageCode: 'package', weightInOunces: calculatedOz > 0 ? calculatedOz : 16, length: 10, width: 10, height: 10 }]);
        }
      }
    }
  }, [currentOrder, inventoryData]); 

  const handlePrintDocsAndPick = async () => {
    setIsGeneratingDocs(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text("PICKING LIST", 14, 20);

      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(14, 22, 196, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Order Ref: ${currentOrder.orderNumber}`, 14, 28);
      doc.text(`Date Printed: ${new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`, 14, 33);

      const pickingRows = items.map(item => {
        const invItem = inventoryData.find(inv => inv.sku === item.sku);
        let locationStr = '';
        if (invItem?.locations && Array.isArray(invItem.locations) && invItem.locations.length > 0) {
           locationStr = invItem.locations.map(loc => loc.designation).filter(Boolean).join(', ');
        }
        if (!locationStr && invItem?.locationString) {
           locationStr = invItem.locationString;
        }

        return [
          " [    ] ", 
          locationStr || '',
          item.sku,
          item.name,
          item.qty.toString()
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [["Picked", "Location", "SKU", "Item Description", "Qty Required"]],
        body: pickingRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', lineWidth: 0.1 },
        columnStyles: { 
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { fontSize: 9, cellPadding: 4, textColor: 20, font: 'helvetica' },
      });

      doc.addPage();

      const customerName = currentOrder.customer?.customerName || 'Customer Order';
      const divisionName = currentOrder.division?.divisionName || 'Custom Division'
      const orderNo = currentOrder.orderNumber || 'N/A';
      const orderDate = currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A';
      const shipVia = `${shipping.carrierType || ''} ${shipping.serviceCode || ''}`.trim() || 'UPS - Ground';
      const phone = address.phone || currentOrder.customer?.contactNumber || '';

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`${customerName.toUpperCase()} - ${divisionName}`, 14, 20);

      const rightColKeyX = 160;
      const rightColValX = 162;
      let rightY = 20;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Order ID:`, rightColKeyX, rightY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(orderNo, rightColValX, rightY);
      rightY += 5;

      doc.setFont('helvetica', 'bold');
      doc.text(`Order Type:`, rightColKeyX, rightY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text('WEBORD', rightColValX, rightY);
      rightY += 5;

      doc.setFont('helvetica', 'bold');
      doc.text(`Ordered:`, rightColKeyX, rightY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(orderDate, rightColValX, rightY);
      rightY += 5;

      doc.setFont('helvetica', 'bold');
      doc.text(`Ship Via:`, rightColKeyX, rightY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(shipVia, rightColValX, rightY);

      const addressBlockY = 55;
      doc.setFontSize(10);

      doc.setFont('helvetica', 'bold');
      doc.text("SHIP FROM:", 14, addressBlockY);
      doc.setFont('helvetica', 'normal');
      doc.text("MI-KRO Industries", 40, addressBlockY + 5);
      doc.text("1509 RT 38, Unit 9", 40, addressBlockY + 10);
      doc.text("Hainesport, NJ 08036 US", 40, addressBlockY + 15);
      doc.text("Phone: 609-694-0521", 40, addressBlockY + 20);
      doc.text("Email: mike@mi-krologistics.com", 40, addressBlockY + 25);

      doc.setFont('helvetica', 'bold');
      doc.text("SHIP TO:", 110, addressBlockY);
      doc.setFont('helvetica', 'normal');
      doc.text(address.name || 'N/A', 130, addressBlockY);
      doc.text(`${address.street || ''} ${address.line2 || ''}`.trim(), 130, addressBlockY + 5);
      doc.text(`${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim(), 130, addressBlockY + 10);
      doc.text(address.country || 'US', 130, addressBlockY + 15);

      if (phone) {
         doc.setFont('helvetica', 'bold');
         doc.text("Phone:", 110, addressBlockY + 20);
         doc.setFont('helvetica', 'normal');
         doc.text(phone, 130, addressBlockY + 20);
      }

      let commentsY = 90;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("Comments:", 14, commentsY);

      if (notes) {
          doc.setFont('helvetica', 'normal');
          const splitNotes = doc.splitTextToSize(notes, 150);
          doc.text(splitNotes, 40, commentsY);
          commentsY += (splitNotes.length * 5);
      } else {
          commentsY += 5;
      }

      const tableRows = items.map(item => {
          const qtyStr = (item.qty || 0).toString();
          return [ item.sku, item.name, qtyStr, qtyStr, qtyStr ];
      });

      autoTable(doc, {
          startY: commentsY + 5,
          head: [["Item Code / Lot(s) #", "Description", "Qty.\nPicked", "Qty.\nOrdered", "Qty.\nShipped"]],
          body: tableRows,
          theme: 'plain',
          headStyles: { fontStyle: 'bold', textColor: 0, halign: 'left', borderBottomColor: 0, borderBottomWidth: 0.5 },
          styles: { fontSize: 9, cellPadding: 3, textColor: 20, font: 'helvetica' },
          columnStyles: {
              0: { cellWidth: 45 }, 1: { cellWidth: 'auto' },
              2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 20, halign: 'center' }
          },
          willDrawCell: function(data) {
              if (data.row.section === 'body') {
                  doc.setDrawColor(200, 200, 200);
                  doc.setLineWidth(0.1);
                  doc.line(
                      data.cell.x, 
                      data.cell.y + data.cell.height, 
                      data.cell.x + data.cell.width, 
                      data.cell.y + data.cell.height
                  );
              }
          }
      });

      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(55, finalY, 100, 8); 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("*** THANK YOU FOR YOUR ORDER! ***", 105, finalY + 5.5, { align: 'center' });

      doc.setLineWidth(1.5);
      doc.line(14, 280, 196, 280);

      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');

      if (!shipping.trackingNumber) {
        await dispatch(updateOrder({ id: currentOrder._id, updateData: { status: 'Picked' } })).unwrap();
        setOrderStatus('Picked');
        toast.success("Documents generated and order marked as Picked.");
      } else {
        toast.success("Documents generated successfully.");
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to generate documents or update order.");
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const addPackage = () => setPackages(prev => [...prev, { id: generateLocalId(), packageCode: 'package', weightInOunces: 16, length: 10, width: 10, height: 10 }]);
  const updatePackage = (id, field, value) => setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removePackage = (id) => setPackages(prev => prev.filter(p => p.id !== id));

  const handleWeightChange = (id, currentTotalOz, type, value) => {
    const numVal = value === '' ? '' : Number(value);
    const currentLbs = Math.floor((Number(currentTotalOz) || 0) / 16);
    const currentOz = (Number(currentTotalOz) || 0) % 16;

    let newTotal = 0;
    if (type === 'lbs') {
      newTotal = (numVal === '' ? 0 : numVal * 16) + currentOz;
    } else {
      newTotal = (currentLbs * 16) + (numVal === '' ? 0 : numVal);
    }

    updatePackage(id, 'weightInOunces', newTotal);
  };

  const restoreInventoryStock = async () => {
    try {
      await Promise.all(items.map(async (item) => {
        const stockItem = inventoryData.find(inv => inv.sku === item.sku);
        if (stockItem) {
          const currentStock = Number(stockItem.unitsOnHand) || Number(stockItem.available) || 0;
          const restoredStock = currentStock + Number(item.quantity);
          const updatedData = { ...stockItem, unitsOnHand: restoredStock, available: restoredStock };
          await dispatch(updateInventory({ id: stockItem._id, inventoryData: updatedData })).unwrap();
        }
      }));
    } catch (err) { console.error("Failed to restore inventory:", err); }
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    const isChangingToCancelled = orderStatus === 'Cancelled' && currentOrder?.status !== 'Cancelled';

    const isDomestic = ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes((address.country || '').toUpperCase().trim());
    if (address.state.trim().length !== 2 && isDomestic) {
      setIsSaving(false);
      return toast.error("State must be exactly a 2-character code (e.g., NY, CA). Please use the dropdown selector.");
    }

    const payload = {
      status: orderStatus,
      isRushOrder: isRushOrder,
      ...(selectedUserId ? { user: selectedUserId } : { user: null }),
      notes: notes,
      shippingAddress: {
        recipientName: address.name, email: address.email, phone: address.phone,
        line1: address.street, line2: address.line2, city: address.city,
        state: address.state.toUpperCase().trim(),
        zip: address.zip, country: address.country
      },
      shippingDetails: {
        ...currentOrder.shippingDetails,
        carrierType: shipping.carrierType, serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber, shippingCost: Number(shipping.shippingCost),
        cartoons: Number(cartoonsCount) || 0,
        pallets: Number(palletsCount) || 0, 
        totalBoxes: packages.length,
        totalWeightOunces: totalPackageWeightOz,
        packages: packages.map(p => ({
          packageCode: p.packageCode || 'package',
          weightInOunces: Number(p.weightInOunces) || 16,
          length: Number(p.length) || 10,
          width: Number(p.width) || 10,
          height: Number(p.height) || 10
        }))
      },
      processingFees: processingFeesPreview, // Sync correct UI fees back to the database
      items: items.map(item => ({
        sku: item.sku, name: item.name, quantity: Number(item.qty),
        unitPrice: Number(item.price), totalPrice: Number(item.qty) * Number(item.price)
      }))
    };

    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();

      if (isChangingToCancelled) {
        await restoreInventoryStock();
        toast.success('Order cancelled. Items returned to stock and shipment reversed.');
      } else {
        toast.success('Order saved successfully.');
      }
    } catch (error) {
      toast.error(`Failed to save order: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this entire order? This will restock items and void any labels.")) return;
    setIsCancellingOrder(true);

    const payload = {
      status: 'Cancelled',
      isRushOrder: isRushOrder,
      ...(selectedUserId ? { user: selectedUserId } : { user: null }),
      notes: notes,
      shippingAddress: {
        recipientName: address.name, email: address.email, phone: address.phone,
        line1: address.street, line2: address.line2, city: address.city,
        state: address.state.toUpperCase().trim(),
        zip: address.zip, country: address.country
      },
      shippingDetails: {
        ...currentOrder.shippingDetails,
        carrierType: shipping.carrierType, serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber, shippingCost: Number(shipping.shippingCost),
        cartoons: Number(cartoonsCount) || 0,
        pallets: Number(palletsCount) || 0,
        totalBoxes: packages.length,
        totalWeightOunces: totalPackageWeightOz,
        packages: packages.map(p => ({
          packageCode: p.packageCode || 'package',
          weightInOunces: Number(p.weightInOunces) || 16,
          length: Number(p.length) || 10,
          width: Number(p.width) || 10,
          height: Number(p.height) || 10
        }))
      },
      processingFees: processingFeesPreview, // Sync correct UI fees back to the database
      items: items.map(item => ({
        sku: item.sku, name: item.name, quantity: Number(item.qty),
        unitPrice: Number(item.price), totalPrice: Number(item.qty) * Number(item.price)
      }))
    };

    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();
      await restoreInventoryStock();
      setOrderStatus('Cancelled');
      toast.success('Order cancelled. Items returned to stock.');
    } catch (error) {
      toast.error(`Failed to cancel order: ${error}`);
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;
    setIsDeleting(true);

    const safeToDeleteStatus = ['shipped', 'delivered', 'cancelled', 'billed'];
    const currentStatus = currentOrder?.status?.toLowerCase() || 'new';
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

  const handleCreateShipmentSubmit = async (modalCartoonsCount) => {
    if (orderStatus !== 'Picked') return toast.warning("Order status must be 'Picked' before you can create a shipment.");
    if (!shipping.carrierType || !shipping.serviceCode) return toast.warning("Please configure shipping carrier and service code on the order.");
    if (!fulfillmentData.shipFromId) return toast.warning("Please select a Ship From warehouse location.");

    setIsCreatingShipment(true);

    const payload = {
      packages: packages.map(p => ({
        packageCode: p.packageCode || 'package',
        weightInOunces: Number(p.weightInOunces),
        length: Number(p.length),
        width: Number(p.width),
        height: Number(p.height)
      })),
      isResidential: fulfillmentData.isResidential,
      carrierCode: shipping.carrierType,
      serviceCode: shipping.serviceCode,
      cartoons: Number(modalCartoonsCount) || Number(cartoonsCount) || 0,
      pallets: Number(palletsCount) || 0,
      totalBoxes: packages.length,
      totalWeightOunces: totalPackageWeightOz,
      processingFees: processingFeesPreview // Attach computed fees directly to shipment API call
    };



    try {
      await dispatch(createOrderShipment({ orderId: currentOrder._id, fulfillmentData: payload })).unwrap();
      toast.success("Shipment successfully created in ShipStation.");
      setCreateShipmentModalOpen(false);
      dispatch(fetchOrderById(currentOrder._id));
    } catch (error) {
      toast.error("Failed to create shipment", { description: typeof error === 'string' ? error : error.message });
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!fulfillmentData.shipFromId) return toast.warning("Please select a Ship From warehouse location.");

    setIsGeneratingLabel(true);
    const payload = {
      isResidential: fulfillmentData.isResidential,
      shipFromId: fulfillmentData.shipFromId,
      packages: packages.map(p => ({
        packageCode: p.packageCode || 'package',
        weightInOunces: Number(p.weightInOunces),
        length: Number(p.length),
        width: Number(p.width),
        height: Number(p.height)
      })),
      carrierCode: shipping.carrierType,
      serviceCode: shipping.serviceCode,
      cartoons: Number(cartoonsCount) || 0,
      pallets: Number(palletsCount) || 0,
      totalBoxes: packages.length,
      weightInOunces: totalPackageWeightOz,
      processingFees: processingFeesPreview // Attach computed fees directly to label generation API call
    };

    try {
      const rawRes = await dispatch(generateOrderLabel({ orderId: currentOrder._id, fulfillmentData: payload })).unwrap();
      const response = rawRes.data || rawRes;
      setFulfillOpen(false);

      let labelDownloaded = false;

      if (response.labelData) {
        try {
          downloadBase64PDF(response.labelData, `Label_${currentOrder.orderNumber || 'Order'}.pdf`);
          labelDownloaded = true;
        } catch (e) {
          console.error("Failed standard decode, falling back.");
        }
      } 

      if (!labelDownloaded && response.labelUrl) {
        window.open(response.labelUrl, "_blank");
        labelDownloaded = true;
      }

      if (!labelDownloaded) {
        try {
          const fetchRaw = await dispatch(downloadPurchasedLabel(currentOrder._id)).unwrap();
          const fetchRes = fetchRaw.data || fetchRaw;
          if (fetchRes.labelData) {
             downloadBase64PDF(fetchRes.labelData, `Label_${currentOrder.orderNumber || 'Order'}.pdf`);
             labelDownloaded = true;
          } else if (fetchRes.labelUrl) {
             window.open(fetchRes.labelUrl, "_blank");
             labelDownloaded = true;
          }
        } catch (fallbackErr) {
           console.error("Fallback download failed:", fallbackErr);
        }
      }

      if (response.trackingNumber) {
        setShipping(prev => ({ ...prev, trackingNumber: response.trackingNumber }));
        setOrderStatus('Shipped');
      }

      if (labelDownloaded) {
        toast.success('Label Purchased & Downloaded!', { description: `Tracking Number: ${response.trackingNumber || 'N/A'}`});
      } else {
        toast.warning('Label Purchased, but failed to automatically download.', { description: 'Try downloading manually using the button below.' });
      }

    } catch (error) {
      toast.error(`Label Generation Failed`, { description: typeof error === 'string' ? error : error.message });
    } finally { setIsGeneratingLabel(false); }
  };

  const handlePrintPurchasedLabel = async () => {
    setIsDownloadingLabel(true);
    try {
      const rawRes = await dispatch(downloadPurchasedLabel(currentOrder._id)).unwrap();
      const response = rawRes.data || rawRes;
      const labelUrl = response.labelUrl || response.downloadUrl;
      const labelData = response.labelData;

      if (labelData) {
        downloadBase64PDF(labelData, `Label_${currentOrder.orderNumber || 'Order'}.pdf`);
        toast.success("Label downloaded.");
      } else if (labelUrl) {
        window.open(labelUrl, "_blank");
        toast.success("Label downloaded.");
      } else {
        toast.error("Label URL not found in response.");
      }
    } catch (error) {
      toast.error('Print Failed', { description: error || "Failed to fetch label." });
    } finally {
      setIsDownloadingLabel(false);
    }
  };

  const handleVoidLabel = async () => {
    if (!window.confirm("Are you sure you want to void this shipping label? This action cannot be undone.")) return;
    setIsVoidingLabel(true);
    try {
      await dispatch(voidOrderLabel(currentOrder._id)).unwrap();
      toast.success("Label successfully voided.");
      setShipping(prev => ({ ...prev, trackingNumber: '', shippingCost: 0 }));
      setOrderStatus('Processing');
      setFulfillOpen(false);
    } catch (err) {
      toast.error("Failed to void label", { description: typeof err === 'string' ? err : err.message });
    } finally {
      setIsVoidingLabel(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!window.confirm("Are you sure you want to cancel the ShipStation shipment?")) return;
    setIsCancellingShipment(true);
    try {
      await dispatch(cancelOrderShipment(currentOrder._id)).unwrap();
      toast.success("Shipment successfully cancelled.");
      setOrderStatus('New');
      setFulfillOpen(false);
    } catch (err) {
      toast.error("Failed to cancel shipment", { description: typeof err === 'string' ? err : err.message });
    } finally {
      setIsCancellingShipment(false);
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

  // Explicitly check current order context to pass to the InfoPanel
  const isCurrentlyInternational = currentOrder?.isInternational || false;

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4 box-border text-slate-900">

      <OrderHeaderActions 
        orderStatus={orderStatus} 
        isSaving={isSaving} 
        isDeleting={isDeleting} 
        isCancellingOrder={isCancellingOrder} 
        isGeneratingDocs={isGeneratingDocs} 
        isShipmentCreated={isShipmentCreated} 
        isLabelPurchased={isLabelPurchased} 
        handleDeleteOrder={handleDeleteOrder} 
        handleCancelOrder={handleCancelOrder} 
        handlePrintDocsAndPick={handlePrintDocsAndPick} 
        handleSaveOrder={handleSaveOrder} 
        setCreateShipmentModalOpen={setCreateShipmentModalOpen} 
        setFulfillOpen={setFulfillOpen} 
      />


      <CreateShipmentModal 
        isOpen={createShipmentModalOpen} 
        onClose={() => setCreateShipmentModalOpen(false)} 
        onSubmit={handleCreateShipmentSubmit} 
        isCreatingShipment={isCreatingShipment} 
        address={address} 
        shipping={shipping} 
        packages={packages} 
        notes={notes} 
        onAddPackage={addPackage} 
        onUpdatePackage={updatePackage} 
        onRemovePackage={removePackage} 
        onWeightChange={handleWeightChange} 
        cartoonsCount={cartoonsCount}
        setCartoonsCount={setCartoonsCount}
      />

      <LabelDrawer 
        fulfillOpen={fulfillOpen} 
        setFulfillOpen={setFulfillOpen} 
        fulfillmentData={fulfillmentData} 
        setFulfillmentData={setFulfillmentData} 
        warehouses={warehouses} 
        isLoadingWarehouses={isLoadingWarehouses} 
        isLabelPurchased={isLabelPurchased} 
        isShipmentCreated={isShipmentCreated} 
        handleGenerateLabel={handleGenerateLabel} 
        isGeneratingLabel={isGeneratingLabel} 
        handleCancelShipment={handleCancelShipment} 
        isCancellingShipment={isCancellingShipment} 
        handlePrintPurchasedLabel={handlePrintPurchasedLabel} 
        isDownloadingLabel={isDownloadingLabel} 
        handleVoidLabel={handleVoidLabel} 
        isVoidingLabel={isVoidingLabel} 
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-2">
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">

          <OrderInfoPanel 
            currentOrder={currentOrder} 
            isRushOrder={isRushOrder} 
            isInternational={isCurrentlyInternational} 
            orderCreatorName={orderCreatorName} 
            creationDate={creationDate} 
          />
          

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <OrderStatusPanel 
              orderStatus={orderStatus} 
              setOrderStatus={setOrderStatus} 
              isRushOrder={isRushOrder} 
              setIsRushOrder={setIsRushOrder} 
            />
            <ShippingPanel 
              shipping={shipping} 
              setShipping={setShipping} 
              cartoonsCount={cartoonsCount} 
              setCartoonsCount={setCartoonsCount} 
              palletsCount={palletsCount} 
              setPalletsCount={setPalletsCount} 
              packages={packages} 
              totalItemWeightOz={totalItemWeightOz} 
              isWeightMismatched={isWeightMismatched} 
              orderStatus={orderStatus} 
            />
          </div>

          <AddressPanel 
            address={address} 
            setAddress={setAddress} 
          />

          <NotesAndFeesPanel 
            notes={notes} 
            setNotes={setNotes} 
            currentOrder={currentOrder} 
            processingFeesPreview={processingFeesPreview} 
          />

        </div>

        <div className="space-y-6">
          <ManifestPanel 
            items={items} 
            setItems={setItems} 
            inventoryData={inventoryData} 
            inventoryStatus={inventoryStatus} 
          />

          <InvoicePanel 
            subtotal={subtotal} 
            shipping={shipping} 
            setShipping={setShipping} 
            tax={tax} 
            grandTotal={grandTotal} 
          />
        </div>
      </div>
    </div>
  );
}
