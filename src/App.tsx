// App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './components/authpage';
import Dashboard from './components/assetmanagement/Dashboard';
import AssetManagement  from './components/assetmanagement/AssetManagement';
import Trial from './components/trial';
import QRCodeGenerator from './components/assetmanagement/qrcodegenerator';
import WebQRScanner from './components/assetmanagement/qrscanner';
import ProfilePage from './components/assetmanagement/ProfilePage';
import Reports from './components/assetmanagement/Reports';
import ReportsAnalytics from './components/assetmanagement/ReportsAnalytics';
import AssetHistory from './components/assetmanagement/AssetHistory';
import PersonnelDashboard from './components/assetmanagement/PersonnelDashboard';
import People from './components/assetmanagement/People';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assets" element={<AssetManagement />} />
          <Route path="/trial" element={<Trial />} />
          <Route path="/generate-qr" element={<QRCodeGenerator />} />
          <Route path="/scan-qr" element={<WebQRScanner />} />
          <Route path="/profile" element={<ProfilePage />} />s
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports-analytics" element={<ReportsAnalytics />} />
          <Route path="/personnel" element={<PersonnelDashboard/>} />
          <Route path="/history" element={<AssetHistory/>} />
           <Route path="/people" element={<People/>} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
