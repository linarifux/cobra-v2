import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, useStore } from "react-redux";
import { toast } from "sonner";

// slices
import {
  fetchNetSuiteRecordById,
  clearSelectedRecord,
  invalidateNetSuiteCache,
} from "../store/slices/netSuiteSlice";
import {
  createOrder,
  updateOrder,
  fetchOrders,
} from "../store/slices/orderSlice";
import {
  fetchInventory,
  fetchInventoryByLookup,
} from "../store/slices/inventorySlice";
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
import LifecycleTimestampsPanel, {
  formatDisplayDateTime,
} from "../components/division-detail/LifecycleTimestampsPanel";

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

const VALID_COBRA_STATUSES = [
  "New",
  "Pending",
  "Picked",
  "Shipped",
  "Hold",
  "Cancelled",
  "Delivered",
  "Billed",
];

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
  const [packages, setPackages] = useState(() => [createInitialPackage()]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Lifecycle Timestamp States ---
  const [shipmentCreatedAt, setShipmentCreatedAt] = useState("");
  const [shippedAt, setShippedAt] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [cancelledAt, setCancelledAt] = useState("");

  const isMappedForCurrentId =
    Boolean(id) &&
    String(mappedRecordId) === String(id) &&
    Boolean(loadedRecord);

  // --- SINGLE COORDINATED PARALLEL FETCH (ALWAYS FRESH) + COBRA SKU & UNIT COST MAP ---
  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    const loadOrderAndDependencies = async () => {
      setLoadError(null);
      setMappedRecordId(null);
      setShipmentCreatedAt("");
      setShippedAt("");
      setDeliveredAt("");
      setCancelledAt("");

      let fetchedRecord = null;

      // Fetch latest data for all dependencies in parallel within one loading cycle
      await Promise.allSettled([
        dispatch(
          fetchNetSuiteRecordById({
            recordType: "orders",
            id,
            forceRefresh: true,
          }),
        )
          .unwrap()
          .then((res) => {
            fetchedRecord = res?.data || res?.record || res;
          }),
        dispatch(fetchInventory()).unwrap(),
        dispatch(
          fetchProcessingChargesByCustomer(GATEWAY_CUSTOMER_ID),
        ).unwrap(),
        dispatch(fetchCarriers(GATEWAY_DIVISION_ID)).unwrap(),
        dispatch(fetchFreightProviders()).unwrap(),
      ]);

      if (isCancelled) return;

      // Prefer the freshly returned record, falling back to latest Redux store state
      const latestState = store.getState();
      const freshRecord =
        fetchedRecord ||
        latestState.netsuite?.selectedRecord ||
        latestState.netsuite?.recordDetailsCache?.[`orders:${id}`] ||
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

      const inventoryList = latestState.inventory?.items || [];
      const isFreshTransfer = isTransferRecord(freshRecord);

      const mapped = mapNetSuiteRecordToState(
        freshRecord,
        inventoryList,
        latestState.carriers?.items || [],
        latestState.carriers?.freightProviders || [],
      );

      // Resolve COBRA SKU, name, weight, and unitCost before first render
      const resolvedItems = await Promise.all(
        mapped.items.map(async (item) => {
          if (item.mappedViaApi) {
            const localMatch = inventoryList.find(
              (inv) =>
                String(inv.sku || "").trim().toLowerCase() ===
                String(item.sku || "").trim().toLowerCase(),
            );

            if (
              localMatch &&
              localMatch.unitCost !== undefined &&
              localMatch.unitCost !== null
            ) {
              return {
                ...item,
                price: isFreshTransfer ? 0 : Number(localMatch.unitCost),
              };
            }

            return item;
          }

          const lookupSku = String(item.corporateSku || item.sku || "").trim();
          try {
            const res = await dispatch(
              fetchInventoryByLookup({
                divisionId: GATEWAY_DIVISION_ID,
                corporateSku: lookupSku,
              }),
            ).unwrap();

            const invRecord = res?.data || res;
            if (invRecord && (invRecord.sku || invRecord.itemName)) {
              const resolvedUnitCost =
                invRecord.unitCost !== undefined && invRecord.unitCost !== null
                  ? Number(invRecord.unitCost)
                  : item.price;

              return {
                ...item,
                sku: invRecord.sku || item.sku,
                corporateSku: invRecord.corporateSku || lookupSku,
                name: invRecord.itemName || invRecord.name || item.name,
                price: isFreshTransfer ? 0 : resolvedUnitCost,
                weight: invRecord.weight ?? item.weight,
                mappedViaApi: true,
              };
            }
          } catch {
            // Keep NetSuite fallback if not registered in COBRA inventory
          }

          return { ...item, mappedViaApi: true };
        }),
      );

      if (isCancelled) return;

      const mappedItemsWeightOz = resolvedItems.reduce(
        (acc, item) => acc + Number(item.weight || 0) * Number(item.qty || 0),
        0,
      );

      setLoadedRecord(freshRecord);
      setOrderStatus(mapped.orderStatus);
      setAddress(mapped.address);
      // Do not import NetSuite shipping rate — stays $0 until ShipStation label is generated
      setShipping({ ...mapped.shipping, shippingCost: 0 });
      setNotes(mapped.notes);
      setItems(resolvedItems);
      setPackages([
        {
          ...createInitialPackage(),
          weightInOunces:
            mappedItemsWeightOz > 0
              ? Number(mappedItemsWeightOz.toFixed(2))
              : 0,
        },
      ]);
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
    (acc, item) => acc + Number(item.weight || 0) * Number(item.qty || 0),
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

  const isTransfer = isTransferRecord(loadedRecord);
  const computedSubtotal = isTransfer
    ? 0
    : items.reduce(
        (acc, item) => acc + Number(item.qty || 0) * Number(item.price || 0),
        0,
      );

  // Shipping is strictly $0 on COBRA until ShipStation returns the rate upon label creation
  const shippingWithZeroCost = { ...shipping, shippingCost: 0 };
  const grandTotal = Number(
    (
      computedSubtotal +
      Number(processingFeesPreview.totalProcessingFee || 0)
    ).toFixed(2),
  );

  const mockCurrentOrder = buildMockCurrentOrder({
    record: loadedRecord,
    isTransfer,
    orderStatus,
    address,
    shipping: shippingWithZeroCost,
    cartoonsCount,
    palletsCount,
    finalPayloadWeightOz,
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

  const buildLifecycleTimestampPayload = (overrides = {}) => {
    const entries = [
      ["shipmentCreatedAt", shipmentCreatedAt],
      ["shippedAt", shippedAt],
      ["deliveredAt", deliveredAt],
      ["cancelledAt", cancelledAt],
    ];

    const timestamps = {};
    for (const [key, localVal] of entries) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        timestamps[key] = overrides[key];
      } else if (localVal) {
        timestamps[key] = new Date(localVal).toISOString();
      }
    }
    return timestamps;
  };

  const getCreationPayload = (statusOverride, timestampOverrides = {}) => ({
    ...buildCobraCreationPayload({
      record: loadedRecord,
      isTransfer,
      orderStatus: statusOverride || orderStatus,
      isRushOrder,
      notes,
      address,
      shipping: shippingWithZeroCost,
      cartoonsCount,
      palletsCount,
      packages,
      finalPayloadWeightOz,
      items,
      computedSubtotal,
      grandTotal,
      processingFeesPreview,
    }),
    ...buildLifecycleTimestampPayload(timestampOverrides),
  });

  const handleSaveOrderOnly = async () => {
    if (!loadedRecord) return toast.error("No record data to process.");
    if (!validateShippingSelection()) return;

    if (!VALID_COBRA_STATUSES.includes(orderStatus)) {
      return toast.error("Select a COBRA Status Before Saving", {
        description: `"${orderStatus}" is a NetSuite status. Please select a COBRA status (e.g., New, Picked, Hold) before saving.`,
      });
    }

    setIsProcessing(true);
    try {
      const actionPromise = dispatch(createOrder(getCreationPayload())).unwrap();

      toast.promise(actionPromise, {
        loading: "Saving to COBRA Database...",
        success: "Successfully stored in database!",
        error: "Failed to save order.",
      });

      const newCobraOrder = await actionPromise;
      dispatch(invalidateNetSuiteCache());
      dispatch(fetchOrders({}));
      navigate(`/orders/${newCobraOrder._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintDocsAndPick = async () => {
    if (!loadedRecord) return toast.error("No record data to process.");
    if (!validateShippingSelection()) return;

    setIsProcessing(true);
    let newCobraOrder;

    try {
      // COBRA DB only — NetSuite fulfillment sync triggers automatically upon ShipStation label creation
      const pickedAtIso = shipmentCreatedAt
        ? new Date(shipmentCreatedAt).toISOString()
        : new Date().toISOString();

      const actionPromise = (async () => {
        let created = await dispatch(
          createOrder(
            getCreationPayload("Picked", { shipmentCreatedAt: pickedAtIso }),
          ),
        ).unwrap();

        // Safeguard if POST /orders defaults initial status to "New"
        if (created?._id && created.status !== "Picked") {
          created = await dispatch(
            updateOrder({
              id: created._id,
              updateData: {
                status: "Picked",
                shipmentCreatedAt: pickedAtIso,
              },
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
      dispatch(invalidateNetSuiteCache());
      dispatch(fetchOrders({}));
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
        shipping: shippingWithZeroCost,
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

  const creationDate = mockCurrentOrder.createdAt
    ? formatDisplayDateTime(mockCurrentOrder.createdAt)
    : "Unknown Date";

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
        isSyncingNetSuite={false}
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
            creationDate={creationDate}
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
              shipping={shippingWithZeroCost}
              setShipping={(nextShipping) =>
                setShipping({ ...nextShipping, shippingCost: 0 })
              }
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

          <LifecycleTimestampsPanel
            createdAt={mockCurrentOrder.createdAt}
            shipmentCreatedAt={shipmentCreatedAt}
            setShipmentCreatedAt={setShipmentCreatedAt}
            shippedAt={shippedAt}
            setShippedAt={setShippedAt}
            deliveredAt={deliveredAt}
            setDeliveredAt={setDeliveredAt}
            cancelledAt={cancelledAt}
            setCancelledAt={setCancelledAt}
            isSaving={isProcessing}
          />

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
            shipping={shippingWithZeroCost}
            setShipping={setShipping}
            processingFeesPreview={processingFeesPreview}
            liveWeightOz={finalPayloadWeightOz}
            isLabelPurchased={false}
          />
        </div>
      </div>
    </div>
  );
}
