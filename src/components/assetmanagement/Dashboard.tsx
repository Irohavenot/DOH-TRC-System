import React, { useState } from 'react';
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

const Dashboard = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'qr' | 'generate' | 'reports' | 'reports-analytics' | 'profile' | 'assets' | 'people'>('dashboard');
  const [activeView, setActiveView] = useState<'dashboard' | 'generate' | 'reports' | 'reports-analytics' | 'qr' | 'profile' | 'assets' | 'people'>('dashboard');
  const [query, setQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [openOptionsId, setOpenOptionsId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const user = { name: 'Ronzel Go' };

  type Notification = {
    id: number;
    message: string;
    timestamp: string;
    isRead: boolean;
  };

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
    setQuery(e.target.value);
    console.log('Searching:', e.target.value);
  };

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

  return (
    <div className="dashboard-body">
      <div className={`dashboard-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <img className="dashboard-logo" src="/logosaproject.jpg" alt="DOH Logo" />
            <div className="logo">DOH-TRC</div>
            <button className="toggle-sidebar-btn" onClick={toggleSidebar}>
              ☰
            </button>
          </div>
          <nav className="menu">
            <Link
              to="#"
              className={`menu-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('dashboard');
                setActiveView('dashboard');
              }}
            >
              <img src="/layout.png" alt="Dashboard" className="menu-icon" />
              <span>Dashboard</span>
            </Link>
          <Link
  to="#"
  className={`menu-item ${activeView === 'assets' ? 'active' : ''}`}
  onClick={() => {
    setCurrentView('assets');
    setActiveView('assets');
  }}
>
  <Package className="menu-icon" color="black"  />       
  <span>Asset Management</span>
</Link>
            <Link
              to="#"
              className={`menu-item ${activeView === 'generate' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('generate');
                setActiveView('generate');
              }}
            >
              <img src="/more.png" alt="Add Assets" className="menu-icon" />
              <span>Add Asset</span>
            </Link>
            <Link
              to="#"
              className={`menu-item ${activeView === 'reports' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('reports');
                setActiveView('reports');
              }}
            >
              <img src="/alert.png" alt="QR-Scanner" className="menu-icon" />
              <span>Reported Issues</span>
            </Link>
            <Link
              to="#"
              className={`menu-item ${activeView === 'reports-analytics' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('reports-analytics');
                setActiveView('reports-analytics');
              }}
            >
              <img src="/file.png" alt="QR-Scanner" className="menu-icon" />
              <span>Reports / Analytics</span>
            </Link>
            <Link
              to="#"
              className={`menu-item ${activeView === 'qr' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('qr');
                setActiveView('qr');
              }}
            >
              <img src="/qr-code.png" alt="QR-Scanner" className="menu-icon" />
              <span>QR Scanner</span>
            </Link>
            <Link to="/" className="menu-item logout">
              <img src="/logout.png" alt="Logout" className="menu-icon" />
              <span>Logout</span>
            </Link>
          </nav>
        </aside>

        <div className="main-content">
          <header className="main-header">
            {(currentView === 'reports' || currentView === 'assets') && (
              <div className="search-container">
                <img src="/search-interface-symbol.png" alt="Search" className="search-icon" />
                <input
                  type="text"
                  value={query}
                  onChange={handleSearch}
                  placeholder="Search..."
                  className="search-input"
                />
              </div>
            )}
            {(currentView === 'dashboard') && (
              <h2 className="asset-overview-heading">Dashboard Overview</h2>
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
                {user.name}
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
    className="view-more-btns"
    onClick={() => {
      setCurrentView('people');
      setActiveView('people');
    }}
  >
    View more →
  </button>
</div>


 
</div>
<div className='dashboard-columns'>
<div className='simple'>
 {/* ===== Simplified Status Cards (without subcategories) ===== */}
                <div className='simplecard'
                >
                  {[
                    { label: 'Consumables', total: dashboardData.consumables.total, color: '#9575cd', icon: 'fas fa-tint', viewLink: 'assets' },
                    { label: 'Property Plant & Equipment', total: dashboardData.propertyPlantEquipment.total, color: '#607d8b', icon: 'fas fa-building', viewLink: 'assets' },
                    { label: 'Semi-Expendable Property', total: dashboardData.semiExpendableProperty.total, color: '		#fbc02d', icon: 'fas fa-box-open', viewLink: 'assets' },
                    { label: 'Insured Property', total: dashboardData.insuredProperty.total, color: '#4db6ac', icon: 'fas fa-shield-alt', viewLink: 'assets' },
                    { label: 'Defective Property', total: dashboardData.defectiveProperty.total, color: '#e91e63', icon: 'fas fa-tools', viewLink: 'assets' },
                    { label: 'Custodian', total: dashboardData.custodian.total, color: '#8bc34a', icon: 'fas fa-user-shield', viewLink: 'assets' },
                    { label: 'Unserviceable Property', total: dashboardData.unserviceableProperty.total, color: '#d81b60', icon: 'fas fa-exclamation-triangle', viewLink: 'assets' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: item.color,
                        borderRadius: '10px',
                        padding: '15px',
                     
                        color: 'white',
                        width: '255px',
                        height: '170px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{item.total}</div>
                        <i className={item.icon} style={{ fontSize: '24px', opacity: 0.8 }}></i>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>{item.label}</div>
                      <div
                        onClick={() => {
                          setCurrentView(item.viewLink as any);
                          setActiveView(item.viewLink as any);
                        }}
                        style={{ cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <span>VIEW ALL</span>
                        <i className="fas fa-arrow-right" style={{ fontSize: '10px' }}></i>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
  
 <div className='new-card'>

{/* ===== New-Item Cards ===== */}
<div className="new-item-cards-container">
  {[
    { title: 'New Asset', class: 'asset' },
    { title: 'New License', class: 'license' },
    { title: 'New Accessory', class: 'accessory' },
    { title: 'New Consumable', class: 'consumable' },
    { title: 'New Component', class: 'component' },
  ].map((n, i) => (
    <div className={`new-item-card ${n.class}`} key={i}>
      <h3>{n.title}</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;