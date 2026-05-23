import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import OrdersPage from './pages/OrdersPage'; // Import the new page
import OrderDetailsPage from './pages/OrderDetailsPage';

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
          <Route path="imports" element={<div className="p-6">Google Sheets Importer Module</div>} />
          <Route path="shipping" element={<div className="p-6">ShipStation Integration Module</div>} />
          <Route path="settings" element={<div className="p-6">Platform Settings</div>} />

        </Route>
      </Routes>
    </Router>
  );
}