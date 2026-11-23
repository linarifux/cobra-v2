import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { PackageCheck, Trash2, ChevronDown, Search, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { fetchInventory, fetchInventoryByLookup } from '../../store/slices/inventorySlice';

const GATEWAY_DIVISION_ID = "6a970ae2a05720738c1318ab";

const normalizeSku = (val) => String(val || '').trim().toLowerCase();

const resolveUnitCost = (invRecord, fallbackPrice) =>
  invRecord?.unitCost !== undefined && invRecord?.unitCost !== null
    ? Number(invRecord.unitCost)
    : Number(fallbackPrice || 0);

export default function ManifestPanel({ items, setItems, inventoryData = [], inventoryStatus }) {
  const dispatch = useDispatch();

  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  const [isMappingItems, setIsMappingItems] = useState(false);

  const inventoryDropdownRef = useRef(null);
  const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // --- AUTOMATED CORPORATE SKU -> COBRA INVENTORY SKU & UNIT COST MAPPING ---
  useEffect(() => {
    if (!items || items.length === 0) return;
    if (inventoryStatus === 'loading') return;

    const unmappedItems = items.filter((item) => !item.mappedViaApi);
    if (unmappedItems.length === 0) return;

    let isCancelled = false;

    const mapItemsToCobraSku = async () => {
      const apiLookupItems = [];
      const resolvedById = new Map();

      // 1. Fast local resolution against loaded inventoryData first
      for (const item of unmappedItems) {
        const lookupSku = normalizeSku(item.corporateSku || item.sku);
        const currentSku = normalizeSku(item.sku);

        // Prefer matching corporateSku within Gateway division, then any division
        const corpMatch =
          inventoryData.find(
            (inv) =>
              String(inv.division?._id || inv.division || '') === GATEWAY_DIVISION_ID &&
              normalizeSku(inv.corporateSku) !== '' &&
              normalizeSku(inv.corporateSku) === lookupSku,
          ) ||
          inventoryData.find(
            (inv) =>
              normalizeSku(inv.corporateSku) !== '' &&
              normalizeSku(inv.corporateSku) === lookupSku,
          );

        if (corpMatch) {
          resolvedById.set(item.id, {
            ...item,
            sku: corpMatch.sku || item.sku,
            corporateSku: corpMatch.corporateSku || item.corporateSku || item.sku,
            name: corpMatch.itemName || corpMatch.name || item.name,
            price: resolveUnitCost(corpMatch, item.price),
            weight: corpMatch.weight ?? item.weight,
            mappedViaApi: true,
          });
          continue;
        }

        // Already a valid COBRA inventory SKU
        const directSkuMatch = inventoryData.find(
          (inv) => normalizeSku(inv.sku) !== '' && normalizeSku(inv.sku) === currentSku,
        );

        if (directSkuMatch) {
          resolvedById.set(item.id, {
            ...item,
            sku: directSkuMatch.sku,
            corporateSku: directSkuMatch.corporateSku || item.corporateSku || '',
            price: resolveUnitCost(directSkuMatch, item.price),
            weight: directSkuMatch.weight ?? item.weight,
            mappedViaApi: true,
          });
          continue;
        }

        apiLookupItems.push(item);
      }

      // 2. Fallback to backend corporateSku lookup API in parallel for anything not in local cache
      if (apiLookupItems.length > 0) {
        setIsMappingItems(true);

        await Promise.all(
          apiLookupItems.map(async (item) => {
            const lookupKey = String(item.corporateSku || item.sku || '').trim();
            try {
              const res = await dispatch(
                fetchInventoryByLookup({
                  divisionId: GATEWAY_DIVISION_ID,
                  corporateSku: lookupKey,
                }),
              ).unwrap();

              const invRecord = res?.data || res;

              if (invRecord && (invRecord.sku || invRecord.itemName)) {
                resolvedById.set(item.id, {
                  ...item,
                  sku: invRecord.sku || item.sku,
                  corporateSku: invRecord.corporateSku || lookupKey,
                  name: invRecord.itemName || invRecord.name || item.name,
                  price: resolveUnitCost(invRecord, item.price),
                  weight: invRecord.weight ?? item.weight,
                  mappedViaApi: true,
                });
              } else {
                resolvedById.set(item.id, { ...item, mappedViaApi: true });
              }
            } catch {
              // 404 or not found — mark checked to prevent retry loops
              resolvedById.set(item.id, { ...item, mappedViaApi: true });
            }
          }),
        );
      }

      if (isCancelled) return;

      if (resolvedById.size > 0) {
        setItems((prevItems) =>
          prevItems.map((item) => resolvedById.get(item.id) || item),
        );
      }

      setIsMappingItems(false);
    };

    mapItemsToCobraSku();

    return () => {
      isCancelled = true;
    };
  }, [items, inventoryData, inventoryStatus, dispatch, setItems]);

  // --- DROPDOWN LOGIC ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(event.target)) {
        setIsInventoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableInventories = useMemo(() => {
    return inventoryData
      .map((inv) => ({
        id: inv._id,
        name: inv.itemName || inv.name || 'Unnamed Item',
        sku: inv.sku || '',
        corporateSku: inv.corporateSku || '',
        price: inv.unitCost ?? inv.price ?? 0,
        weight: inv.weight || 0,
        stock: Number(inv.available) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [inventoryData]);

  const filteredInventories = useMemo(() => {
    const query = inventorySearch.toLowerCase();
    return availableInventories.filter(
      (inv) =>
        inv.name.toLowerCase().includes(query) ||
        inv.sku.toLowerCase().includes(query) ||
        inv.corporateSku.toLowerCase().includes(query),
    );
  }, [availableInventories, inventorySearch]);

  const findInventoryMatch = (sku) => {
    const normalized = normalizeSku(sku);
    return availableInventories.find(
      (inv) =>
        normalizeSku(inv.sku) === normalized ||
        (inv.corporateSku && normalizeSku(inv.corporateSku) === normalized),
    );
  };

  const handleAddItem = () => {
    if (!newItem.name || newItem.price === undefined) {
      return toast.error("Please select an item to add.");
    }

    const qtyToAdd = Number(newItem.qty) || 1;
    const matchedStockItem = findInventoryMatch(newItem.sku);

    if (!matchedStockItem) return toast.error("Item not found in inventory.");

    const cobraSku = matchedStockItem.sku || newItem.sku;
    const draftedItem = items.find((i) => normalizeSku(i.sku) === normalizeSku(cobraSku));
    const draftedQty = draftedItem ? Number(draftedItem.qty) : 0;

    if (matchedStockItem.stock < qtyToAdd + draftedQty) {
      return toast.error(
        `Insufficient stock. Only ${matchedStockItem.stock - draftedQty} more available.`,
      );
    }

    if (draftedItem) {
      setItems(
        items.map((i) =>
          normalizeSku(i.sku) === normalizeSku(cobraSku)
            ? { ...i, qty: Number(i.qty) + qtyToAdd }
            : i,
        ),
      );
    } else {
      setItems([
        ...items,
        {
          ...newItem,
          id: generateLocalId(),
          sku: cobraSku,
          corporateSku: matchedStockItem.corporateSku || '',
          qty: qtyToAdd,
          price: Number(matchedStockItem.price ?? newItem.price ?? 0),
          weight: Number(newItem.weight || 0),
          mappedViaApi: true,
        },
      ]);
    }

    setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
    toast.success("Item drafted. Press 'Save Changes' to push updates to the database.");
  };

  const handleRemoveItem = (itemToRemove) => {
    setItems(items.filter((i) => i.id !== itemToRemove.id));
    toast.success("Item removed.");
  };

  const handleQtyChange = (item, newQtyString) => {
    const newQty = parseInt(newQtyString, 10) || 1;
    const currentQty = Number(item.qty);
    const difference = newQty - currentQty;

    if (difference === 0) return;

    const matchedStockItem = findInventoryMatch(item.sku);
    if (!matchedStockItem) return toast.error("Item not found in inventory.");

    if (difference > 0 && matchedStockItem.stock < difference) {
      return toast.error(`Insufficient stock. Only ${matchedStockItem.stock} more available.`);
    }

    setItems(items.map((i) => (i.id === item.id ? { ...i, qty: newQty } : i)));
  };

  const openDropdown = async () => {
    if (isInventoryDropdownOpen) {
      setIsInventoryDropdownOpen(false);
    } else {
      await dispatch(fetchInventory()).unwrap();
      setIsInventoryDropdownOpen(true);
    }
  };

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-30">
      <div className="flex items-center justify-between border-b border-white/60 pb-3 mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <PackageCheck size={14} /> Edit Manifest Items
        </h3>
      </div>

      {isMappingItems ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 size={36} className="text-brand-gold animate-spin" />
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-slate-700">
              Syncing Catalog...
            </p>
            <p className="text-[10px] font-medium text-slate-500 mt-1">
              Cross-referencing Corporate SKUs with COBRA database
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          {items.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl">
              No items added to this order yet.
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-slate-100 group"
            >
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
                  onChange={(e) => handleQtyChange(item, e.target.value)}
                />
              </div>
              <div className="w-20 shrink-0 text-right">
                <p className="text-xs font-black text-slate-800">
                  ${(Number(item.price || 0) * Number(item.qty || 0)).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleRemoveItem(item)}
                className="text-slate-300 hover:text-red-500 transition-colors duration-200 p-1 shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 shadow-inner space-y-3 mt-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Add Product
            </h4>

            <div className="relative w-full" ref={inventoryDropdownRef}>
              <div
                className="w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus-within:border-brand-gold shadow-sm flex items-center justify-between transition-all cursor-pointer"
                onClick={openDropdown}
              >
                <span className={newItem.name ? "text-slate-900" : "text-slate-400"}>
                  {newItem.name
                    ? `${newItem.name} (SKU: ${newItem.sku})`
                    : inventoryStatus === 'loading'
                      ? 'Syncing Catalog...'
                      : 'Select Item from Catalog...'}
                </span>
                {inventoryStatus === 'loading' ? (
                  <Loader2 size={14} className="text-brand-gold animate-spin" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </div>

              <AnimatePresence>
                {isInventoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                      <Search size={14} className="text-slate-400 shrink-0" />
                      <input
                        autoFocus
                        className="w-full text-xs outline-none font-medium text-slate-700"
                        placeholder="Search by name or SKU..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredInventories.length > 0 ? (
                        filteredInventories.map((inv) => (
                          <div
                            key={inv.id}
                            className={`px-3 py-2.5 text-xs font-medium transition-colors flex flex-col ${
                              inv.stock > 0
                                ? 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                                : 'text-slate-400 bg-slate-50 cursor-not-allowed'
                            }`}
                            onClick={() => {
                              if (inv.stock > 0) {
                                setNewItem({
                                  ...newItem,
                                  name: inv.name,
                                  sku: inv.sku,
                                  price: inv.price,
                                  weight: inv.weight,
                                });
                                setIsInventoryDropdownOpen(false);
                                setInventorySearch('');
                              }
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{inv.name}</span>
                              <span
                                className={`text-[10px] font-bold ${
                                  inv.stock > 0 ? 'text-emerald-500' : 'text-red-500'
                                }`}
                              >
                                {inv.stock} in stock
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px]">
                              SKU: {inv.sku} {inv.corporateSku && `| NS: ${inv.corporateSku}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-400 text-center">No items found</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="w-20 bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 text-center outline-none focus:border-brand-gold shadow-sm"
                value={newItem.qty}
                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
              />
              <div className="flex-1 bg-slate-100 p-2.5 rounded-lg text-xs font-black border border-slate-200 flex items-center justify-end text-slate-400 shadow-inner cursor-not-allowed">
                {newItem.price ? `$${Number(newItem.price).toFixed(2)}` : '$0.00'}
              </div>
              <button
                onClick={handleAddItem}
                className="bg-slate-900 text-white px-4 rounded-lg hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}