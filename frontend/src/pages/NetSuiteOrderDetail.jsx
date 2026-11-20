import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, useStore } from "react-redux";
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
  const store = useStore();

  // --- STORE CONNECTIONS ---
  const { items: inventoryData = [], status: inventoryStatus } = useSelector(
    (state) => state.inventory || {},
  );
  const { items: customerCharges = [] } = useSelector(
    (state) => state.processingCharges || {},
  );
  const {
    items: carriersData = [],
    freightProviders: freightProvidersData = [],
  } = useSelector((state) => state.carriers || {});

  // --- STAGED LOCAL STATE ---
  const [loadedRecord, setLoadedRecord] = useState(null);
  const [mappedRecordId, setMappedRecordId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

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

  const isMappedForCurrentId =
    Boolean(id) &&
    String(mappedRecordId) === String(id) &&
    Boolean(loadedRecord);

  // --- SINGLE COORDINATED PARALLEL FETCH + MAP ---
  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    const loadOrderAndDependencies = async () => {
      setLoadError(null);

      const state = store.getState();
      const cachedRecord = state.netsuite?.recordDetailsCache?.[`orders:${id}`];
      const invState = state.inventory || {};
      const carrierState = state.carriers || {};
      const chargesState = state.processingCharges || {};

      let fetchedRecord = cachedRecord || null;
      const tasks = [];

      // 1. Fetch NetSuite order only if not already cached
      if (!cachedRecord) {
        tasks.push(
          dispatch(fetchNetSuiteRecordById({ recordType: "orders", id }))
            .unwrap()
            .then((res) => {
              fetchedRecord = res?.data || res?.record || res;
            }),
        );
      }

      // 2. Fetch Inventory only if not already loaded
      if (invState.status !== "succeeded" || !invState.items?.length) {
        tasks.push(dispatch(fetchInventory()).unwrap());
      }

      // 3. Fetch Gateway Processing Charges only if not already loaded for Gateway
      const hasGatewayCharges =
        chargesState.items?.length > 0 &&
        String(
          chargesState.items[0]?.customer?._id ||
            chargesState.items[0]?.customer ||
            "",
        ) === GATEWAY_CUSTOMER_ID;

      if (!hasGatewayCharges) {
        tasks.push(
          dispatch(
            fetchProcessingChargesByCustomer(GATEWAY_CUSTOMER_ID),
          ).unwrap(),
        );
      }

      // 4. Fetch Gateway Carriers only if not already loaded for Gateway division
      const hasGatewayCarriers =
        carrierState.status === "succeeded" &&
        carrierState.items?.length > 0 &&
        carrierState.items.every(
          (c) =>
            !c.division ||
            String(c.division?._id || c.division) === GATEWAY_DIVISION_ID,
        );

      if (!hasGatewayCarriers) {
        tasks.push(dispatch(fetchCarriers(GATEWAY_DIVISION_ID)).unwrap());
      }

      // 5. Fetch Freight Providers only if not already loaded
      if (
        carrierState.freightStatus !== "succeeded" ||
        !carrierState.freightProviders?.length
      ) {
        tasks.push(dispatch(fetchFreightProviders()).unwrap());
      }

      // Run all missing requests in parallel and wait once
      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }

      if (isCancelled) return;

      // Read final settled state once and map everything in a single batched commit
      const latestState = store.getState();
      const freshRecord =
        latestState.netsuite?.recordDetailsCache?.[`orders:${id}`] ||
        latestState.netsuite?.selectedRecord ||
        fetchedRecord ||
        null;

      const recordMatchesId =
        Boolean(freshRecord) &&
        (!freshRecord.id || String(freshRecord.id) === String(id));

      if (!recordMatchesId) {
        const errMsg =
          typeof latestState.netsuite?.error === "string"
            ? latestState.netsuite.error
            : "Could not retrieve the order record from NetSuite.";
        setLoadError(errMsg);
        return;
      }

      const mapped = mapNetSuiteRecordToState(
        freshRecord,
        latestState.inventory?.items || [],
        latestState.carriers?.items || [],
        latestState.carriers?.freightProviders || [],
      );

      setLoadedRecord(freshRecord);
      setOrderStatus(mapped.orderStatus);
      setAddress(mapped.address);
      setShipping(mapped.shipping);
      setNotes(mapped.notes);
      setItems(mapped.items);
      setMappedRecordId(id);
    };

    loadOrderAndDependencies();

    return () => {
      isCancelled = true;
      dispatch(clearSelectedRecord());
    };
  }, [id, reloadCount, dispatch, store]);

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
  const isTransfer = isTransferRecord(loadedRecord);
  const grandTotal = isTransfer
    ? 0
    : loadedRecord?.total || computedSubtotal;

  const mockCurrentOrder = buildMockCurrentOrder({
    record: loadedRecord,
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

  const getCreationPayload = (statusOverride) =>
    buildCobraCreationPayload({
      record: loadedRecord,
      isTransfer,
      orderStatus: statusOverride || orderStatus,
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
    if (!loadedRecord) return toast.error("No record data to process.");
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
    if (!loadedRecord) return toast.error("No record data to process.");
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

  // --- SINGLE LOADING & ERROR GATE ---
  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center min-h-[600px] px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl max-w-md w-full text-center space-y-4">
          <p className="text-xs font-black uppercase tracking-widest">
            Failed to Load NetSuite Order
          </p>
          <p className="text-xs font-medium text-red-600">{loadError}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setReloadCount((c) => c + 1)}
              className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/orders")}
              className="px-4 py-2 bg-slate-900 text-brand-gold rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isMappedForCurrentId) {
    return (
      <NetSuiteOrderLoader
        isProcessing={isProcessing}
        message="Loading NetSuite Order..."
      />
    );
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