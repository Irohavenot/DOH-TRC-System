import React, { useState } from 'react';
import "../../assets/personnel.css";
import "../../assets/notification.css";
import WebQRScanner from "./qrscanner";
import ProfilePage from "./ProfilePage";
import AssetHistory from "./AssetHistory";
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { FaHistory } from 'react-icons/fa';
import { Package } from 'lucide-react';

const PersonnelDashboard = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'qr' | 'generate' | 'reports' | 'reports-analytics' | 'profile' | 'history'>('dashboard'  );
  const [activeView, setActiveView] = useState<'dashboard' | 'generate' | 'reports' | 'reports-analytics' | 'qr' | 'profile' | 'history'>('dashboard'); // Track active menu item
  const [query, setQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filter, setFilter] = useState<'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired'>('all');
  const [showNotif, setShowNotif] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [openOptionsId, setOpenOptionsId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const user = { name: 'Donna May' };
  
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
    { id: 6, message: 'QR Scan Detected', timestamp: '2h ago', isRead: false },
    { id: 7, message: 'Unauthorized Login Attempt', timestamp: '3d ago', isRead: false },
    { id: 8, message: 'Profile Updated', timestamp: '5m ago', isRead: true },
    { id: 9, message: 'License Expired', timestamp: '10m ago', isRead: false },
    { id: 10, message: 'New User Registered', timestamp: '1d ago', isRead: true },
    { id: 11, message: 'Asset Transfer Request', timestamp: '20h ago', isRead: false },
  ]);
  
  const filteredNotifications = notifications.filter(n =>
    notificationFilter === 'all' ? true : !n.isRead
  );
  
  interface Card {
    title: string;
    team: string;
    timeLeft: string;
    progress: number;
    iconClass: string;
  }
  const [cards, setCards] = useState<Card[]>([
    { title: "Router - Cisco 2901", team: "Medical Components", timeLeft: "No Expiration", progress: 34, iconClass: "icon-blue" },
    { title: "UI Development Server", team: "Core UI", timeLeft: "2 Years Left", progress: 76, iconClass: "icon-green" },
    { title: "MS Office 365 License", team: "Microsoft Office", timeLeft: "2 Days Left", progress: 4, iconClass: "icon-orange" },
    { title: "Norton Security Suite", team: "Anti-Virus", timeLeft: "1 Month Left", progress: 90, iconClass: "icon-orange" },
    { title: "Dell OptiPlex 7090", team: "Computer", timeLeft: "3 Weeks Left", progress: 65, iconClass: "icon-red" },
    { title: "HP LaserJet M404", team: "Printer", timeLeft: "2 Month Left", progress: 96, iconClass: "icon-orange" },
    { title: "Solar Panel Inverter", team: "Solar Electronics", timeLeft: "No Expiration", progress: 24, iconClass: "icon-blue" },
    { title: "Arduino IoT Kit", team: "Electronics", timeLeft: "1 Weeks Left", progress: 70, iconClass: "icon-red" },
  ]);

  const filteredCards = cards.filter((card) => {
    switch (filter) {
      case 'permanent':
        return card.iconClass === 'icon-blue';
      case 'normal':
        return card.iconClass === 'icon-green';
      case 'aboutToExpire':
        return card.iconClass === 'icon-orange';
      case 'expired':
        return card.iconClass === 'icon-red';
      default:
        return true;
    }
  });

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
  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);

  const handleViewMore = (card: Card) => {
    setSelectedCard(card);
  };
  
  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    console.log('Searching:', e.target.value); // Replace this with actual logic
  };

  const handleCardOptionsToggle = (index: number) => {
    setOpenCardOptionsId(prev => (prev === index ? null : index));
  };

  const handleDeleteCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
    setOpenCardOptionsId(null); // Close the menu after deleting
  };

 const handleReportClick = (index: number) => {
  const card = cards[index];
  setSelectedCard(card);
  setShowReportModal(true);     
  setOpenCardOptionsId(null);    
};



const [showReportModal, setShowReportModal] = useState(false);


  
  return (
    <div className="dashboard-body">
      {selectedCard && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-image">
              <img src="printer.jpg" alt="Asset" />
            </div>
            <div className="modal-details">
              <h2>Asset Details</h2>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><strong>Asset ID:</strong></td><td>12345</td></tr>
                  <tr><td><strong>Asset Name:</strong></td><td>{selectedCard.title}</td></tr>
                  <tr><td><strong>Category:</strong></td><td>Laptop</td></tr>
                  <tr><td><strong>Status:</strong></td><td>Active</td></tr>
                  <tr><td><strong>Assigned Personnel:</strong></td><td>John Doe</td></tr>
                  <tr><td><strong>Purchase Date:</strong></td><td>2023-04-21</td></tr>
                  <tr><td><strong>Serial Number:</strong></td><td>SN123456</td></tr>
                  <tr><td><strong>License Type:</strong></td><td>OEM</td></tr>
                  <tr><td><strong>Expiration Date:</strong></td><td>2025-04-21</td></tr>
                </tbody>
              </table>

              <div className="buttons-container">
                <button className="close-btn" onClick={handleCloseModal}>Close</button>
                <button className="edits-button" onClick={() => setShowReportModal(true)}>Report</button>
              </div>
            </div>
          </div>
        </div>



      )}

      {showReportModal && selectedCard && (
  <div className="modal-backdrops" onClick={() => setShowReportModal(false)}>
    <div className="modals" onClick={(e) => e.stopPropagation()}>
      <div className="modal-detailed">
        <h2>Submit Report</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert('Report submitted!');
            setShowReportModal(false);
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <label>Asset Name:</label><br />
            <input
              type="text"
              value={selectedCard.title}
              readOnly
              className="readonly-input"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Issue Type:</label><br />
            <select required defaultValue="">
              <option value="" disabled>Select an issue</option>
              <option value="Not Working">Not Working</option>
              <option value="Hardware Issue">Hardware Issue</option>
              <option value="Software Issue">Software Issue</option>
            </select>
          </div>

          <div>
            <label>Description:</label><br />
            <textarea
              rows={5}
              cols={70}
              required
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div className="buttons-containers">
            <button
              type="button"
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowReportModal(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="submit-report-btn">Submit</button>
            
            
          </div>
        </form>
      </div>
    </div>
  </div>
)}

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
              <Package className="menu-icon" color="black"  /> 
              <span>Asset Management</span>
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
           
          <Link
  to="#"
  className={`menu-item ${activeView === 'history' ? 'active' : ''}`}
  onClick={() => {
    setCurrentView('history');
    setActiveView('history');
  }}
>
  <FaHistory className="menu-icon" color='black' />
  <span>Asset History</span>
</Link>
            <Link to="/" className="menu-item logout">
              <img src="/logout.png" alt="Logout" className="menu-icon" />
              <span>Logout</span>
            </Link>
          </nav>
        </aside>

        <div className="main-content">
          <header className="main-header">
            {(currentView === 'dashboard' || currentView === 'reports') && (
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
            {(currentView !== 'dashboard' && currentView !== 'reports') && (
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
              <>
                <h1>Asset Management</h1>
                <div className="filter-tabs">
                  <button onClick={() => setFilter('all')}>All <span>{cards.length}</span></button>
                  <button onClick={() => setFilter('permanent')}>Permanent <span>2</span></button>
                  <button onClick={() => setFilter('normal')}>Normal <span>1</span></button>
                  <button onClick={() => setFilter('aboutToExpire')}>About To Expire <span>3</span></button>
                  <button onClick={() => setFilter('expired')}>Expired <span>2</span></button>
                </div>

                <div className="cards-grid">
                  {filteredCards.map((card, index) => (
                    <div className="card" key={index}>
                      <div className="card-top">
                        <div className="card-top-left">
                          <div className={`card-icon ${card.iconClass}`}></div>
                          <button className="view-more-btn" onClick={() => handleViewMore(card)}>
                            View More
                          </button>
                        </div>
                        <div className="card-options">
                          <button className="options-btn" onClick={() => handleCardOptionsToggle(index)}>
                            ⋮
                          </button>
                          {openCardOptionsId === index && (
  <div className="card-options-menu">
   <button className="edit-btn" onClick={() => handleReportClick(index)}>
  <i className="fas fa-edit"></i> Report
</button>

    <button className="delete-btn" onClick={() => handleDeleteCard(index)}>
      <i className="fas fa-trash-alt"></i> Delete Asset
    </button>
  </div>
)}

                        </div>
                      </div>
                      <h2>{card.title}</h2>
                      <p>{card.team}</p>
                      <p>{card.timeLeft}</p>
                      <div className="card-footer">
                        <span>Donna May Magsucang</span>
                        <span>Serial Number: {card.progress}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {currentView === 'qr' && <WebQRScanner />}

            {currentView === 'history' && <AssetHistory />}

            {currentView === 'profile' && <ProfilePage />}
            
            
          
          
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelDashboard;