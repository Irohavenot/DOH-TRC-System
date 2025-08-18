import { useState } from 'react';
import "../../superadmincss/dashboardsuper.css";
import { Link } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Profile from "./Profile";
import Supply from "./Supply";
import ClinicalLab from "./ClinicalLab";
import Radiology from "./Radiology";
import Dental from "./Dental";
import DDE from "./DDE";
import Notifications from "./Notifications";

import {
  LayoutDashboard,
  Boxes,
  FlaskConical,
  ScanLine,
  Syringe,
  Stethoscope,
  Bell,
  LogOut,
} from 'lucide-react';


const Trial = () => {
  const [currentView, setCurrentView] = useState<'dashadmin' | 'peoples' | 'profiled' | 'supply' | 'clinical' | 'radiology' | 'dental' | 'dde' | 'notif'>('dashadmin');
  const [activeView, setActiveView] = useState<'dashadmin' | 'peoples' | 'profiled' | 'supply' | 'clinical' | 'radiology' | 'dental' | 'dde' | 'notif'>('dashadmin');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const [selectedDepartment, setSelectedDepartment] = useState("Supply Unit");

  const people = [
    // Supply Unit
    { id: 1, lastname: "Reyes", firstname: "Juan", mi: "D", email: "juan@example.com", department: "Supply Unit" },
    { id: 2, lastname: "Garcia", firstname: "Liza", mi: "A", email: "liza@example.com", department: "Supply Unit" },
    { id: 3, lastname: "Torres", firstname: "Karl", mi: "B", email: "karl@example.com", department: "Supply Unit" },
    { id: 4, lastname: "Mendoza", firstname: "Ivy", mi: "C", email: "ivy@example.com", department: "Supply Unit" },
    { id: 5, lastname: "Diaz", firstname: "Jake", mi: "F", email: "jake@example.com", department: "Supply Unit" },

    // Radiology
    { id: 6, lastname: "Santos", firstname: "Maria", mi: "C", email: "maria@example.com", department: "Radiology" },
    { id: 7, lastname: "Flores", firstname: "John", mi: "M", email: "john@example.com", department: "Radiology" },
    { id: 8, lastname: "Tan", firstname: "Nina", mi: "L", email: "nina@example.com", department: "Radiology" },
    { id: 9, lastname: "Lim", firstname: "Ben", mi: "T", email: "ben@example.com", department: "Radiology" },
    { id: 10, lastname: "Chua", firstname: "Ella", mi: "E", email: "ella@example.com", department: "Radiology" },

    // Dental
    { id: 11, lastname: "Dela Cruz", firstname: "Ana", mi: "B", email: "ana@example.com", department: "Dental" },
    { id: 12, lastname: "Rivera", firstname: "Leo", mi: "H", email: "leo@example.com", department: "Dental" },
    { id: 13, lastname: "Gomez", firstname: "Tina", mi: "J", email: "tina@example.com", department: "Dental" },
    { id: 14, lastname: "Salazar", firstname: "Mike", mi: "S", email: "mike@example.com", department: "Dental" },
    { id: 15, lastname: "Navarro", firstname: "Faye", mi: "Z", email: "faye@example.com", department: "Dental" },

    // IT Personnel
    { id: 16, lastname: "Lopez", firstname: "Mark", mi: "E", email: "mark@example.com", department: "IT Personnel" },
    { id: 17, lastname: "Cruz", firstname: "Ria", mi: "N", email: "ria@example.com", department: "IT Personnel" },
    { id: 18, lastname: "Fernandez", firstname: "Jake", mi: "P", email: "jakef@example.com", department: "IT Personnel" },
    { id: 19, lastname: "Valdez", firstname: "Karen", mi: "R", email: "karen@example.com", department: "IT Personnel" },
    { id: 20, lastname: "Bautista", firstname: "Ian", mi: "K", email: "ian@example.com", department: "IT Personnel" },

    // Clinical
    { id: 21, lastname: "Morales", firstname: "Jude", mi: "G", email: "jude@example.com", department: "Clinical Lab" },
    { id: 22, lastname: "Aquino", firstname: "Belle", mi: "Q", email: "belle@example.com", department: "Clinical Lab" },
    { id: 23, lastname: "Ramos", firstname: "Chad", mi: "U", email: "chad@example.com", department: "Clinical Lab" },
    { id: 24, lastname: "Rosales", firstname: "Luna", mi: "M", email: "luna@example.com", department: "Clinical Lab" },
    { id: 25, lastname: "Castillo", firstname: "Gio", mi: "V", email: "gio@example.com", department: "Clinical Lab" },

    // DDE
    { id: 26, lastname: "Delos Reyes", firstname: "Ella", mi: "O", email: "ella_d@example.com", department: "DDE" },
    { id: 27, lastname: "Padilla", firstname: "Roy", mi: "X", email: "roy@example.com", department: "DDE" },
    { id: 28, lastname: "Alvarez", firstname: "Zoe", mi: "Y", email: "zoe@example.com", department: "DDE" },
    { id: 29, lastname: "Ortiz", firstname: "Sam", mi: "R", email: "sam@example.com", department: "DDE" },
    { id: 30, lastname: "Manalo", firstname: "Chris", mi: "W", email: "chris@example.com", department: "DDE" },
  ];

  interface User {
    id: number;
    firstname: string;
    lastname: string;
    mi?: string;
    email: string;
    department?: string;
  }

  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);

  // Initialize pendingAccounts with some sample users needing approval
  const [pendingAccounts, setPendingAccounts] = useState<User[]>([
    people[0], // Juan Reyes
    people[5], // Maria Santos
    people[10], // Ana Dela Cruz
  ]);
  const [assignedDepartment, setAssignedDepartment] = useState('');

  const handleApproveClick = (user: User) => {
    setApprovingUser(user);
  };

  const confirmApprove = () => {
    if (!assignedDepartment) {
      alert("Please select a department.");
      return;
    }
    if (approvingUser) {
      console.log(`Approved ${approvingUser.firstname} as ${assignedDepartment}`);
      setPendingAccounts(prev => prev.filter(u => u.id !== approvingUser.id));
      setApprovingUser(null);
    }
  };

  const handleRejectClick = (user: User) => {
    setRejectingUser(user);
  };

  const confirmReject = () => {
    if (rejectingUser) {
      console.log(`Rejected ${rejectingUser.firstname}`);
      setPendingAccounts(prev => prev.filter(u => u.id !== rejectingUser.id));
      setRejectingUser(null);
    }
  };

  return (
    <div className="dashboard-bodys">
      <div className={`dashboard-containers ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="sidebar-header">
           <Link
                                 to="#"
                                 onClick={() => {
                                   setCurrentView('dashadmin');
                                   setActiveView('dashadmin');
                                 }}
                               >
                                 <img
                                   className="dashboard-logos"
                                   src="/logosaproject.jpg"
                                   alt="DOH Logo"
                                   style={{ cursor: 'pointer' }} // Optional: makes it feel clickable
                                 />
                               </Link>
            <div className="logos">DOH-TRC Argao</div>
            <button className="toggle-sidebar-btns" onClick={toggleSidebar}>☰</button>
          </div>
          <nav className="menus">
            <Link
              to="#"
              className={`menu-items ${activeView === 'dashadmin' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('dashadmin');
                setActiveView('dashadmin');
              }}
            >
              <LayoutDashboard className="menu-icons" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="#"
              className={`menu-items ${activeView === 'supply' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('supply');
                setActiveView('supply');
              }}
            >
              <Boxes className="menu-icons" />
              <span>Supply Unit</span>
            </Link>

            <Link
              to="#"
              className={`menu-items ${activeView === 'clinical' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('clinical');
                setActiveView('clinical');
              }}
            >
              <FlaskConical className="menu-icons" />
              <span>Clinical Lab</span>
            </Link>

            <Link
              to="#"
              className={`menu-items ${activeView === 'radiology' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('radiology');
                setActiveView('radiology');
              }}
            >
              <ScanLine className="menu-icons" />
              <span>Radiology</span>
            </Link>

            <Link
              to="#"
              className={`menu-items ${activeView === 'dental' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('dental');
                setActiveView('dental');
              }}
            >
              <Syringe className="menu-icons" />
              <span>Dental</span>
            </Link>

            <Link
              to="#"
              className={`menu-items ${activeView === 'dde' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('dde');
                setActiveView('dde');
              }}
            >
              <Stethoscope className="menu-icons" />
              <span>DDE</span>
            </Link>

            <Link
              to="#"
              className={`menu-items ${activeView === 'notif' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('notif');
                setActiveView('notif');
              }}
            >
              <Bell className="menu-icons" />
              <span>Notifications</span>
            </Link>

            <Link to="/" className="menu-items logouts">
              <LogOut className="menu-icons" />
              <span>Sign Out</span>
            </Link>
          </nav>
        </aside>

        <div className="main-content-admin">
      
      
            {currentView === 'dashadmin' && (
              <>
                <div className="department-dropdown">
                  
                  <label>Select Department: </label>
                  
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="Supply Unit">Supply Unit</option>
                    <option value="IT Personnel">IT Personnel</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Clinical Lab">Clinical Lab</option>
                    <option value="Dental">Dental</option>
                    <option value="DDE">DDE</option>
                  </select>
                </div>

                <div className="info-counters">
  <p><strong>Total Approved in {selectedDepartment}:</strong> {people.filter(p => p.department === selectedDepartment).length}</p>
 
 
</div>

                <table className="people-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Lastname</th>
                      <th>Firstname</th>
                      <th>M.I.</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people
                      .filter(p => p.department === selectedDepartment)
                      .map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td>{p.lastname}</td>
                          <td>{p.firstname}</td>
                          <td>{p.mi}</td>
                          <td>{p.email}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                <h2>Pending Accounts</h2>
                  <div className="info-counters">
  <p><strong>Pending Accounts for Review:</strong> {pendingAccounts.length}</p>
</div>
                <table className="pending-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Lastname</th>
                      <th>Firstname</th>
                        <th>M.I.</th>
                      <th>Email</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAccounts.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.lastname}</td>
                        <td>{p.firstname}</td>
                        <td>{p.mi}</td>
                        <td>{p.email}</td>
                        <td>
                          <div className='button-approve'>
                          <button className='approve-btn' onClick={() => handleApproveClick(p)}>Approve</button>
                          <button className='reject-btn' onClick={() => handleRejectClick(p)}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Approve Dropdown Modal */}
                {approvingUser && (
                  <div className="modal-admin">
                    <div className="modal-contents">
                      <h3>Assign Department to {approvingUser.firstname}</h3>
                      <select
                        value={assignedDepartment}
                        onChange={(e) => setAssignedDepartment(e.target.value)}
                      >
                        <option value="">-- Select Department --</option>
                        <option value="Supply Unit">Supply Unit</option>
                        <option value="IT Personnel">IT Personnel</option>
                        <option value="Radiology">Radiology</option>
                        <option value="Clinical Lab">Clinical Lab</option>
                        <option value="Dental">Dental</option>
                        <option value="DDE">DDE</option>
                      </select>
                      <div className='button-approves'>
                      <button className='confirm-btn' onClick={confirmApprove}>Confirm</button>
                      <button className='cancel-btn' onClick={() => setApprovingUser(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reject Confirmation Modal */}
                {rejectingUser && (
                  <div className="modal-admin">
                    <div className="modal-contents">
                      <p>Do you want to reject {rejectingUser.firstname}?</p>
                       <div className='button-approves'>
                      <button className='yes' onClick={confirmReject}>Yes, Reject</button>
                      <button className='no' onClick={() => setRejectingUser(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {currentView === 'profiled' && <Profile />}
            {currentView === 'supply' && <Supply />}
            {currentView === 'clinical' && <ClinicalLab />}
            {currentView === 'radiology' && <Radiology />}
            {currentView === 'dental' && <Dental />}
            {currentView === 'dde' && <DDE />}
            {currentView === 'notif' && <Notifications/>}
          </div>
        </div>
      </div>
    
  );
};

export default Trial;


