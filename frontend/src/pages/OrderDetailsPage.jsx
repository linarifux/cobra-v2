import React, { useState, useEffect, useMemo } from 'react';
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
import { fetchInventory } from '../store/slices/inventorySlice'; 
import { fetchUsers } from '../store/slices/userSlice'; 
import { fetchCarriers, fetchCarrierPackages } from '../store/slices/carrierSlice';
import { fetchChargeTypes } from '../store/slices/chargeTypeSlice';

import NotFoundPage from './NotFoundPage';
import CreateShipmentModal from '../components/order-details/CreateShipmentModal';

import OrderHeaderActions from '../components/order-details/OrderHeaderActions';
import OrderInfoPanel from '../components/order-details/OrderInfoPanel';
import OrderStatusPanel from '../components/order-details/OrderStatusPanel';
import ShippingPanel from '../components/order-details/ShippingPanel';
import AddressPanel from '../components/order-details/AddressPanel';
import NotesAndFeesPanel from '../components/order-details/NotesAndFeesPanel';
import ManifestPanel from '../components/order-details/ManifestPanel';
import InvoicePanel from '../components/order-details/InvoicePanel';
import LabelDrawer from '../components/order-details/LabelDrawer';

const downloadBase64PDF = (base64Data, filename) => {
  try {
    let cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    while (cleanBase64.length % 4 > 0) cleanBase64 += '=';
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
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
  const { items: carriersData = [] } = useSelector((state) => state.carriers || {});
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
  const [isInternational, setIsInternational] = useState(false);
  
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
  const [packages, setPackages] = useState([{ id: Date.now().toString(), packageCode: 'package', weightInOunces: 16, length: 10, width: 10, height: 10 }]);

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

  const orderCreator = useMemo(() => {
    const orderUserId = currentOrder?.user?._id || currentOrder?.user;
    if (!orderUserId || usersData.length === 0) return null;
    return usersData.find(u => u._id === orderUserId);
  }, [currentOrder, usersData]);
  const orderCreatorName = orderCreator ? (orderCreator.name || orderCreator.firstName || orderCreator.email) : null;

  useEffect(() => { if (chargeTypeStatus === 'idle') dispatch(fetchChargeTypes()); }, [chargeTypeStatus, dispatch]);
  useEffect(() => { if (isValidMongoId) dispatch(fetchOrderById(id)); return () => dispatch(clearCurrentOrder()); }, [id, isValidMongoId, dispatch]);
  useEffect(() => { if (inventoryStatus === 'idle') dispatch(fetchInventory()); }, [inventoryStatus, dispatch]);
  useEffect(() => { if (usersStatus === 'idle') dispatch(fetchUsers()); }, [usersStatus, dispatch]);

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
        if (fetchedWarehouses.length > 0) setFulfillmentData(p => ({ ...p, shipFromId: fetchedWarehouses[0].warehouse_id }));
      } catch (err) { toast.error("Could not load origin warehouses from ShipStation."); } 
      finally { setIsLoadingWarehouses(false); }
    };
    fetchLocations();
  }, []);

  const processingFeesPreview = useMemo(() => {
    const getFee = (name, fallback = 0) => {
      const ct = chargeTypes.find(c => c.name === name && c.isActive !== false);
      return ct && ct.defaultCharge !== undefined ? Number(ct.defaultCharge) : fallback;
    };
    const weightLbs = totalPackageWeightOz / 16;
    const lineItemsCount = items.length;
    const piecesCount = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    
    const baseFee = weightLbs <= 10 ? 5.07 : 5.68;
    const weightSurcharge = weightLbs > 20 ? (weightLbs - 20) * getFee('Weight Surcharge', 0.15) : 0;
    const lineItemSurcharge = lineItemsCount > 3 ? (lineItemsCount - 3) * getFee('Line Item Surcharge', 0.81) : 0;
    const packageSurcharge = packages.length > 1 ? (packages.length - 1) * getFee('Package Surcharge', 0.71) : 0;
    const pieceSurcharge = piecesCount * getFee('Piece Surcharge', 0.03);
    const cartonSurcharge = (Number(cartoonsCount) || 0) * getFee('Carton Surcharge', 2.05);
    const palletFee = (Number(palletsCount) || 0) * getFee('Pallet Fee', 8.40);
    const rushFee = isRushOrder ? getFee('Rush Fee', 0) : 0;
    const internationalFee = isInternational ? getFee('International Fee', 0) : 0;
    const totalProcessingFee = baseFee + weightSurcharge + lineItemSurcharge + packageSurcharge + pieceSurcharge + cartonSurcharge + palletFee + rushFee + internationalFee;
    return { baseFee, weightSurcharge, lineItemSurcharge, packageSurcharge, pieceSurcharge, cartonSurcharge, palletFee, rushFee, internationalFee, totalProcessingFee };
  }, [totalPackageWeightOz, items, packages.length, cartoonsCount, palletsCount, isRushOrder, isInternational, chargeTypes]);

  useEffect(() => {
    if (currentOrder) {
      setOrderStatus(currentOrder.status || 'New');
      setSelectedUserId(currentOrder.user?._id || currentOrder.user || ''); 
      setCartoonsCount(currentOrder.shippingDetails?.cartoons || 0);
      setPalletsCount(currentOrder.shippingDetails?.pallets || 0); 
      setIsRushOrder(currentOrder.isRushOrder || false);
      setIsInternational(currentOrder.isInternational || false);
      
      setShipping({ 
        carrierId: currentOrder.shippingDetails?.carrierId?._id || currentOrder.shippingDetails?.carrierId || '',
        carrierType: currentOrder.shippingDetails?.carrierType || '', serviceCode: currentOrder.shippingDetails?.serviceCode || '', 
        trackingNumber: currentOrder.shippingDetails?.trackingNumber || '', shippingCost: currentOrder.shippingDetails?.shippingCost || 0, shipStationId: currentOrder.shippingDetails?.shipStationId || ''
      });

      setAddress({ 
        name: currentOrder.shippingAddress?.recipientName || '', email: currentOrder.shippingAddress?.email || '', phone: currentOrder.shippingAddress?.phone || '',
        street: currentOrder.shippingAddress?.line1 || '', line2: currentOrder.shippingAddress?.line2 || '', city: currentOrder.shippingAddress?.city || '', 
        state: currentOrder.shippingAddress?.state || '', zip: currentOrder.shippingAddress?.zip || '', country: currentOrder.shippingAddress?.country || 'US'
      });
      setNotes(currentOrder.notes || '');
      
      const mappedItems = currentOrder.items?.map((i) => {
        const matchedStock = inventoryData.find(inv => inv.sku === i.sku);
        return { id: Math.random().toString(), name: i.name, sku: i.sku, qty: i.quantity, price: i.unitPrice, weight: matchedStock?.weight || 0 };
      }) || [];
      setItems(mappedItems);

      if (currentOrder.shippingDetails?.packages && currentOrder.shippingDetails.packages.length > 0) {
        setPackages(currentOrder.shippingDetails.packages.map(p => ({
          id: Math.random().toString(), packageCode: p.packageCode || 'package', weightInOunces: p.weightInOunces || 16, length: p.length || 10, width: p.width || 10, height: p.height || 10
        })));
      } else {
        const calculatedOz = currentOrder.shippingDetails?.totalWeightOunces || mappedItems.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);
        if (packages.length === 1 && packages[0].weightInOunces === 16) {
           setPackages([{ id: Math.random().toString(), packageCode: 'package', weightInOunces: calculatedOz > 0 ? calculatedOz : 16, length: 10, width: 10, height: 10 }]);
        }
      }
    }
  }, [currentOrder, inventoryData]); 

  const handlePrintDocsAndPick = async () => {
    setIsGeneratingDocs(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.text("PICKING LIST", 14, 20);
      doc.setLineWidth(0.5); doc.line(14, 22, 196, 22);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Order Ref: ${currentOrder.orderNumber}`, 14, 28);
      
      const pickingRows = items.map(item => {
        const invItem = inventoryData.find(inv => inv.sku === item.sku);
        let locStr = invItem?.locations?.map(l => l.designation).filter(Boolean).join(', ') || invItem?.locationString || '';
        return [" [    ] ", locStr, item.sku, item.name, item.qty.toString()];
      });

      autoTable(doc, {
        startY: 40, head: [["Picked", "Location", "SKU", "Item Description", "Qty Required"]], body: pickingRows,
        theme: 'grid', headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' }
      });
      doc.addPage();
      doc.text("PACKING SLIP (Truncated for brevity)", 14, 20);
      doc.autoPrint(); window.open(doc.output('bloburl'), '_blank');

      if (!shipping.trackingNumber) {
        await dispatch(updateOrder({ id: currentOrder._id, updateData: { status: 'Picked' } })).unwrap();
        setOrderStatus('Picked'); toast.success("Documents generated and order marked as Picked.");
      } else { toast.success("Documents generated successfully."); }
    } catch (error) { toast.error("Failed to generate documents or update order."); } finally { setIsGeneratingDocs(false); }
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    const isChangingToCancelled = orderStatus === 'Cancelled' && currentOrder?.status !== 'Cancelled';
    
    // CRITICAL FIX: Explicitly map local state keys to the Mongoose schema requirements
    const payload = {
      status: orderStatus, 
      isRushOrder, 
      isInternational, 
      ...(selectedUserId ? { user: selectedUserId } : { user: null }),
      notes, 
      shippingAddress: { 
        recipientName: address.name, 
        email: address.email, 
        phone: address.phone,
        line1: address.street, 
        line2: address.line2, 
        city: address.city,
        state: (address.state || '').toUpperCase().trim(),
        zip: address.zip, 
        country: address.country || 'US'
      },
      shippingDetails: { 
        ...currentOrder.shippingDetails, 
        carrierType: shipping.carrierType,
        serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber,
        shippingCost: Number(shipping.shippingCost) || 0,
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
      items: items.map(item => ({ 
        sku: item.sku, 
        name: item.name, 
        quantity: Number(item.qty), 
        unitPrice: Number(item.price), 
        totalPrice: Number(item.qty) * Number(item.price) 
      }))
    };

    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();
      toast.success(isChangingToCancelled ? 'Order cancelled.' : 'Order saved successfully.');
    } catch (error) { toast.error(`Failed to save order: ${error}`); } finally { setIsSaving(false); }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this entire order? This will restock items and void any labels.")) return;
    setIsCancellingOrder(true);
    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: { status: 'Cancelled' } })).unwrap();
      setOrderStatus('Cancelled'); toast.success('Order cancelled. Items returned to stock.');
    } catch (error) { toast.error(`Failed to cancel order: ${error}`); } finally { setIsCancellingOrder(false); }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/orders/${currentOrder._id}`);
      toast.success('Order deleted successfully.'); navigate('/orders');
    } catch (error) { toast.error(`Failed to delete order: ${error.message}`); } finally { setIsDeleting(false); }
  };

  const handleCreateShipmentSubmit = async (modalCartoonsCount) => {
    setIsCreatingShipment(true);
    try {
      await dispatch(createOrderShipment({ orderId: currentOrder._id, fulfillmentData: { packages, isResidential: fulfillmentData.isResidential, carrierCode: shipping.carrierType, serviceCode: shipping.serviceCode, cartoons: Number(modalCartoonsCount) || Number(cartoonsCount) || 0, totalBoxes: packages.length, totalWeightOunces: totalPackageWeightOz } })).unwrap();
      toast.success("Shipment successfully created in ShipStation."); setCreateShipmentModalOpen(false); dispatch(fetchOrderById(currentOrder._id));
    } catch (error) { toast.error("Failed to create shipment"); } finally { setIsCreatingShipment(false); }
  };

  const handleGenerateLabel = async () => {
    if (!fulfillmentData.shipFromId) return toast.warning("Select Ship From warehouse.");
    setIsGeneratingLabel(true);
    try {
      const response = await dispatch(generateOrderLabel({ orderId: currentOrder._id, fulfillmentData: { shipFromId: fulfillmentData.isResidential, packages, carrierCode: shipping.carrierType, serviceCode: shipping.serviceCode } })).unwrap();
      setFulfillOpen(false);
      if (response.data?.labelData) downloadBase64PDF(response.data.labelData, `Label.pdf`);
      toast.success('Label Purchased & Downloaded!');
    } catch (error) { toast.error(`Label Generation Failed`); } finally { setIsGeneratingLabel(false); }
  };

  const handlePrintPurchasedLabel = async () => {
    setIsDownloadingLabel(true);
    try {
      const response = await dispatch(downloadPurchasedLabel(currentOrder._id)).unwrap();
      if (response.data?.labelData) downloadBase64PDF(response.data.labelData, `Label.pdf`);
    } catch (error) { toast.error('Print Failed'); } finally { setIsDownloadingLabel(false); }
  };

  const handleVoidLabel = async () => {
    setIsVoidingLabel(true);
    try { await dispatch(voidOrderLabel(currentOrder._id)).unwrap(); toast.success("Label voided."); } 
    catch (err) { toast.error("Failed to void label"); } finally { setIsVoidingLabel(false); }
  };

  const handleCancelShipment = async () => {
    setIsCancellingShipment(true);
    try { await dispatch(cancelOrderShipment(currentOrder._id)).unwrap(); toast.success("Shipment cancelled."); } 
    catch (err) { toast.error("Failed to cancel shipment"); } finally { setIsCancellingShipment(false); }
  };

  const addPackage = () => setPackages(prev => [...prev, { id: Math.random().toString(), packageCode: 'package', weightInOunces: 16, length: 10, width: 10, height: 10 }]);
  const updatePackage = (id, field, value) => setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removePackage = (id) => setPackages(prev => prev.filter(p => p.id !== id));
  const handleWeightChange = (id, currentOz, type, value) => updatePackage(id, 'weightInOunces', Number(value));

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

  const creationDate = currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4 box-border text-slate-900">
      <OrderHeaderActions 
        orderStatus={orderStatus} isSaving={isSaving} isDeleting={isDeleting} isCancellingOrder={isCancellingOrder} isGeneratingDocs={isGeneratingDocs} 
        isShipmentCreated={isShipmentCreated} isLabelPurchased={isLabelPurchased} handleDeleteOrder={handleDeleteOrder} handleCancelOrder={handleCancelOrder} 
        handlePrintDocsAndPick={handlePrintDocsAndPick} handleSaveOrder={handleSaveOrder} setCreateShipmentModalOpen={setCreateShipmentModalOpen} setFulfillOpen={setFulfillOpen} 
      />

      <CreateShipmentModal 
        isOpen={createShipmentModalOpen} onClose={() => setCreateShipmentModalOpen(false)} onSubmit={handleCreateShipmentSubmit} 
        isCreatingShipment={isCreatingShipment} address={address} shipping={shipping} packages={packages} notes={notes} 
        onAddPackage={addPackage} onUpdatePackage={updatePackage} onRemovePackage={removePackage} onWeightChange={handleWeightChange} 
      />

      <LabelDrawer 
        fulfillOpen={fulfillOpen} setFulfillOpen={setFulfillOpen} fulfillmentData={fulfillmentData} setFulfillmentData={setFulfillmentData} 
        warehouses={warehouses} isLoadingWarehouses={isLoadingWarehouses} isLabelPurchased={isLabelPurchased} isShipmentCreated={isShipmentCreated} 
        handleGenerateLabel={handleGenerateLabel} isGeneratingLabel={isGeneratingLabel} handleCancelShipment={handleCancelShipment} 
        isCancellingShipment={isCancellingShipment} handlePrintPurchasedLabel={handlePrintPurchasedLabel} isDownloadingLabel={isDownloadingLabel} 
        handleVoidLabel={handleVoidLabel} isVoidingLabel={isVoidingLabel} 
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-2">
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">
          <OrderInfoPanel currentOrder={currentOrder} isRushOrder={isRushOrder} isInternational={isInternational} orderCreatorName={orderCreatorName} creationDate={creationDate} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <OrderStatusPanel orderStatus={orderStatus} setOrderStatus={setOrderStatus} isRushOrder={isRushOrder} setIsRushOrder={setIsRushOrder} isInternational={isInternational} setIsInternational={setIsInternational} />
            <ShippingPanel shipping={shipping} setShipping={setShipping} cartoonsCount={cartoonsCount} setCartoonsCount={setCartoonsCount} palletsCount={palletsCount} setPalletsCount={setPalletsCount} packages={packages} totalItemWeightOz={totalItemWeightOz} isWeightMismatched={isWeightMismatched} orderStatus={orderStatus} />
          </div>

          <AddressPanel address={address} setAddress={setAddress} />
          <NotesAndFeesPanel notes={notes} setNotes={setNotes} currentOrder={currentOrder} processingFeesPreview={processingFeesPreview} />
        </div>

        <div className="space-y-6">
          <ManifestPanel items={items} setItems={setItems} inventoryData={inventoryData} inventoryStatus={inventoryStatus} />
          <InvoicePanel subtotal={subtotal} shipping={shipping} setShipping={setShipping} tax={tax} grandTotal={grandTotal} />
        </div>
      </div>
    </div>
  );
}