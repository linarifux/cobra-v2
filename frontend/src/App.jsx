import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import CustomersPage from './pages/CustomersPage';
import VendorDetailsPage from './pages/VendorDetailsPage';
import EditVendorDetailsPage from './pages/EditVendorDetailsPage';
import DivisionsPage from './pages/DivisionsPage';
import InventoryPage from './pages/InventoryPage';
import CategoryPage from './pages/CategoryPage';
import ReceivingOrders from './pages/ReceivingOrders';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* The Layout acts as the parent wrapper for all dashboard routes */}
        <Route path="/" element={<DashboardLayout />}>

          {/* Default view when navigating to "/" */}
          <Route index element={<DashboardHome />} />

          {/* Feature Modules */}
          <Route path="orders">
            <Route index element={<OrdersPage />} />
            <Route path=":id" element={<OrderDetailsPage />} />
          </Route>
          
          <Route path="customers">
            <Route index element={<CustomersPage />} />
            <Route path=":id" element={<VendorDetailsPage />} />
            <Route path=":id/edit" element={<EditVendorDetailsPage />} />
          </Route>
          
          <Route path="/divisions" element={<DivisionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/receiving-orders" element={<ReceivingOrders />} />
          <Route path="shipping" element={<div className="p-6">ShipStation Integration Module</div>} />
          <Route path="settings" element={<div className="p-6">Platform Settings</div>} />

        </Route>
      </Routes>
    </Router>
  );
}