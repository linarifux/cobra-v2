import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

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
import CarrierManagement from './pages/CarrierManagement';
import AdminUsersPage from './pages/AdminUsersPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// 1. IMPORT THE GLOBAL CONFIRM PROVIDER
import { ConfirmProvider } from './providers/ConfirmProvider';

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
    // 2. WRAP THE ROUTER IN THE CONFIRM PROVIDER
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
            <Route path="/customers/:id" element={<CustomerDetailsPage />} />
            <Route path="/customers/:id/edit" element={<EditCustomerDetailsPage />} />
            <Route path="/divisions" element={<DivisionsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/:inventoryId" element={<InventoryDetailPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/receiving" element={<ReceivingOrders />} />
            <Route path="/receiving/:id" element={<ReceivingOrderDetail />} />
            <Route path="/locations" element={<WarehouseLocations />} />
            <Route path="/carriers" element={<CarrierManagement />} />
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
  );
}