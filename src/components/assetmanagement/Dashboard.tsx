import React, { useEffect, useState } from 'react';
import "../../assets/dashboard.css";
import "../../assets/notification.css";
import WebQRScanner from "./qrscanner";
import QRCodeGenerator from "./qrcodegenerator";
import ProfilePage from "./ProfilePage";
import Reports from "./Reports";
import ReportsAnalytics from "./ReportsAnalytics";
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import AssetManagement from './AssetManagement';
import { Package } from 'lucide-react';
import People from "./People";
import Requests from "./Requests";
import { Clipboard } from "react-feather"; 
import { useNavigate } from "react-router-dom";
import { signOut, updatePassword } from "firebase/auth";
import { auth, db } from "../../firebase/firebase";
import { toast } from "react-toastify";
import { useCurrentUserFullName } from "../../hooks/useCurrentUserFullName"; 
import DashboardSuperAdmin from '../superadmin/DashboardSuperAdmin';
import SearchInput from './SearchInput';
import{
  LayoutDashboard,
  PlusCircle,
  AlertCircle,
  FileBarChart2,
  QrCode,
  LogOut,
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

const Dashboard = () => {
  const { fullName, loading } = useCurrentUserFullName();
  const [currentView, setCurrentView] = useState<'dashboard' | 'qr' | 'generate' | 'requestsdata' | 'reports' | 'reports-analytics' | 'profile' | 'assets' | 'people'>('dashboard');
  const [activeView, setActiveView] = useState<'dashboard' | 'generate' | 'reports' | 'requestsdata' |'reports-analytics' | 'qr' | 'profile' | 'assets' | 'people'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [openOptionsId, setOpenOptionsId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

// Validation helper
const getPasswordErrors = (pwd: string): string[] => {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(pwd)) errors.push("Include uppercase letter");
  if (!/[a-z]/.test(pwd)) errors.push("Include lowercase letter");
  if (!/\d/.test(pwd)) errors.push("Include numeric character");
  // Add more if needed (e.g., special chars)
  return errors;
};

// Derive passwordErrors from newPassword
const passwordErrors = getPasswordErrors(newPassword);
    const togglePasswordVisibility = () => {
    setShowNewPassword(true);
    setTimeout(() => setShowNewPassword(false), 1000);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmNewPassword(true);
    setTimeout(() => setShowConfirmNewPassword(false), 1000);
  };
type Notification = {
  id: number;
  message: string;
  timestamp: string;
  isRead: boolean;
  type?: 'user' | 'application' | 'asset' | 'system';
};
  const navigate = useNavigate();
    if (passwordErrors.length > 0) {
      toast.error("Please fix password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
  const navItems = [
    { title: "New Asset", category: "Asset" },  
    { title: "New Accessory", category: "Accessory" },
    { title: "New Consumable", category: "Consumable" },
    { title: "New Component", category: "Component" },
  ];
  const [notifications, setNotifications] = useState<Notification[]>([
  { id: 1, message: 'License Expiring Soon', timestamp: '1h ago', isRead: false },
  { id: 2, message: 'New Asset Assigned', timestamp: '2d ago', isRead: true },
  { id: 3, message: 'Asset Maintenance Required', timestamp: '3h ago', isRead: false },
  { id: 4, message: 'Asset Deleted', timestamp: '5d ago', isRead: true },
  { id: 5, message: 'Warranty Expired', timestamp: '1w ago', isRead: false },
  { id: 6, message: 'New Meeting Scheduled', timestamp: '10m ago', isRead: false },
  { id: 7, message: 'System Update Reminder', timestamp: '2h ago', isRead: true },
]);


  const filteredNotifications = notifications.filter(n =>
    notificationFilter === 'all' ? true : !n.isRead
  );

  const toggleNotif = () => setShowNotif(!showNotif);

  const toggleReadStatus = (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n)
    );
  };

  const handleDelete = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleOptionsToggle = (id: number) => {
    setOpenOptionsId(prev => (prev === id ? null : id));
  };

  const getIconClass = (message: string): string => {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('profile')) return 'fas fa-user-circle';
    if (lowerMsg.includes('license')) return 'fas fa-id-badge';
    if (lowerMsg.includes('broken')) return 'fas fa-tools';
    if (lowerMsg.includes('maintenance')) return 'fas fa-cogs';
    if (lowerMsg.includes('reminder')) return 'fas fa-bell';
    if (lowerMsg.includes('security')) return 'fas fa-shield-alt';
    if (lowerMsg.includes('report')) return 'fas fa-file-alt';
    if (lowerMsg.includes('approval') || lowerMsg.includes('request')) return 'fas fa-check-circle';
    if (lowerMsg.includes('meeting') || lowerMsg.includes('team')) return 'fas fa-users';
    return 'fas fa-info-circle';
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Searching:', e.target.value);
  };
  interface UserDoc {
  AuthUID: string;
  ActivationStatus?: string;
  // add other fields if needed
}

  // Sample data for the dashboard
  const dashboardData = {
    desktops: { total: 132, functional: 92, defective: 10, unserviceable: 30 },
    laptops: { total: 47, functional: 18, defective: 9, unserviceable: 20 },
    printers: { total: 50, functional: 40, defective: 5, unserviceable: 5 },
    servers: { total: 20, functional: 15, defective: 3, unserviceable: 2 },
    otherDevices: { total: 90, functional: 33, defective: 17, unserviceable: 40 },
    accessories: { total: 90, functional: 17, defective: 32, unserviceable: 41 },
    components:  { total: 50, functional: 30, defective: 10, unserviceable: 10 },
    

   
      licenses: {
      total: 60,
      expiringIn1Month: 20,
      expiringIn2Months: 25,
      expiringIn3Months: 20,
    },
    consumables: { total: 200 },
    propertyPlantEquipment: { total: 150 },
    semiExpendableProperty: { total: 80 },
    insuredProperty: { total: 100 },
    defectiveProperty: { total: 60 },
    custodian: { total: 50 },
    unserviceableProperty: { total: 70 },
    otherTable: [
      { category: 'People', users: 10, toApprove: 3 },
      
    ],
    
    
    newItems: {
      asset: 5,
      licenses: 3,
      accessory: 2,
      consumable: 1,
      components: 5,
    },
  };


  const [showCards, setShowCards] = useState(false);

  
const items = [
  {
    label: 'Consumables',
    total: dashboardData.consumables.total,
    icon: 'fas fa-tint',
    viewLink: 'consumables'
  },
  {
    label: 'Property Plant & Equipment',
    total: dashboardData.propertyPlantEquipment.total,
    icon: 'fas fa-building',
    viewLink: 'propertyPlant'
  },
  {
    label: 'Semi-Expendable Property',
    total: dashboardData.semiExpendableProperty.total,
    icon: 'fas fa-box-open',
    viewLink: 'semiExpendable'
  },
  {
    label: 'Insured Property',
    total: dashboardData.insuredProperty.total,
    icon: 'fas fa-shield-alt',
    viewLink: 'insuredProperty'
  },
  {
    label: 'Defective Property',
    total: dashboardData.defectiveProperty.total,
    icon: 'fas fa-tools',
    viewLink: 'defectiveProperty'
  },
  {
    label: 'Custodian',
    total: dashboardData.custodian.total,
    icon: 'fas fa-user-shield',
    viewLink: 'custodian'
  },
  {
    label: 'Unserviceable Property',
    total: dashboardData.unserviceableProperty.total,
    icon: 'fas fa-exclamation-triangle',
    viewLink: 'unserviceableProperty'
  }
];
const handleChangePassword = async () => {
  // Validate password
  if (passwordErrors.length > 0) {
    toast.error("Please fix password requirements.");
    return;
  }

  if (newPassword !== confirmPassword) {
    toast.error("Passwords do not match.");
    return;
  }

  // ... rest of your logic


  if (newPassword !== confirmPassword) return;

  const user = auth.currentUser;
  if (!user) return;

  setIsUpdating(true);

  try {
    await updatePassword(user, newPassword);

    // Update Firestore
    const q = query(collection(db, "IT_Supply_Users"), where("AuthUID", "==", user.uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userRef = doc(db, "IT_Supply_Users", snapshot.docs[0].id);
      await updateDoc(userRef, { ActivationStatus: "completed" });
    }

    toast.success("✅ Password updated successfully!");
    setShowChangePasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
  } catch (error: any) {
    console.error("Error updating password:", error);
    let msg = "Failed to update password.";
    if (error.code === "auth/weak-password") {
      msg = "Password is too weak. Use at least 6 characters.";
    } else if (error.code === "auth/requires-recent-login") {
      msg = "Session expired. Please log in again.";
    }
    toast.error(msg);
  } finally {
    setIsUpdating(false);
  }
};
const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();               // stop <Link> from navigating first
  if (signingOut) return;           // avoid double clicks
  setSigningOut(true);
  try {
    await signOut(auth);            // actually log out
    toast.info("Signed out");
    navigate("/", { replace: true }); // then navigate to login
  } catch (err) {
    console.error(err);
    toast.error("Sign out failed.");
  } finally {
    setSigningOut(false);
  }
};
useEffect(() => {
  // Listen to auth state changes (handles page reloads, delayed auth init, etc.)
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (!user) {
      setShowChangePasswordModal(false);
      return;
    }
    

    try {
      const q = query(collection(db, "IT_Supply_Users"), where("AuthUID", "==", user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as UserDoc;
        if (userData.ActivationStatus === "pending") {
          setShowChangePasswordModal(true);
        } else {
          setShowChangePasswordModal(false);
        }
      }
    } catch (error) {
      console.error("Error checking activation status:", error);
      setShowChangePasswordModal(false);
    }
  });

  // Cleanup listener on unmount
  return () => unsubscribe();
}, []);
  return (
    <div className="dashboard-body">
      <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
                 {/* Programmatic navigation for logo (accessible) */}
                    <div
                      onClick={() => {
                        setCurrentView('dashboard');
                        setActiveView('dashboard');
                        navigate('/dashadmin');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setCurrentView('dashboard');
                          setActiveView('dashboard');
                          navigate('/dashadmin');
                        }
                      }}
                      style={{ cursor: 'pointer', display: 'inline-block' }}
                      aria-label="Go to dashadmin"
                    >
                      <img
                        className="dashboard-logos"
                        src="/logosaproject.jpg"
                        alt="DOH Logo"
                      />
                    </div>

            <div className="logo-doh">DOH-TRC Argao</div>
            <button className="toggle-sidebar-btns" onClick={toggleSidebar}>
              ☰
            </button>
          </div>
        <nav className="menu">
  <Link
    to="#"
    className={`menu-items ${activeView === 'dashboard' ? 'active' : ''}`}
    onClick={() => {
      setCurrentView('dashboard');
      setActiveView('dashboard');
    }}
  >
    <LayoutDashboard className="menu-icon" />
    <span>Dashboard</span>
  </Link>

  <Link
    to="#"
    className={`menu-items ${activeView === 'assets' ? 'active' : ''}`}
    onClick={() => {
      setCurrentView('assets');
      setActiveView('assets');
    }}
  >
    <Package className="menu-icon" />
    <span>Asset Management</span>
  </Link>

  <Link
    to="#"
    className={`menu-items ${activeView === 'generate' ? 'active' : ''}`}
    onClick={() => {
      setCurrentView('generate');
      setActiveView('generate');
    }}
  >
    <PlusCircle className="menu-icon" />
    <span>Add Asset</span>
  </Link>

  <Link
    to="#"
    className={`menu-items ${activeView === 'reports' ? 'active' : ''}`}
    onClick={() => {
      setCurrentView('reports');
      setActiveView('reports');
    }}
  >
    <AlertCircle className="menu-icon" />
    <span>Reported Issues</span>
  </Link>

  <Link
    to="#"
    className={`menu-items ${activeView === 'reports-analytics' ? 'active' : ''}`}
    onClick={() => {
      setCurrentView('reports-analytics');
      setActiveView('reports-analytics');
    }}
  >
    <FileBarChart2 className="menu-icon" />
    <span>Reports / Analytics</span>
  </Link>

  <Link
    to="#"
    className={`menu-items ${activeView === 'qr' ? 'active' : ''}`}
    onClick={() => {
      setCurrentView('qr');
      setActiveView('qr');
    }}
  >
    <QrCode className="menu-icon" />
    <span>QR Scanner</span>
  </Link>

<Link
  to="#"
  className={`menu-item ${activeView === 'requestsdata' ? 'active' : ''}`}
  onClick={() => {
    setCurrentView('requestsdata');
    setActiveView('requestsdata');
  }}
>
  <Clipboard className="menu-icon" />
  <span>Request</span>
</Link>


  <Link
  to="/"
  className="menu-items logout"
  onClick={handleSignOut}
  aria-disabled={signingOut}
>
  <LogOut className="menu-icon" />
  <span>Sign Out</span>
</Link>
</nav>
        </aside>

        <div className="main-content">
          <header className="main-header">
            {(currentView === 'reports' || currentView === 'assets') && (
  <SearchInput placeholder="Search assets or personnel..." />
)}
            {(currentView === 'dashboard') && (
              <h2 className="asset-overview-heading">Dashboard Overview</h2>
            )}
            {(currentView === 'generate') && (
              <h2 className="asset-overview-heading">Add Asset</h2>
            )}
            {(currentView !== 'reports' && currentView !== 'assets') && (
              <div className="search-placeholder" style={{ width: '250px' }}></div>
            )}
            <div className="user-info">
              <span className="notif" onClick={toggleNotif}>🔔</span>
              <img
                src="/user.png"
                alt="User"
                className="user-icon"
                onClick={() => {
                  setCurrentView('profile');
                  setActiveView('profile');
                }}
              />
              <span
                className="welcome-text"
                onClick={() => {
                  setCurrentView('profile');
                  setActiveView('profile');
                }}
              >
                {fullName || "User"}
              </span>

              {showNotif && (
                <div className="notif-popup">
                  <h3>Notifications</h3>
                  <div className="notif-filter">
                    <button
                      className={notificationFilter === 'all' ? 'active-filter' : ''}
                      onClick={() => setNotificationFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={notificationFilter === 'unread' ? 'active-filter' : ''}
                      onClick={() => setNotificationFilter('unread')}
                    >
                      Unread
                    </button>
                  </div>
                  <ul>
                    {(showAll ? filteredNotifications : filteredNotifications.slice(0, 4)).map((notif) => (
                      <li key={notif.id} className="notification-item">
                        <div className="notification-left" onClick={() => toggleReadStatus(notif.id)}>
                          <i className={`notification-icon ${getIconClass(notif.message)}`}></i>
                          <div className="notification-message">
                            <span className="text" style={{ fontWeight: notif.isRead ? 'normal' : 'bold' }}>
                              {notif.message}
                            </span>
                            <span className="timestamp">{notif.timestamp}</span>
                          </div>
                        </div>
                        <div className="notification-options" onClick={() => handleOptionsToggle(notif.id)}>
                          ⋮
                          {openOptionsId === notif.id && (
                            <div className="notification-options-menu">
                              <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}>
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {filteredNotifications.length > 5 && (
                    <button className="show-toggle" onClick={() => setShowAll(!showAll)}>
                      {showAll ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          <div className="content-here">
            {currentView === 'dashboard' && (
          <div className="table-content">
            <div className='tabless'>
{/* ===== Asset Status Cards ===== */}
{[
  { label: 'Desktops', data: dashboardData.desktops },
  { label: 'Laptops',  data: dashboardData.laptops  },
  { label: 'Printers', data: dashboardData.printers },
  { label: 'Servers',  data: dashboardData.servers  },
  { label: 'Other Devices', data: dashboardData.otherDevices },
  { label: 'Accessories', data: dashboardData.accessories },
  { label: 'Components', data: dashboardData.components },

  
  
].map((item, i) => {
  const total =
    item.data.functional + item.data.defective + item.data.unserviceable;

  return (
    <div className="asset-bar-card" key={i}>
      <h3>{item.label}</h3>
      <p className="total-count">Total: {total}</p>

      <div className="bar-row">
        <span className="label">FUNCTIONAL</span>
        <div className="progress-bar bg-green">
          <div
            className="progress-fill" 
            style={{ width: `${(item.data.functional / total) * 100}%` }}
          />
        </div>
        <span className="value">{item.data.functional}</span>
      </div>

      <div className="bar-row">
        <span className="label">DEFECTIVE</span>
        <div className="progress-bar bg-yellow">
          <div
            className="progress-fill"
            style={{ width: `${(item.data.defective / total) * 100}%` }}
          />
        </div>
        <span className="value">{item.data.defective}</span>
      </div>

      <div className="bar-row">
        <span className="label">UNSERVICEABLE</span>
        <div className="progress-bar bg-red">
          <div
            className="progress-fill"
            style={{ width: `${(item.data.unserviceable / total) * 100}%` }}
          />
        </div>
        <span className="value">{item.data.unserviceable}</span>
      </div>
    </div>
  );
})}

    {/* ===== License Status Card ===== */}
                <div className="asset-bar-card">
                  <h3>Licenses</h3>
                  <p className="total-count">Total: {dashboardData.licenses.total}</p>
                 <div className="bar-row">
                    <span className="label">EXPIRE IN 1 MONTH</span>
                    <div className="progress-bar bg-green">
                      <div
                        className="progress-fill"
                        style={{ width: `${(dashboardData.licenses.expiringIn1Month / dashboardData.licenses.total) * 100}%` }}
                      />
                    </div>
                    <span className="value">{dashboardData.licenses.expiringIn1Month}</span>
                  </div>
                  <div className="bar-row">
                    <span className="label">EXPIRE IN 2 MONTHS</span>
                    <div className="progress-bar bg-yellow">
                      <div
                        className="progress-fill"
                        style={{ width: `${(dashboardData.licenses.expiringIn2Months / dashboardData.licenses.total) * 100}%` }}
                      />
                    </div>
                    <span className="value">{dashboardData.licenses.expiringIn2Months}</span>
                  </div>
                  <div className="bar-row">
                    <span className="label">EXPIRE IN 3 MONTHS</span>
                    <div className="progress-bar bg-red">
                      <div
                        className="progress-fill"
                        style={{ width: `${(dashboardData.licenses.expiringIn3Months / dashboardData.licenses.total) * 100}%` }}
                      />
                    </div>
                    <span className="value">{dashboardData.licenses.expiringIn3Months}</span>
                  </div>
                 
                 
                </div>

              

{/* ===== Furniture / Fixtures Table ===== */}

  <div className="table-cards table3-card">
  <h3>People</h3>

  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>No. of Users</th>
        <th>To Approve</th>
      </tr>
    </thead>
    <tbody>
      {dashboardData.otherTable
        .filter(r => r.category === 'People')
        .map((r, i) => (
          <tr key={i}>
            <td>{r.category}</td>
            <td>{r.users}</td>
            <td>{r.toApprove}</td>
          </tr>
        ))}
    </tbody>
  </table>

 {/* Centered view more */}
<div className="view-more-container">
  <button
    className="view-more-button"
    onClick={() => {
      setCurrentView('people');
      setActiveView('people');
    }}
  >
    View more →
  </button>
</div> 
</div>
 <div className='new-card'>

{/* ===== New-Item Cards ===== */}
<div className="new-item-cards-container">
      {navItems.map((item, i) => (
        <div
          className={`new-item-card ${item.category}`}
          key={i}
          onClick={() => navigate("/generate-qr", { state: { category: item.category } })}
          style={{ cursor: "pointer" }} // make it feel clickable
        >
          <h3>{item.title}</h3>
        </div>
      ))}
    </div>
</div>
{/* Change Password Modal */}

 </div>
<div className='dashboard-columns'>
  <div className='simple'>

    {/* Show More button aligned to the left */}
    <div className='show-more-wrapper'>
      <button onClick={() => setShowCards(!showCards)}>
        {showCards ? 'Show Less' : 'Show More'}
      </button>
    </div>

    <div className='simplecard'>
      {showCards &&
        items.map((item, i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'white',
              borderRadius: '10px',
              padding: '15px',
              color: '#333',
              
              
              gap: '2 rem',
              
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div>
              <div>{item.total}</div>
              <i className={item.icon}></i>
            </div>
            <div>{item.label}</div>
            <div
              onClick={() => {
                setCurrentView(item.viewLink as any);
                setActiveView(item.viewLink as any);
              }}
            >
              <span>VIEW ALL</span>
              <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        ))}
    </div>
  </div>
</div>
</div>

            )}
            {currentView === 'assets' && <AssetManagement />}
            {currentView === 'qr' && <WebQRScanner />}
            {currentView === 'generate' && <QRCodeGenerator />}
            {currentView === 'profile' && <ProfilePage />}
            {currentView === 'reports' && <Reports />}
            {currentView === 'reports-analytics' && <ReportsAnalytics />}
            {currentView === 'people' && <People />}
            {currentView === 'requestsdata' && <Requests />}
          </div>
          
        </div>
        
      </div>
      {showChangePasswordModal && (
  <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div className="modal-content" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90vw' }}>
      <h3 style={{ marginBottom: '16px' }}>🔐 Set Your Permanent Password</h3>
      <p style={{ marginBottom: '16px' }}>For security, please change your temporary password.</p>

      <div style={{ marginBottom: '12px' }}>
            <label>New Password:</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                required
              />
              <span
                className="eye-icon"
                onClick={togglePasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <FontAwesomeIcon icon={faEye} />
              </span>
            </div>
          </div>

      <div style={{ marginBottom: '16px' }}>
            <label>Confirm Password:</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                required
              />
              <span
                className="eye-icon"
                onClick={toggleConfirmPasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <FontAwesomeIcon icon={faEye} />
              </span>
            </div>
          </div>

      {newPassword !== confirmPassword && confirmPassword && (
        <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>Passwords do not match.</p>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowChangePasswordModal(false)}
          disabled={isUpdating}
          style={{ padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleChangePassword}
          disabled={isUpdating || !newPassword || newPassword !== confirmPassword}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: isUpdating || !newPassword || newPassword !== confirmPassword ? 0.6 : 1
          }}
        >
          {isUpdating ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    
    
  );
};

export default Dashboard;
/*
//// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBawioJ6qGT5ZiYI4U1AI_f3w0a6tylkHo",
  authDomain: "asset-tracking-f8aeb.firebaseapp.com",
  databaseURL: "https://asset-tracking-f8aeb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "asset-tracking-f8aeb",
  storageBucket: "asset-tracking-f8aeb.appspot.com", 
  messagingSenderId: "840883319763",
  appId: "1:840883319763:web:55d9774296ac421caa7526",
  measurementId: "G-L0EZGB96MC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app); 
export { auth, provider };
export default app;
*/