import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout/Layout';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { ConsumerDashboardPage } from './pages/consumer/ConsumerDashboardPage';
import { ConsumerVoicePage } from './pages/consumer/ConsumerVoicePage';
import { ConsumerMatchesPage } from './pages/consumer/ConsumerMatchesPage';
import { ConsumerCallPage } from './pages/consumer/ConsumerCallPage';
import { ConsumerOrderPage } from './pages/consumer/ConsumerOrderPage';
import { ConsumerStoragePage } from './pages/consumer/ConsumerStoragePage';
import { ConsumerLogisticsPage } from './pages/consumer/ConsumerLogisticsPage';
import { ConsumerTrackingPage } from './pages/consumer/ConsumerTrackingPage';
import { ConsumerImpactPage } from './pages/consumer/ConsumerImpactPage';

import { FarmerDashboardPage } from './pages/farmer/FarmerDashboardPage';
import { FarmerVoicePage } from './pages/farmer/FarmerVoicePage';
import { FarmerBuyersPage } from './pages/farmer/FarmerBuyersPage';
import { FarmerConnectionPage } from './pages/farmer/FarmerConnectionPage';
import { FarmerOrderPage } from './pages/farmer/FarmerOrderPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <DemoProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />

              {/* Authentication & Gov-Enabled Kisan Portal */}
              <Route path="login" element={<LoginPage />} />
              <Route path="auth" element={<LoginPage />} />

              {/* Consumer Routes */}
            <Route path="consumer" element={<ConsumerDashboardPage />} />
            <Route path="consumer/voice" element={<ConsumerVoicePage />} />
            <Route path="consumer/matches" element={<ConsumerMatchesPage />} />
            <Route path="consumer/call" element={<ConsumerCallPage />} />
            <Route path="consumer/order" element={<ConsumerOrderPage />} />
            <Route path="consumer/storage" element={<ConsumerStoragePage />} />
            <Route path="consumer/logistics" element={<ConsumerLogisticsPage />} />
            <Route path="consumer/tracking" element={<ConsumerTrackingPage />} />
            <Route path="consumer/impact" element={<ConsumerImpactPage />} />

            {/* Farmer Routes */}
            <Route path="farmer" element={<FarmerDashboardPage />} />
            <Route path="farmer/voice" element={<FarmerVoicePage />} />
            <Route path="farmer/buyers" element={<FarmerBuyersPage />} />
            <Route path="farmer/connection" element={<FarmerConnectionPage />} />
            <Route path="farmer/order" element={<FarmerOrderPage />} />

            {/* Buyer Marketplace — product details (isolated via productService) */}
            <Route path="product/:id" element={<ProductDetailsPage />} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </DemoProvider>
  );
};

export default App;
