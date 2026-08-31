import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Users, Mail, Building2, Briefcase, Edit2, Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { fetchOrdersByUser } from '../../store/slices/orderSlice';

// Isolated sub-component to fetch and calculate monthly orders per user safely
const MonthlyOrderCount = ({ userId }) => {
  const dispatch = useDispatch();
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchOrders = async () => {
      try {
        const orders = await dispatch(fetchOrdersByUser(userId)).unwrap();
        
        // Calculate orders placed in the current month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt || order.date);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });

        if (isMounted) {
          setCount(monthlyOrders.length);
        }
      } catch (error) {
        // Fallback for permission errors or network issues
        if (isMounted) setCount('-');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [dispatch, userId]);

  if (loading) {
    return <Loader2 size={14} className="animate-spin text-slate-300 mt-1" />;
  }
  
  return (
    <div className="flex items-center gap-1.5 font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg w-max shadow-sm">
      <ShoppingCart size={12} className="text-brand-gold" />
      {count}
    </div>
  );
};

export default function UserTable({
  status,
  filteredUsers,
  activeTab,
  divisions,
  canManageUsers,
  isSuperAdmin,
  currentUser,
  handleOpenEditModal,
  handleDeleteUser
}) {

  const renderRoleBadge = (role) => {
    const formatRole = (r) => r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    switch(role) {
      case 'super_admin': return <span className="bg-brand-gold/20 text-yellow-800 border border-brand-gold/30 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{formatRole(role)}</span>;
      case 'admin': return <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{formatRole(role)}</span>;
      case 'super_user': return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{formatRole(role)}</span>;
      case 'manager': return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{formatRole(role)}</span>;
      default: return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm tracking-wide">{formatRole(role)}</span>;
    }
  };

  if (status === 'loading' && filteredUsers.length === 0) {
    return (
      <div className="flex justify-center py-32 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] uppercase tracking-widest text-slate-500 font-black">
            <tr>
              <th className="px-6 py-4">User Details</th>
              {activeTab === 'order' && <th className="px-6 py-4">Assigned Client / Divisions</th>}
              {activeTab === 'order' && <th className="px-6 py-4">Charge Code</th>}
              <th className="px-6 py-4">Monthly Orders</th>
              <th className="px-6 py-4">Security Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
              
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                   <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Users size={32} className="opacity-50" />
                      <p className="font-bold text-sm">No users found matching your filters.</p>
                   </div>
                </td>
              </tr>
            ) : filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-white transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-lg border shadow-sm ${
                      activeTab === 'admin' ? 'bg-slate-900 text-brand-gold border-slate-800' : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{user.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold mt-1">
                        <Mail size={12} /> {user.email}
                      </div>
                    </div>
                  </div>
                </td>

                {activeTab === 'order' && (
                  <td className="px-6 py-4 align-top whitespace-normal min-w-[250px]">
                    {user.customer ? (
                      <div>
                        <p className="font-bold text-slate-800 mb-2 text-xs flex items-center gap-1.5">
                          <Building2 size={12} className="text-slate-400"/>
                          {typeof user.customer === 'object' ? user.customer.customerName : 'Client ID: ' + user.customer}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {user.divisions && user.divisions.length > 0 ? (
                            user.divisions.map((d, idx) => {
                              const divId = typeof d === 'object' ? d._id : d;
                              const foundDiv = divisions.find(globalDiv => globalDiv._id === divId);
                              const divName = foundDiv ? (foundDiv.divisionName || foundDiv.name || foundDiv.divisionCode) : 'Unknown Division';
                              
                              return (
                                <span key={idx} className="text-[9px] uppercase font-bold text-slate-600 bg-white border border-slate-200 shadow-sm px-2 py-0.5 rounded-md tracking-wider">
                                  {divName}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 px-2 py-0.5 rounded tracking-wider italic">
                              No Divisions Assigned
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">Orphaned User</span>
                    )}
                  </td>
                )}

                {activeTab === 'order' && (
                  <td className="px-6 py-4 align-top">
                    {user.chargeCode ? (
                       <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-sm">
                          <Briefcase size={12} className="text-slate-400"/> {user.chargeCode}
                       </div>
                    ) : (
                       <span className="text-xs text-slate-400 font-medium italic">Not Set</span>
                    )}
                  </td>
                )}

                {/* NEW MONTHLY ORDERS COLUMN */}
                <td className="px-6 py-4 align-top pt-4">
                  <MonthlyOrderCount userId={user._id} />
                </td>

                <td className="px-6 py-4 align-top pt-4">
                  {renderRoleBadge(user.role)}
                </td>

                <td className="px-6 py-4 text-right align-top pt-4">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManageUsers && (
                      <button 
                        onClick={() => handleOpenEditModal(user)}
                        className="p-2 text-slate-400 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 hover:text-brand-gold rounded-xl transition-all"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    
                    {isSuperAdmin && user._id !== currentUser?._id && (
                      <button 
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        className="p-2 text-slate-400 hover:bg-red-50 border border-transparent hover:border-red-100 hover:text-red-600 rounded-xl transition-all"
                        title="Revoke Access"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}