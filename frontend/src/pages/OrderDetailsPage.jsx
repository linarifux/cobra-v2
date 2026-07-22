import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner'; 
import { 
  ArrowLeft, Truck, MapPin, User, CreditCard, 
  Trash2, Edit2, Check, Plus, MessageSquare, 
  Mail, Phone, X, Weight, Loader2, Save, ExternalLink, 
  CloudUpload, CheckCircle2, PackageCheck, AlertTriangle, Clock, Printer, ChevronDown, Search
} from 'lucide-react';

import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import api from '../utils/api'; 
import { fetchOrderById, updateOrder, clearCurrentOrder, generateOrderLabel, downloadPurchasedLabel } from '../store/slices/orderSlice'; 
import { fetchInventory, updateInventory } from '../store/slices/inventorySlice'; 
import { fetchUsers } from '../store/slices/userSlice'; 

import NotFoundPage from './NotFoundPage';

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

// --- Helper: Robust PDF Download ---
const downloadBase64PDF = (base64Data, filename) => {
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
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

// --- Static Data ---
const US_STATES = [
  { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' }, { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' }, { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' }, { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' }, { name: 'Hawaii', code: 'HI' }, { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' }, { name: 'Indiana', code: 'IN' }, { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' }, { name: 'Kentucky', code: 'KY' }, { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' }, { name: 'Maryland', code: 'MD' }, { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' }, { name: 'Minnesota', code: 'MN' }, { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' }, { name: 'Montana', code: 'MT' }, { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' }, { name: 'New Hampshire', code: 'NH' }, { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' }, { name: 'New York', code: 'NY' }, { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' }, { name: 'Ohio', code: 'OH' }, { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' }, { name: 'Pennsylvania', code: 'PA' }, { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' }, { name: 'South Dakota', code: 'SD' }, { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' }, { name: 'Utah', code: 'UT' }, { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' }, { name: 'Washington', code: 'WA' }, { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' }, { name: 'Wyoming', code: 'WY' }
];

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(id || '');

  const { currentOrder, status: orderLoadStatus, error: orderError } = useSelector((state) => state.orders || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});
  const { items: usersData = [], status: usersStatus } = useSelector((state) => state.users || {}); 
  
  const [orderStatus, setOrderStatus] = useState('New');
  const [selectedUserId, setSelectedUserId] = useState(''); 
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
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  const [fulfillmentData, setFulfillmentData] = useState({
    shipFromId: '', 
    isResidential: false
  });
  
  const [packages, setPackages] = useState([
    { id: generateLocalId(), weightInOunces: 16, length: 10, width: 10, height: 10 }
  ]);

  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const stateDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
        setIsStateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStates = US_STATES.filter(s => 
    s.name.toLowerCase().includes(stateSearch.toLowerCase()) || 
    s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const ssData = currentOrder?.shipstationDetails || currentOrder?.shipstationOrder || currentOrder?.shipstation || null;
  const ssOrderId = ssData?.orderId || currentOrder?.shipstationOrderId || null;
  const ssLabelId = ssData?.labelId || null;

  const isLabelPurchased = !!ssLabelId || !!shipping.trackingNumber;
  const isPickingListDone = ['Picked', 'Shipped', 'Delivered', 'Billed'].includes(orderStatus);
  const isPackingSlipDone = isPickingListDone;
  const isShipmentCreated = isPickingListDone || !!ssOrderId;
  const canManageLabel = ['Picked', 'Shipped', 'Delivered', 'Billed'].includes(orderStatus);

  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0);
  const shippingCost = Number(shipping.shippingCost) || 0;
  const tax = subtotal * 0.08; 
  const grandTotal = subtotal + shippingCost + tax;
  const totalItemWeightOz = items.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);
  const totalPackageWeightOz = packages.reduce((acc, pkg) => acc + Number(pkg.weightInOunces || 0), 0);
  const isWeightMismatched = Math.abs(totalItemWeightOz - totalPackageWeightOz) > 1;

  const orderUserId = currentOrder?.user?._id || currentOrder?.user;
  const orderCreator = useMemo(() => {
    if (!orderUserId || usersData.length === 0) return null;
    return usersData.find(u => u._id === orderUserId);
  }, [orderUserId, usersData]);
  
  const orderCreatorName = orderCreator ? (orderCreator.name || orderCreator.firstName || orderCreator.email) : null;

  useEffect(() => {
    if (isValidMongoId) dispatch(fetchOrderById(id));
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
    if (usersStatus === 'idle') dispatch(fetchUsers()); 
    return () => dispatch(clearCurrentOrder());
  }, [id, isValidMongoId, inventoryStatus, usersStatus, dispatch]);

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
      setOrderStatus(currentOrder.status || 'New');
      setSelectedUserId(currentOrder.user?._id || currentOrder.user || ''); 
      
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


  // --- COMBINED PDF PRINT & PICK LOGIC ---
  const handlePrintDocsAndPick = async () => {
    setIsGeneratingDocs(true);
    try {
      const doc = new jsPDF();
      
      // ==========================================
      // 1. PICKING LIST
      // ==========================================
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

      // ==========================================
      // 2. PACKING SLIP
      // ==========================================
      doc.addPage();
      
      const orderNo = currentOrder.orderNumber || 'N/A';
      const orderDate = currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A';
      const shipVia = `${shipping.carrierType || ''} ${shipping.serviceCode || ''}`.trim() || 'UPS - Ground';
      const phone = address.phone || currentOrder.customer?.contactNumber || '';
    

      // Top Header
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(currentOrder?.customer?.customerName, 14, 20);

      // Top Right
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

      // Address Blocks
      const addressBlockY = 55;
      doc.setFontSize(10);
      
      doc.setFont('helvetica', 'bold');
      doc.text("SHIP FROM:", 14, addressBlockY);
      doc.setFont('helvetica', 'normal');
      doc.text("MI-KRO Industries", 40, addressBlockY);
      doc.text("1509 RT 38, Unit 9", 40, addressBlockY + 5);
      doc.text("Hainesport, NJ 08036 US", 40, addressBlockY + 10);
      doc.text("Phone: 609-694-0521", 40, addressBlockY + 15);
      doc.text("Email: mike@mi-krologistics.com", 40, addressBlockY + 20);

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

      // Comments
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

      // Table
      const tableRows = items.map(item => {
          const qtyStr = (item.qty || 0).toString();
          return [
              item.sku,
              item.name,
              qtyStr,     
              qtyStr, 
              qtyStr  
          ];
      });

      autoTable(doc, {
          startY: commentsY + 5,
          head: [["Item Code / Lot(s) #", "Description", "Qty.\nPicked", "Qty.\nOrdered", "Qty.\nShipped"]],
          body: tableRows,
          theme: 'plain',
          headStyles: { 
            fontStyle: 'bold', 
            textColor: 0, 
            halign: 'left', 
            borderBottomColor: 0, 
            borderBottomWidth: 0.5 
          },
          styles: { fontSize: 9, cellPadding: 3, textColor: 20, font: 'helvetica' },
          columnStyles: {
              0: { cellWidth: 45 },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 20, halign: 'center' },
              3: { cellWidth: 20, halign: 'center' },
              4: { cellWidth: 20, halign: 'center' }
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

      // Footer
      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(55, finalY, 100, 8); 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("*** THANK YOU FOR YOUR ORDER! ***", 105, finalY + 5.5, { align: 'center' });

      doc.setLineWidth(1.5);
      doc.line(14, 280, 196, 280);

      // Print
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');

      // 3. Update Order Status
      await dispatch(updateOrder({ id: currentOrder._id, updateData: { status: 'Picked' } })).unwrap();
      setOrderStatus('Picked');
      toast.success("Documents generated and order marked as Picked.");

    } catch (error) {
      console.error(error);
      toast.error("Failed to generate documents or update order.");
    } finally {
      setIsGeneratingDocs(false);
    }
  };

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

  const addPackage = () => setPackages([...packages, { id: generateLocalId(), weightInOunces: 16, length: 10, width: 10, height: 10 }]);
  const updatePackage = (id, field, value) => setPackages(packages.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removePackage = (id) => setPackages(packages.filter(p => p.id !== id));
  
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

    if (address.state.trim().length !== 2) {
      setIsSaving(false);
      return toast.error("State must be exactly a 2-character code (e.g., NY, CA). Please use the dropdown selector.");
    }

    const payload = {
      status: orderStatus,
      ...(selectedUserId ? { user: selectedUserId } : { user: null }), // Only send user if explicitly selected
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
        name: "MI-KRO Industries",
        company_name: "MI-KRO Industries",
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
      toast.success('Pushed to ShipStation', { description: 'Order is now waiting in your ShipStation dashboard.' });
      if (response.data?.data?.order?.status) setOrderStatus(response.data.data.order.status);
      dispatch(fetchOrderById(currentOrder._id));
    } catch (error) {
      toast.error('ShipStation API Error', { description: error.response?.data?.message || error.message });
    } finally { setIsPushingShipment(false); }
  };

  const handleGenerateLabel = async () => {
    if (!shipping.carrierType || !shipping.serviceCode) return toast.warning("Please configure shipping carrier and service code on the order before purchasing.");
    if (!fulfillmentData.shipFromId) return toast.warning("Please select a Ship From warehouse location.");

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
        name: "MI-KRO Industries",
        phone: originAddress.phone || "",
        company_name: "", // Forced blank to hide brand context from ShipFrom lines if needed
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

      let labelDownloaded = false;

      if (response.labelData) {
        try {
          downloadBase64PDF(response.labelData, `Label_${currentOrder.orderNumber || 'Order'}.pdf`);
          labelDownloaded = true;
        } catch (e) {
          console.error("Failed standard decode, falling back.");
        }
      } 
      
      // Fallback 1: URL provided directly in generate response
      if (!labelDownloaded && response.labelUrl) {
        const link = document.createElement('a');
        link.href = response.labelUrl;
        link.target = "_blank";
        link.download = `Label_${currentOrder.orderNumber || 'Order'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        labelDownloaded = true;
      }
      
      // Fallback 2: Force explicit fetch immediately if it didn't come attached
      if (!labelDownloaded) {
        try {
          const fetchRes = await dispatch(downloadPurchasedLabel(currentOrder._id)).unwrap();
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
      const response = await dispatch(downloadPurchasedLabel(currentOrder._id)).unwrap();
      const labelUrl = response.labelUrl || response.downloadUrl;
      const labelData = response.labelData;

      if (labelUrl) {
        const link = document.createElement('a');
        link.href = labelUrl;
        link.target = "_blank";
        link.download = `Label_${currentOrder.orderNumber || 'Order'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Label downloaded.");
      } else if (labelData) {
        downloadBase64PDF(labelData, `Label_${currentOrder.orderNumber || 'Order'}.pdf`);
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
      
      {/* Header */}
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
            onClick={handlePrintDocsAndPick}
            disabled={isGeneratingDocs || isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-emerald-500 transition-all duration-200 disabled:opacity-70"
          >
            {isGeneratingDocs ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Print & Pick
          </button>

          <button 
            onClick={handleSaveOrder}
            disabled={isSaving || isDeleting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
          </button>

          <button 
            onClick={() => setFulfillOpen(true)}
            disabled={!canManageLabel}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg transition-all duration-200 ${!canManageLabel ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-gold text-white shadow-brand-gold/20 hover:scale-105'}`}
          >
            <CheckCircle2 size={14} /> {isLabelPurchased ? 'View Label' : 'Generate Label'}
          </button>
        </div>
      </div>

      {/* Slide-over Drawer for Label Generation Configuration */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${fulfillOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setFulfillOpen(false)} />
        <div className={`relative w-full max-w-[400px] bg-white/95 backdrop-blur-2xl border-l border-white/50 p-6 shadow-2xl h-full overflow-y-auto transition-transform duration-300 ease-in-out flex flex-col ${fulfillOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-black uppercase tracking-wider text-sm text-slate-800 flex items-center gap-2">
                <PackageCheck size={18} className="text-brand-gold"/> Generate Shipping Label
              </h2>
            </div>
            <button onClick={() => setFulfillOpen(false)} className="text-slate-500 hover:text-slate-900 bg-slate-100 p-1.5 rounded-full transition-colors"><X size={16}/></button>
          </div>
          
          <div className="space-y-5 flex-1">
            
            {/* Warehouse / Ship From Selection */}
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

            {/* Dynamic Packages Array */}
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
          
          {/* LABEL PURCHASE ACTIONS */}
          <div className="mt-4 pt-4 border-t border-slate-200 shrink-0 bg-white/95">
             <div className="space-y-3">
                 {!isLabelPurchased ? (
                   <button 
                     onClick={handleGenerateLabel}
                     disabled={isGeneratingLabel || !fulfillmentData.shipFromId}
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
                     Download Purchased Label
                   </button>
                 )}
              </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-2">
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">
          
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 border border-white/60 p-5 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Order Reference</span>
              <span className="text-xl font-black text-slate-900 tracking-tight">{currentOrder.orderNumber}</span>
              {orderCreatorName && (
                <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                  <User size={12} className="text-brand-gold" /> Order Placed by {orderCreatorName}
                </p>
              )}
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
                    <option value="New">New</option>
                    <option value="Pending">Pending</option>
                    <option value="Picked">Picked</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Hold">Hold</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Billed">Billed</option>
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

          {/* CRITICAL FIX: Z-Index explicitly increased here to stay above the order notes */}
          {/* Shipping Address Form */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-20">
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
                    
                    <div className="col-span-1 flex gap-3 relative z-50">
                        {/* CUSTOM SEARCHABLE STATE DROPDOWN */}
                        <div className="w-1/2 relative" ref={stateDropdownRef}>
                          <div 
                            className="w-full bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus-within:border-brand-gold shadow-sm flex items-center justify-between cursor-pointer"
                            onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                          >
                            <span className={address.state ? "text-slate-900 font-bold" : "text-slate-400"}>
                              {address.state || "Select..."}
                            </span>
                            <ChevronDown size={14} className="text-slate-400" />
                          </div>

                          <AnimatePresence>
                            {isStateDropdownOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute z-[100] w-full md:w-48 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                              >
                                <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                                  <Search size={14} className="text-slate-400" />
                                  <input 
                                    autoFocus
                                    className="w-full text-xs outline-none font-medium text-slate-700" 
                                    placeholder="Search state..." 
                                    value={stateSearch} 
                                    onChange={(e) => setStateSearch(e.target.value)} 
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                  {filteredStates.length > 0 ? (
                                    filteredStates.map(s => (
                                      <div 
                                        key={s.code} 
                                        className="px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                                        onClick={() => {
                                          setAddress({ ...address, state: s.code });
                                          setIsStateDropdownOpen(false);
                                          setStateSearch('');
                                        }}
                                      >
                                        <span>{s.name}</span>
                                        <span className="text-slate-400 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{s.code}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-3 text-xs text-slate-400 text-center">No state found</div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="w-1/2">
                            <input className="w-full bg-white p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip Code" />
                        </div>
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

          {/* Order Notes - relative z-10 so dropdown flows over it */}
          <div className="bg-amber-50/80 border border-amber-200/60 p-6 rounded-3xl shadow-sm backdrop-blur-xl relative z-10">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2"><MessageSquare size={14}/> Order Notes</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               className="w-full bg-white border border-amber-200/60 rounded-xl p-4 text-xs font-medium text-slate-700 focus:border-amber-400 outline-none resize-none min-h-[100px] shadow-inner"
               placeholder="Add internal notes or customer requests here..."
             />
          </div>

        </div>

        {/* Right Column: Manifest & Totals */}
        <div className="space-y-6">
            
          {/* Manifest Form */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
              <PackageCheck size={14} /> Edit Manifest Items
            </h3>
            
            <div className="space-y-4">
                {items.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl">
                        No items added to this order yet.
                    </div>
                )}
                
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-slate-100 group">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-500 truncate">{item.sku}</p>
                        </div>
                        <div className="w-16 shrink-0">
                            <input 
                                type="number" 
                                min="1" 
                                className="w-full bg-white border border-slate-200 rounded-lg text-center text-xs font-bold py-1.5 outline-none focus:border-brand-gold shadow-sm"
                                value={item.qty}
                                onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 1;
                                    setItems(items.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
                                }}
                            />
                        </div>
                        <div className="w-20 shrink-0 text-right">
                            <p className="text-xs font-black text-slate-800">${(item.price * item.qty).toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={() => setItems(items.filter(i => i.id !== item.id))} 
                            className="text-slate-300 hover:text-red-500 transition-colors duration-200 p-1 shrink-0"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                ))}

                {/* Add Item Row */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 shadow-inner space-y-3 mt-4">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Add Product</h4>
                    <select 
                        className="w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-brand-gold text-slate-700 cursor-pointer shadow-sm transition-all"
                        value={availableInventories.find(i => i.name === newItem.name)?.id || ''}
                        onChange={handleInventoryChange}
                        disabled={inventoryStatus === 'loading'}
                    >
                        <option className="text-slate-400" value="">{inventoryStatus === 'loading' ? 'Loading Catalog...' : 'Select Item from Catalog...'}</option>
                        {availableInventories.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} (SKU: {inv.sku})</option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            className="w-20 bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 text-center outline-none focus:border-brand-gold shadow-sm" 
                            value={newItem.qty} 
                            onChange={(e) => setNewItem({...newItem, qty: e.target.value})} 
                        />
                        <div className="flex-1 bg-slate-100 p-2.5 rounded-lg text-xs font-black border border-slate-200 flex items-center justify-end text-slate-400 shadow-inner cursor-not-allowed">
                            {newItem.price ? `$${Number(newItem.price).toFixed(2)}` : '$0.00'}
                        </div>
                        <button 
                            onClick={handleAddItem} 
                            className="bg-slate-900 text-white px-4 rounded-lg hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
            </div>
          </div>

          {/* Invoice Summary Preview */}
          <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-900 relative overflow-hidden">
             <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none"></div>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4 border-b border-white/10 pb-3 relative z-10">
                 <CreditCard size={14}/> Invoice Preview
             </h3>
             <div className="text-sm font-medium space-y-3 relative z-10 text-slate-300">
               <div className="flex justify-between"><span>Subtotal</span> <span className="font-mono text-white">${subtotal.toFixed(2)}</span></div>
               <div className="flex justify-between items-center">
                   <span>Shipping Cost</span> 
                   <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-white/5 w-24">
                       <span className="px-2 text-xs text-slate-400">$</span>
                       <input 
                           type="number" 
                           className="w-full bg-transparent text-white font-mono outline-none py-1 text-right pr-2 text-sm" 
                           value={shipping.shippingCost} 
                           onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} 
                       />
                   </div>
               </div>
               <div className="flex justify-between"><span>Estimated Tax</span> <span className="font-mono text-white">${tax.toFixed(2)}</span></div>
               <div className="flex justify-between border-t pt-4 mt-2 border-white/10 text-white items-end">
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