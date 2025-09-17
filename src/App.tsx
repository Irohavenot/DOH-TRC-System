// App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './components/authpage';
import Dashboard from './components/assetmanagement/Dashboard';
import AssetManagement  from './components/assetmanagement/AssetManagement';
import QRCodeGenerator from './components/assetmanagement/qrcodegenerator';
import WebQRScanner from './components/assetmanagement/qrscanner';
import ProfilePage from './components/assetmanagement/ProfilePage';
import Reports from './components/assetmanagement/Reports';
import ReportsAnalytics from './components/assetmanagement/ReportsAnalytics';
import AssetHistory from './components/assetmanagement/AssetHistory';
import PersonnelDashboard from './components/assetmanagement/PersonnelDashboard';
import People from './components/assetmanagement/People';
import ScanQR from './components/assetmanagement/ScanQr';
import RequestConsumable from './components/assetmanagement/RequestConsumable';
import Requests from './components/assetmanagement/Requests';
import DashboardSuperAdmin from './components/superadmin/DashboardSuperAdmin';
import Profile from './components/superadmin/Profile';
import Supply from './components/superadmin/Supply';
import ClinicalLab from './components/superadmin/ClinicalLab';
import Radiology from './components/superadmin/Radiology';
import Dental from './components/superadmin/Dental';
import DDE from './components/superadmin/DDE';
import Notifications from './components/superadmin/Notifications';
import {ToastContainer} from 'react-toastify';
import VerifyAccount from "./components/Verification";
import Trial from './components/superadmin/trial';
import RequireAuth from "./components/RequireAuth";


import 'react-toastify/dist/ReactToastify.css';
const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/" element={<AuthPage />} />
          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* If you want QR to deep-link to a specific asset: */}
            {/* <Route path="/dashboard/:assetId" element={<AssetDetails />} /> */}

            <Route path="/assets" element={<AssetManagement />} />
            <Route path="/generate-qr" element={<QRCodeGenerator />} />
            <Route path="/scan-qr" element={<WebQRScanner />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports-analytics" element={<ReportsAnalytics />} />
            <Route path="/personnel" element={<PersonnelDashboard/>} />
            <Route path="/history" element={<AssetHistory/>} />
            <Route path="/people" element={<People/>} />
            <Route path="/qrscan" element={<ScanQR/>} />
            <Route path="/dashadmin" element={<DashboardSuperAdmin />} />
            <Route path="/profiled" element={<Profile />} /> 
            <Route path="/supply" element={<Supply />} />  
            <Route path="/clinical" element={<ClinicalLab />} /> 
            <Route path="/radiology" element={<Radiology />} /> 
            <Route path="/dental" element={<Dental />} /> 
            <Route path="/dde" element={<DDE />} /> 
            <Route path="/notif" element={<Notifications />} /> 
            <Route path="/request-consumable" element={<RequestConsumable />} /> 
            <Route path="/requestsdata" element={<Requests />} /> 
            <Route path="/trial" element={<Trial />} /> 
          </Route>
        </Routes>
        <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} />
      </div>
    </Router>
  );
};

export default App;
