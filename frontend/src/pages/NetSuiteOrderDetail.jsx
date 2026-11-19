import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

// slices
import {
  fetchNetSuiteRecordById,
  clearSelectedRecord,
} from "../store/slices/netSuiteSlice";
import { createOrder, updateOrder } from "../store/slices/orderSlice";
import { fetchInventory } from "../store/slices/inventorySlice";
import { fetchProcessingChargesByCustomer } from "../store/slices/processingChargeSlice";
import {
  fetchCarriers,
  fetchFreightProviders,
} from "../store/slices/carrierSlice";


// Native COBRA Panels
import OrderHeaderActions from "../components/order-details/OrderHeaderActions";
import OrderInfoPanel from "../components/order-details/OrderInfoPanel";
import OrderStatusPanel from "../components/order-details/OrderStatusPanel";
import ShippingPanel from "../components/order-details/ShippingPanel";
import AddressPanel from "../components/order-details/AddressPanel";
import NotesAndFeesPanel from "../components/order-details/NotesAndFeesPanel";
import ManifestPanel from "../components/order-details/ManifestPanel";
import InvoicePanel from "../components/order-details/InvoicePanel";

// Extracted NetSuite Modules
import NetSuiteOrderLoader from "../components/netsuite/NetSuiteOrderLoader";
import NetSuiteOrderMetadataBar from "../components/netsuite/NetSuiteOrderMetadataBar";
import { generateNetSuitePickPackPdf } from "../components/netsuite/netSuitePdfGenerator";
import {
  GATEWAY_CUSTOMER_ID,
  GATEWAY_DIVISION_ID,
  createInitialPackage,
  isTransferRecord,
  isInternationalCountry,
  mapNetSuiteRecordToState,
  calculateProcessingFees,
  buildMockCurrentOrder,
  buildCobraCreationPayload,
} from "../components/netsuite/netSuiteOrderUtils";

export default function NetSuiteOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // --- STORE CONNECTIONS ---
  const {
    selectedRecord,
    recordDetailsCache = {},
    status: nsStatus,
  } = useSelector((state) => state.netsuite || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector(
    (state) => state.inventory || {},
  );
  const { items: customerCharges = [] } = useSelector(
    (state) => state.processingCharges || {},
  );
  const {
    items: carriersData = [],
    status: carrierStatus,
    freightProviders: freightProvidersData = [],
    freightStatus,
  } = useSelector((state) => state.carriers || {});

  const record = selectedRecord || recordDetailsCache[`orders:${id}`] || null;

  // --- STAGED LOCAL STATE ---
  const [orderStatus, setOrderStatus] = useState("New");
  const [shipping, setShipping] = useState({
    carrierId: "",
    carrierType: "",
    serviceCode: "",
    trackingNumber: "",
    shippingCost: 0,
  });
  const [address, setAddress] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    street: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [cartoonsCount, setCartoonsCount] = useState(0);
  const [palletsCount, setPalletsCount] = useState(0);
  const [isRushOrder, setIsRushOrder] = useState(false);
  const [packages] = useState(() => [createInitialPackage()]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMappedInitialRecord, setHasMappedInitialRecord] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (id) {
      setHasMappedInitialRecord(false);
      dispatch(fetchNetSuiteRecordById({ recordType: "orders", id }));
    }
    return () => dispatch(clearSelectedRecord());
  }, [dispatch, id]);

  useEffect(() => {
    if (inventoryStatus === "idle") dispatch(fetchInventory());
  }, [dispatch, inventoryStatus]);

  useEffect(() => {
    dispatch(fetchProcessingChargesByCustomer(GATEWAY_CUSTOMER_ID));
    dispatch(fetchCarriers(GATEWAY_DIVISION_ID));
    dispatch(fetchFreightProviders());
  }, [dispatch]);

  // --- INITIAL RECORD MAPPING ---
  useEffect(() => {
    const isReadyToMap =
      record &&
      !hasMappedInitialRecord &&
      inventoryStatus === "succeeded" &&
      carrierStatus === "succeeded" &&
      freightStatus === "succeeded";

    if (!isReadyToMap) return;

    const mapped = mapNetSuiteRecordToState(
      record,
      inventoryData,
      carriersData,
      freightProvidersData,
    );

    setOrderStatus(mapped.orderStatus);
    setAddress(mapped.address);
    setShipping(mapped.shipping);
    setNotes(mapped.notes);
    setItems(mapped.items);
    setHasMappedInitialRecord(true);
  }, [
    record,
    inventoryData,
    carriersData,
    freightProvidersData,
    hasMappedInitialRecord,
    inventoryStatus,
    carrierStatus,
    freightStatus,
  ]);

  // --- DERIVED CALCULATIONS ---
  const derivedItemWeightOz = items.reduce(
    (acc, item) => acc + Number(item.weight) * Number(item.qty),
    0,
  );
  const totalPackageWeightOz = packages.reduce(
    (acc, pkg) => acc + Number(pkg.weightInOunces || 0),
    0,
  );
  const isWeightMismatched =
    Math.abs(derivedItemWeightOz - totalPackageWeightOz) > 1;
  const finalPayloadWeightOz =
    derivedItemWeightOz > 0 ? derivedItemWeightOz : totalPackageWeightOz;
  const isCurrentlyInternational = isInternationalCountry(address.country);

  const processingFeesPreview = useMemo(
    () =>
      calculateProcessingFees({
        finalPayloadWeightOz,
        itemsCount: items.length,
        isRushOrder,
        isCurrentlyInternational,
        cartoonsCount,
        customerCharges,
      }),
    [
      finalPayloadWeightOz,
      items.length,
      isRushOrder,
      isCurrentlyInternational,
      cartoonsCount,
      customerCharges,
    ],
  );

  const computedSubtotal = items.reduce(
    (acc, item) => acc + item.qty * item.price,
    0,
  );
  const isTransfer = isTransferRecord(record);
  const grandTotal = isTransfer ? 0 : record?.total || computedSubtotal;

  const mockCurrentOrder = buildMockCurrentOrder({
    record,
    isTransfer,
    orderStatus,
    address,
    shipping,
    cartoonsCount,
    palletsCount,
    items,
    computedSubtotal,
    grandTotal,
    processingFeesPreview,
  });

  // --- ACTION HANDLERS ---
  const validateShippingSelection = () => {
    if (!shipping.carrierId || !shipping.serviceCode) {
      toast.error("Valid Shipping Method Required", {
        description:
          "Please click the pencil icon on the Shipping Method panel to select a valid carrier and service.",
      });
      return false;
    }
    return true;
  };

  const getCreationPayload = () =>
    buildCobraCreationPayload({
      record,
      isTransfer,
      orderStatus: statusOverride || orderStatus,
      orderStatus,
      isRushOrder,
      notes,
      address,
      shipping,
      cartoonsCount,
      palletsCount,
      packages,
      finalPayloadWeightOz,
      items,
      computedSubtotal,
      grandTotal,
      processingFeesPreview,
    });

  const handleSaveOrderOnly = async () => {
    if (!record) return toast.error("No record data to process.");
    if (!validateShippingSelection()) return;

    setIsProcessing(true);
    try {
      const actionPromise = dispatch(createOrder(getCreationPayload())).unwrap();

      toast.promise(actionPromise, {
        loading: "Saving to COBRA Database...",
        success: "Successfully stored in database!",
        error: "Failed to save order.",
      });

      const newCobraOrder = await actionPromise;
      navigate(`/orders/${newCobraOrder._id}`);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handlePrintDocsAndPick = async () => {
    if (!record) return toast.error("No record data to process.");
    if (!validateShippingSelection()) return;

    setIsProcessing(true);
    let newCobraOrder;

    try {
      // COBRA DB only — no NetSuite sync until shipped with tracking
      const actionPromise = (async () => {
        let created = await dispatch(
          createOrder(getCreationPayload("Picked")),
        ).unwrap();

        // Safeguard if POST /orders defaults initial status to "New"
        if (created?._id && created.status !== "Picked") {
          created = await dispatch(
            updateOrder({
              id: created._id,
              updateData: { status: "Picked" },
            }),
          ).unwrap();
        }

        return created;
      })();

      toast.promise(actionPromise, {
        loading: "Saving to COBRA & marking as Picked...",
        success: "Order marked as Picked. Generating PDF...",
        error: "Failed to process order.",
      });

      newCobraOrder = await actionPromise;
      setOrderStatus("Picked");
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      return;
    }

    try {
      generateNetSuitePickPackPdf({
        orderNumber: newCobraOrder.orderNumber,
        orderType: mockCurrentOrder.orderType,
        items,
        inventoryData,
        shipping,
        address,
        notes,
      });

      navigate(`/orders/${newCobraOrder._id}`);
    } catch (error) {
      toast.error("Failed to generate PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (nsStatus === "loading" || !record) {
    return <NetSuiteOrderLoader isProcessing={isProcessing} />;
  }

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4 box-border text-slate-900">
      <OrderHeaderActions
        orderStatus={orderStatus}
        isSaving={isProcessing}
        isDeleting={false}
        isCancellingOrder={false}
        isGeneratingDocs={isProcessing}
        isShipmentCreated={false}
        isLabelPurchased={false}
        handleDeleteOrder={() =>
          toast.warning("Order has not been created in COBRA yet.")
        }
        handleCancelOrder={() =>
          toast.warning("Order has not been created in COBRA yet.")
        }
        handlePrintDocsAndPick={handlePrintDocsAndPick}
        handleSaveOrder={handleSaveOrderOnly}
        setCreateShipmentModalOpen={() =>
          toast.warning("Please save the order to the database first.")
        }
        setFulfillOpen={() =>
          toast.warning("Please save the order to the database first.")
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-2">
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">
          <OrderInfoPanel
            currentOrder={mockCurrentOrder}
            isRushOrder={isRushOrder}
            isInternational={isCurrentlyInternational}
            orderCreatorName="NetSuite Import"
            creationDate={new Date(mockCurrentOrder.createdAt).toLocaleString()}
          />

          <NetSuiteOrderMetadataBar
            legacyNumber={mockCurrentOrder.legacyNumber}
            orderSource={mockCurrentOrder.orderSource}
            customerName={mockCurrentOrder.customer?.customerName}
            divisionName={mockCurrentOrder.division?.divisionName}
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
              totalItemWeightOz={finalPayloadWeightOz}
              totalBoxesCount={packages.length}
              isWeightMismatched={isWeightMismatched}
              orderStatus={orderStatus}
              carriersData={carriersData}
              freightProvidersData={freightProvidersData}
              shipmentId=""
              handleDirectSaveMetrics={() =>
                toast.info(
                  "Metrics will save to the database when you click Save Changes or Print & Pick.",
                )
              }
              manuallyAdjustedWeightOunces={0}
            />
          </div>

          <AddressPanel address={address} setAddress={setAddress} />

          <NotesAndFeesPanel
            notes={notes}
            setNotes={setNotes}
            currentOrder={mockCurrentOrder}
            processingFeesPreview={processingFeesPreview}
            processingStatus="succeeded"
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
            currentOrder={mockCurrentOrder}
            shipping={shipping}
            setShipping={setShipping}
          />
        </div>
      </div>
    </div>
  );
}