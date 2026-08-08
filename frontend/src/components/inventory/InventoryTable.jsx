import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit,
  Trash2,
  ExternalLink,
  Package,
  Tag,
  User,
  DollarSign,
} from "lucide-react";

export default function InventoryTable({
  filteredInventory,
  apiInventory,
  onEditClick,
  onDeleteClick,
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/20 border-b border-white/40">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Item Code
              </th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Description
              </th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Customer/Division
              </th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Price
              </th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Stock
              </th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40 text-xs font-bold">
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => {
                const isLowStock = item.available <= item.minThreshold;
                const rawItem = apiInventory.find((i) => i._id === item.id);

                return (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/inventory/${item.id}`)}
                    className="hover:bg-white/60 transition-colors group cursor-pointer"
                  >
                    <td className="p-4 font-mono font-black text-slate-900 tracking-wider text-[13px]">
                      <span className="bg-white/60 border border-slate-200/60 group-hover:bg-brand-gold group-hover:border-brand-gold group-hover:text-white transition-all px-2 py-0.5 rounded-md flex items-center gap-1 w-max shadow-sm">
                        {item.code}{" "}
                        <ExternalLink
                          size={10}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </span>
                    </td>

                    <td className="p-4 max-w-[300px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/60 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-400 shadow-sm overflow-hidden">
                          {rawItem?.productImage ? (
                            <img
                              src={rawItem.productImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={16} />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-slate-900 text-[13px] font-black truncate group-hover:text-brand-gold transition-colors">
                            {item?.desc}
                          </p>
                          <p className="text-slate-900 text-[13px] font-black truncate group-hover:text-brand-gold transition-colors">
                            {item?.desc2}
                          </p>

                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-white/60 border border-slate-200/60 text-slate-600 font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-md">
                            <Tag size={10} className="text-slate-400" />{" "}
                            {item?.category && `${item.category}`}
                            {item?.category2 && ` / ${item.category2}`}
                            {item?.category3 && ` / ${item.category3}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-slate-700 flex items-center gap-1.5 text-[12px] font-bold">
                        <User size={12} className="text-brand-gold shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {item?.customer}
                        </span>
                        -
                        <br />
                        <span>{item?.division}</span>
                      </div>
                    </td>

                    <td className="p-4 text-slate-900 font-mono text-[13px] font-black">
                      <span className="flex items-center gap-1">
                        <DollarSign
                          size={12}
                          className="text-slate-400 -mr-0.8 mt-0.5"
                        />
                        {item?.price?.toFixed(2)}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="space-y-1 text-center">
                          <span
                            className={`inline-block min-w-[42px] px-2 py-0.5 rounded-md text-[11px] font-mono font-black border ${isLowStock ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200/60"}`}
                          >
                            {item?.available}
                          </span>
                          <span className="block text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                            Avail
                          </span>
                        </div>
                        {item.onOrder > 0 && (
                          <div className="space-y-1 border-l border-white/60 pl-3 text-center">
                            <span className="block text-[11px] text-blue-600 font-mono font-black">
                              +{item?.onOrder}
                            </span>
                            <span className="block text-[9px] font-bold tracking-wider text-blue-400 uppercase">
                              Inbound
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditClick(item?.id)}
                          className="p-2 text-slate-400 hover:text-brand-gold bg-white/40 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteClick(item?.id)}
                          className="p-2 text-slate-400 hover:text-red-500 bg-white/40 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm border border-transparent"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="p-12 text-center font-bold text-slate-500 text-sm bg-white/10"
                >
                  No active stock parameters matching your exact query criteria
                  could be indexed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
