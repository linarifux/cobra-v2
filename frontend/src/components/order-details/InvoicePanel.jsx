import React from 'react';
import { CreditCard, Scale, Database } from 'lucide-react';

export default function InvoicePanel({
  currentOrder,
  shipping,
  setShipping,
  processingFeesPreview,
  liveWeightOz,
}) {
  // Operational weight (uses live weight when provided, otherwise falls back to order record)
  const weightOz = Number(
    liveWeightOz ?? currentOrder?.shippingDetails?.totalWeightOunces ?? 0,
  );
  const displayLbs = (weightOz / 16).toFixed(2);

  const manualAdjustmentOz = Number(
    currentOrder?.shippingDetails?.manuallyAdjustedWeightOunces || 0,
  );

  // Items subtotal (handles both COBRA DB items and NetSuite staged items)
  const calculatedItemsSubtotal = (currentOrder?.items || []).reduce(
    (acc, item) =>
      acc +
      Number(item.unitPrice ?? item.price ?? 0) *
        Number(item.quantity ?? item.qty ?? 0),
    0,
  );

  const subtotal = Number(currentOrder?.subtotal ?? calculatedItemsSubtotal) || 0;

  // Processing fees (live preview takes priority when passed)
  const processingFees =
    Number(
      processingFeesPreview?.totalProcessingFee ??
        currentOrder?.processingFees?.totalProcessingFee ??
        0,
    ) || 0;

  // Shipping cost (live input value takes priority over stored record)
  const rawShippingInput =
    shipping?.shippingCost ?? currentOrder?.shippingDetails?.shippingCost ?? 0;
  const shippingCost = Number(rawShippingInput) || 0;

  // Only include & show tax if explicitly stored on the order
  const tax = Number(currentOrder?.tax || 0) || 0;

  // Exact sum of displayed amounts
  const grandTotal = Number(
    (subtotal + processingFees + shippingCost + tax).toFixed(2),
  );

  const renderAdjustmentBadge = () => {
    if (!manualAdjustmentOz) return null;
    const isPositive = manualAdjustmentOz > 0;
    const absOz = Math.abs(manualAdjustmentOz);
    const lbs = Math.floor(absOz / 16);
    const oz = Math.round(absOz % 16);

    let text = isPositive ? '+' : '-';
    if (lbs > 0) text += `${lbs}lb `;
    text += `${oz}oz`;

    return (
      <span
        className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mt-1 w-max ${
          isPositive
            ? 'bg-amber-500/20 text-amber-500'
            : 'bg-blue-500/20 text-blue-500'
        }`}
      >
        {text} adj.
      </span>
    );
  };

  return (
    <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-900 relative z-10 overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 relative z-10">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <CreditCard size={14} /> Invoice Summary
        </h3>
        <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <Database size={10} /> Live Data
        </span>
      </div>

      <div className="text-sm font-medium space-y-3 relative z-10 text-slate-300">
        {/* Live Operational Weight + Adjustment Badge */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5">
              <Scale size={14} className="text-slate-400" /> Op. Weight
            </span>
            {renderAdjustmentBadge()}
          </div>
          <span className="font-mono text-white text-xs mt-0.5">
            {displayLbs} LBS
          </span>
        </div>

        <div className="flex justify-between">
          <span>Items Subtotal</span>
          <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Processing Fees</span>
          <span className="font-mono text-white">
            ${processingFees.toFixed(2)}
          </span>
        </div>

        {tax > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span className="font-mono text-white">${tax.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>Shipping Cost</span>
          <div
            className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-white/5 w-24 transition-colors focus-within:border-brand-gold/50 focus-within:bg-white/10"
            title="Updates total immediately and persists on save"
          >
            <span className="px-2 text-xs text-slate-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full bg-transparent text-white font-mono outline-none py-1 text-right pr-2 text-sm"
              value={shipping?.shippingCost ?? ''}
              onChange={(e) =>
                setShipping({
                  ...shipping,
                  shippingCost: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-between border-t pt-4 mt-2 border-white/10 text-white items-end">
          <span className="text-xs uppercase tracking-widest font-black text-slate-400">
            Total Charged
          </span>
          <span className="font-mono text-3xl font-black text-brand-gold tracking-tight">
            ${grandTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}