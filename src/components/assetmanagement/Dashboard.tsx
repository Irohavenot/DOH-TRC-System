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
    desktops: { total: 132, functional: 92, defective: 10, condemned: 30 },
    laptops: { total: 47, functional: 18, defective: 9, condemned: 20 },
    printers: { total: 50, functional: 40, defective: 5, condemned: 5 },
    servers: { total: 20, functional: 15, defective: 3, condemned: 2 },
    otherDevices: { total: 90, functional: 33, defective: 17, condemned: 40 },

   
    
   
    
    
    
    propertyData: [
      { property: '10605030-COMPST-TRC-2014-01-0007', type: 'Desktop', program: 'Residential Program', repaired: 4 },
      { property: '10605030-COMPST-TRC-2023-01-0098', type: 'Desktop', program: 'Residential Program', repaired: 3 },
    ],
    otherTable: [
      { category: 'Accessories', users: 50, toApprove: 5 },
      { category: 'Components', users: 30, toApprove: 3 },
      { category: 'Licenses', users: 20, toApprove: 2 },
      { category: 'Consumables', users: 15, toApprove: 1 },
      { category: 'People', users: 10, toApprove: 3 },
    ],
    furnituresFixtures: [
      { property: '10605030-FURN-TRC-2020-01-0001', type: 'Chair', program: 'Office', repaired: 2 },
      { property: '10605030-FIXT-TRC-2019-01-0002', type: 'Table', program: 'Office', repaired: 1 },
    ],
    newItems: {
      asset: 5,
      licenses: 3,
      accessory: 2,
      consumable: 1,
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
].map((item, i) => {
  const total =
    item.data.functional + item.data.defective + item.data.condemned;

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
        <span className="label">CONDEMNED</span>
        <div className="progress-bar bg-red">
          <div
            className="progress-fill"
            style={{ width: `${(item.data.condemned / total) * 100}%` }}
          />
        </div>
        <span className="value">{item.data.condemned}</span>
      </div>
    </div>
  );
})}


  {/* ===== Furniture / Fixtures Table ===== */}
  <div className="table-cards table2-card">
    <h3>Furnitures / Fixtures</h3>
    <table>
      <thead>
        <tr>
          <th>Property #</th><th>Type</th><th>Program</th><th>Repaired</th>
        </tr>
      </thead>
      <tbody>
        {dashboardData.furnituresFixtures.map((row, i) => (
          <tr key={i}>
            <td>{row.property}</td><td>{row.type}</td>
            <td>{row.program}</td><td>{row.repaired}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

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



 {/* ===== New-Item Cards ===== */}
{[
  { title: 'New Asset',      value: dashboardData.newItems.asset,      class: 'asset'      },
  { title: 'New Licenses',   value: dashboardData.newItems.licenses,   class: 'license'    },
  { title: 'New Accessory',  value: dashboardData.newItems.accessory,  class: 'accessory'  },
  { title: 'New Consumable', value: dashboardData.newItems.consumable, class: 'consumable' },
].map((n, i) => (
  <div className={`new-item-card ${n.class}`} key={i}>
    <h3>{n.title}</h3>
    <div className="card-content"><p>{n.value}</p></div>
  </div>
))}

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