import React, { useEffect, useRef, useState } from 'react';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
  addDoc, 
  serverTimestamp,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDocs
} from "firebase/firestore";

import RequestConsumables from './RequestConsumable';
import ManageConsumableRequests from './ManageConsumableRequests';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import emailjs from '@emailjs/browser';

emailjs.init("H-E3p8euS03kue0bR");
const formatNotificationTimestamp = (ts: any): string => {
  if (!ts) return "";

  // Firestore Timestamp object (has .toDate())
  if (typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString();
  }

  // If serverTimestamp hasn't resolved yet, you might get an object with seconds
  if (typeof ts === "object" && typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000).toLocaleString();
  }

  // If you ever stored a plain string or number, just show it
  if (typeof ts === "string") return ts;
  if (typeof ts === "number") return new Date(ts).toLocaleString();

  return "";
};

const Dashboard = () => {
  const { fullName, loading } = useCurrentUserFullName();
  const [currentView, setCurrentView] = useState<'dashboard' | 'qr' | 'generate' | 'requestsdata' | 'reports' | 'reports-analytics' | 'profile' | 'assets' | 'people' | 'request-consumables' | 'manage-consumable-requests'>('assets');
  const [activeView, setActiveView] = useState<'dashboard' | 'generate' | 'reports' | 'requestsdata' | 'reports-analytics' | 'qr' | 'profile' | 'assets' | 'people' | 'request-consumables' | 'manage-consumable-requests'>('assets');
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
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifiedAssetIds = useRef<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  // 🔒 Password validation logic
  const getPasswordErrors = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("Include uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("Include lowercase letter");
    if (!/\d/.test(pwd)) errors.push("Include numeric character");
    return errors;
  };

  const passwordErrors = getPasswordErrors(newPassword);

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmNewPassword(!showConfirmNewPassword);
  };

type Notification = {
    id: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    type: 'expiry' | 'system' | 'asset';
    assetId?: string;
  };

  const navigate = useNavigate();

  const navItems = [
    { title: "New Asset", category: "Asset" },  
    { title: "New Accessory", category: "Accessory" },
    { title: "New Consumable", category: "Consumable" },
    { title: "New Component", category: "Component" },
  ];
const sendExpiryEmail = async (
  email: string,
  assetName: string,
  expiryDate: Date
) => {
  try {
    await emailjs.send(
      "service_9ag7ij3", // your EmailJS service
      "template_ns0qv0q", // your template
      {
        to_email: email,
        user_name: fullName,
        asset_name: assetName,
        expiry_date: expiryDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
      "H-E3p8euS03kue0bR" // your public key
    );

    console.log("Expiry email sent to:", email);
  } catch (err) {
    console.error("Email send failed:", err);
  }
};
useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "Notifications"),
    where("userId", "==", user.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifList = snapshot.docs
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as Notification & { timestamp?: any }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); // newest first

    setNotifications(notifList);
  });

  return unsubscribe;
}, []);
useEffect(() => {
  setUnreadCount(notifications.filter(n => !n.isRead).length);
}, [notifications]);

useEffect(() => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    const q = query(
  collection(db, "IT_Assets"),
  where("personnel", "==", user.uid),
  where("status", "in", ["active", "deployed", "in-use"])
);


    const unsubscribe = onSnapshot(q, async (snapshot) => {
     const now = new Date();
const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        for (const docSnap of snapshot.docs) {
  const data = docSnap.data();
  const assetId = docSnap.id;

  const assetName = data.assetName || data.name || "Unknown Asset";
let expiryDate = null;

if (data.expirationDate) {
  // expirationDate is saved as a string (YYYY-MM-DD)
  expiryDate = new Date(data.expirationDate);
}

// NON-EXPIRING TYPES (Perpetual/OEM/Open Source)
if (data.licenseType && ["Perpetual","OEM","Open Source"].includes(data.licenseType)) {
  continue; // skip → this asset never expires
}

if (!expiryDate || isNaN(expiryDate.getTime())) continue;



  // Assigned personnel email (modify asset form to save this!)
  const recipientEmail = data.assignedEmail || user.email;

  if (!expiryDate) continue;


  // Check if within 7-day expiry window
  if (expiryDate >= now && expiryDate <= sevenDaysFromNow) {
    const daysLeft = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / 86400000
    );

    // Prevent immediate duplicates in this sessio

    const message =
      daysLeft <= 0
        ? `EXPIRED TODAY: ${assetName}`
        : `Expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}: ${assetName}`;

    // SAVE NOTIFICATION INTO FIRESTORE
    await addDoc(collection(db, "Notifications"), {
      userId: user.uid,
      message,
      timestamp: serverTimestamp(),
      isRead: false,
      assetId: assetId,
      type: "expiry",
    });

    // SEND EMAIL
    if (recipientEmail) {
      await sendExpiryEmail(recipientEmail, assetName, expiryDate);
    }

    toast.warning(
      `Warning: ${assetName} is expiring in ${daysLeft} day(s)!`
    );
  }
}



    });

    return () => unsubscribe();
  }, [fullName]);


  const filteredNotifications = notifications.filter(n =>
    notificationFilter === 'all' ? true : !n.isRead
  );

  const toggleNotif = () => setShowNotif(!showNotif);

const toggleReadStatus = async (id: string, currentState: boolean) => {
  const notifRef = doc(db, "Notifications", id);
  await updateDoc(notifRef, { isRead: !currentState });
};


const handleDelete = async (id: string) => {
  await deleteDoc(doc(db, "Notifications", id));
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
  }

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
    machineryEquipment: { total: 150 },
    functionalProperty: { total: 80 },
    insuredProperty: { total: 100 },
    defectiveProperty: { total: 60 },
    assignedCustodian: { total: 50 },
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
    { label: 'Consumables', total: dashboardData.consumables.total, icon: 'fas fa-tint', viewLink: 'consumables' },
    { label: 'Machinery & Equipment', total: dashboardData.machineryEquipment.total, icon: 'fas fa-building', viewLink: 'machineryEquipment' },
    { label: 'Functional Property', total: dashboardData.functionalProperty.total, icon: 'fas fa-box-open', viewLink: 'functionalProperty' },
    { label: 'Insured Property', total: dashboardData.insuredProperty.total, icon: 'fas fa-shield-alt', viewLink: 'insuredProperty' },
    { label: 'Defective Property', total: dashboardData.defectiveProperty.total, icon: 'fas fa-tools', viewLink: 'defectiveProperty' },
    { label: 'Assigned Custodian', total: dashboardData.assignedCustodian.total, icon: 'fas fa-user-shield', viewLink: 'assignedCustodian' },
    { label: 'Unserviceable Property', total: dashboardData.unserviceableProperty.total, icon: 'fas fa-exclamation-triangle', viewLink: 'unserviceableProperty' }
  ];

  const handleChangePassword = async () => {
    if (passwordErrors.length > 0) {
      toast.error("Please fix password requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsUpdating(true);

    try {
      await updatePassword(user, newPassword);

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
        msg = "Password is too weak. Use at least 8 characters with letters and numbers.";
      } else if (error.code === "auth/requires-recent-login") {
        msg = "Session expired. Please log in again.";
      }
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async (e?: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e?.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(auth);
      toast.info("Signed out");
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Sign out failed.");
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  return (
    <div className="dashboard-body">
      <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
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
            {/* <Link
              to="#"
              className={`menu-items ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('dashboard');
                setActiveView('dashboard');
              }}
            >
              <LayoutDashboard className="menu-icon" />
              <span>Dashboard</span>
            </Link> */}

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
                className={`menu-items ${activeView === 'request-consumables' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('request-consumables');
                  setActiveView('request-consumables');
                  navigate('/request-consumables');
                }}
              >
                <i className="fas fa-boxes menu-icon"></i>
                <span>Request Consumables</span>
              </Link>

              <Link
                to="#"
                className={`menu-items ${activeView === 'manage-consumable-requests' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('manage-consumable-requests');
                  setActiveView('manage-consumable-requests');
                  navigate('/manage-consumable-requests');
                }}
              >
                <i className="fas fa-tasks menu-icon"></i>
                <span>Manage Requests</span>
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

            {/* <Link
              to="#"
              className={`menu-item ${activeView === 'requestsdata' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('requestsdata');
                setActiveView('requestsdata');
              }}
            >
              <Clipboard className="menu-icon" />
              <span>Request</span>
            </Link> */}

            <Link to="#" className="menu-items logout"
              onClick={(e) => { e.preventDefault(); setShowSignOutModal(true); }}
              aria-disabled={signingOut}>
              <LogOut className="menu-icon" />
              <span>Sign Out</span>
            </Link>
          </nav>
        </aside>

        <div className="main-content">
          <header className="main-header">
            {(currentView === 'reports' || currentView === 'assets' || currentView === 'manage-consumable-requests') && (
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
              <span className="notif" onClick={toggleNotif} style={{ position: "relative" }}>
  🔔
  {unreadCount > 0 && (
    <span
      style={{
        position: "absolute",
        top: "-5px",
        right: "-8px",
        background: "red",
        color: "white",
        borderRadius: "10px",
        padding: "2px 6px",
        fontSize: "10px",
        fontWeight: "bold",
      }}
    >
      {unreadCount}
    </span>
  )}
</span>

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
                        <div className="notification-left" onClick={() => toggleReadStatus(notif.id, notif.isRead)}>
                          <i className={`notification-icon ${getIconClass(notif.message)}`}></i>
                          <div className="notification-message">
                            <span className="text" style={{ fontWeight: notif.isRead ? 'normal' : 'bold' }}>
                              {notif.message}
                            </span>
                            <span className="timestamp">
                            {formatNotificationTimestamp(notif.timestamp)}
                          </span>


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
                    const total = item.data.functional + item.data.defective + item.data.unserviceable;
                    return (
                      <div className="asset-bar-card" key={i}>
                        <h3>{item.label}</h3>
                        <p className="total-count">Total: {total}</p>
                        <div className="bar-row">
                          <span className="label">FUNCTIONAL</span>
                          <div className="progress-bar bg-green">
                            <div className="progress-fill" style={{ width: `${(item.data.functional / total) * 100}%` }} />
                          </div>
                          <span className="value">{item.data.functional}</span>
                        </div>
                        <div className="bar-row">
                          <span className="label">DEFECTIVE</span>
                          <div className="progress-bar bg-yellow">
                            <div className="progress-fill" style={{ width: `${(item.data.defective / total) * 100}%` }} />
                          </div>
                          <span className="value">{item.data.defective}</span>
                        </div>
                        <div className="bar-row">
                          <span className="label">UNSERVICEABLE</span>
                          <div className="progress-bar bg-red">
                            <div className="progress-fill" style={{ width: `${(item.data.unserviceable / total) * 100}%` }} />
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
                        <div className="progress-fill" style={{ width: `${(dashboardData.licenses.expiringIn1Month / dashboardData.licenses.total) * 100}%` }} />
                      </div>
                      <span className="value">{dashboardData.licenses.expiringIn1Month}</span>
                    </div>
                    <div className="bar-row">
                      <span className="label">EXPIRE IN 2 MONTHS</span>
                      <div className="progress-bar bg-yellow">
                        <div className="progress-fill" style={{ width: `${(dashboardData.licenses.expiringIn2Months / dashboardData.licenses.total) * 100}%` }} />
                      </div>
                      <span className="value">{dashboardData.licenses.expiringIn2Months}</span>
                    </div>
                    <div className="bar-row">
                      <span className="label">EXPIRE IN 3 MONTHS</span>
                      <div className="progress-bar bg-red">
                        <div className="progress-fill" style={{ width: `${(dashboardData.licenses.expiringIn3Months / dashboardData.licenses.total) * 100}%` }} />
                      </div>
                      <span className="value">{dashboardData.licenses.expiringIn3Months}</span>
                    </div>
                  </div>

                  {/* ===== People Table ===== */}
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
                    <div className="new-item-cards-container">
                      {navItems.map((item, i) => (
                        <div
                          className={`new-item-card ${item.category}`}
                          key={i}
                          onClick={() => navigate("/generate-qr", { state: { category: item.category } })}
                          style={{ cursor: "pointer" }}
                        >
                          <h3>{item.title}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='dashboard-columns'>
                  <div className='simple'>
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
                              gap: '2rem',
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
            {currentView === 'request-consumables' && <RequestConsumables />}
            {currentView === 'manage-consumable-requests' && <ManageConsumableRequests />}
            {currentView === 'reports-analytics' && <ReportsAnalytics />}
            {currentView === 'people' && <People />}
            {currentView === 'requestsdata' && <Requests />}
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '420px', maxWidth: '90vw', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <i className="fas fa-lock" style={{ fontSize: '36px', color: '#0d6efd' }}></i>
              <h3 style={{ margin: '12px 0 8px', fontSize: '18px' }}>Set Your Password (Required)</h3>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Welcome! Please create a secure password to complete your account setup.</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
                <span onClick={toggleNewPasswordVisibility} style={{ position: 'absolute', right: '12px', top: '35%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666', fontSize: '16px' }}>
                  <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                </span>
              </div>
              {newPassword && passwordErrors.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc3545' }}>
                  {passwordErrors.map((err, i) => <div key={i}>• {err}</div>)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
                <span onClick={toggleConfirmPasswordVisibility} style={{ position: 'absolute', right: '12px', top: '35%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666', fontSize: '16px' }}>
                  <FontAwesomeIcon icon={showConfirmNewPassword ? faEyeSlash : faEye} />
                </span>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#dc3545' }}>Passwords do not match.</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleChangePassword}
                disabled={isUpdating || passwordErrors.length > 0 || newPassword !== confirmPassword}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: isUpdating || passwordErrors.length > 0 || newPassword !== confirmPassword ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isUpdating ? 'Updating...' : <>Set Password</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIGN OUT MODAL */}
      {showSignOutModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div className="modal-content" style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '380px', maxWidth: '90vw', textAlign: 'center' }}>
            <i className="fas fa-sign-out-alt" style={{ fontSize: '32px', color: '#dc3545', marginBottom: '16px' }}></i>
            <h3 style={{ margin: '0 0 16px' }}>Are you sure you want to sign out?</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>You will be logged out of the system.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowSignOutModal(false)} style={{ padding: '8px 16px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  opacity: signingOut ? 0.6 : 1,
                }}
              >
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;