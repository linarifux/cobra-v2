import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// 1. IMPORT SONNER TOASTER
import { Toaster } from 'sonner';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import AdminLoginPage from './pages/auth/AdminLoginPage';

// Dashboard Pages
import DashboardHome from './pages/DashboardHome';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailsPage from './pages/CustomerDetailsPage';
import EditCustomerDetailsPage from './pages/EditCustomerDetailsPage';
import DivisionsPage from './pages/DivisionsPage';
import InventoryPage from './pages/InventoryPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import CategoryPage from './pages/CategoryPage';
import ReceivingOrders from './pages/ReceivingOrders';
import ReceivingOrderDetail from './pages/ReceivingOrderDetail';
import WarehouseLocations from './pages/WarehouseLocations';
import AdminUsersPage from './pages/AdminUsersPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// IMPORT THE GLOBAL CONFIRM PROVIDER
import { ConfirmProvider } from './providers/ConfirmProvider';
import DivisionDetail from './pages/DivisionDetail';

/**
 * ProtectedRoute Wrapper
 * Checks the Redux auth state. If the user doesn't have a valid session, 
 * it securely redirects them to the login page.
 */
const ProtectedRoute = ({ children }) => {
  const authState = useSelector((state) => state.auth);
  const isAuthenticated = authState?.isAuthenticated;
  
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default function App() {
  return (
    <>
      {/* 2. CONFIGURE GLOBAL TOASTER THEME */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          classNames: {
            // Base styling mirroring your glassmorphic panels
            toast: 'group bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[1.5rem] p-4 font-sans',
            title: 'text-sm font-black text-slate-900',
            description: 'text-xs font-bold text-slate-500',
            
            // Specific state overrides
            error: 'group bg-red-50/90 border border-red-200 text-red-800',
            success: 'group bg-emerald-50/90 border border-emerald-200 text-emerald-800',
            warning: 'group bg-amber-50/90 border border-amber-200 text-amber-800',
            info: 'group bg-slate-900 border border-slate-800 text-brand-gold',
          },
        }}
      />

      <ConfirmProvider>
        <Router>
          <Routes>
            
            {/* PUBLIC AUTH ROUTES */}
            <Route path="/login" element={<AdminLoginPage />} />
            
            {/* PROTECTED DASHBOARD ROUTES */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                   <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Default Dashboard Route */}
              <Route index element={<DashboardHome />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:customerId/divisions" element={<DivisionsPage />} />
              <Route path="/customers/:id/edit" element={<EditCustomerDetailsPage />} />
              
              {/* Division Routes */}
              {/* <Route path="/divisions" element={<DivisionsPage />} /> */}
              {/* FIX: Ensure param matches the component's expected useParam hook and pass as a JSX element */}
              <Route path="/divisions/:divisionId" element={<DivisionDetail />} />
              
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/:inventoryId" element={<InventoryDetailPage />} />
              <Route path="/categories" element={<CategoryPage />} />
              <Route path="/receiving" element={<ReceivingOrders />} />
              <Route path="/receiving/:id" element={<ReceivingOrderDetail />} />
              <Route path="/locations" element={<WarehouseLocations />} />
              <Route path="/shipping" element={<div className="p-6">ShipStation Integration Module</div>} />
              <Route path="/staff" element={<AdminUsersPage />} />
              <Route path="/settings" element={<AccountSettingsPage />} />

              {/* Catch-all 404 for undefined routes INSIDE the dashboard */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Global Catch-all 404 for completely undefined root URLs */}
            <Route path="*" element={<NotFoundPage />} />

          </Routes>
        </Router>
      </ConfirmProvider>
    </>
  );
}