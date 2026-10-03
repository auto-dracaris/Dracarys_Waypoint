import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/login"; // Path based on your structure[cite: 8]
import { DashboardLayout } from "./layouts/store-manager/dashboard-layout";
import { DashboardOverviewPage } from "./pages/store-manager/dashboard-overview"; // Your main dashboard view
import { DeliveryTrackingPage } from "./pages/store-manager/delivery-tracking"; // Path based on your structure[cite: 8]
import { PlaceOrderPage } from "./pages/store-manager/place-order";
import { DeliveriesPage } from "./pages/store-manager/deliveries";
import { OrdersPage } from "./pages/store-manager/orders";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Private Layout Routes */}
        <Route path="/" element={<DashboardLayout />}>
          {/* Index renders the My Deliveries overview */}
          <Route index element={<DashboardOverviewPage />} />

          {/* Dynamic route for specific deliveries */}
          <Route path="delivery/:id" element={<DeliveryTrackingPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/create" element={<PlaceOrderPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
