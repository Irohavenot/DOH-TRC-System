import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from "../../firebase/firebase";
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";

import "../../superadmincss/dashboardsuper.css";
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
  UserCheck,
  UserX,
  Clock,
  Users,
} from 'lucide-react';
import emailjs from '@emailjs/browser';

interface User {
  id: string;
  Email: string;
  FirstName: string;
  LastName: string;
  MiddleInitial?: string;
  Position?: string;
  Department?: string;
  Status: string;
  ActivationStatus?: string;
  IDPictureBase64?: string;
  CreatedAt?: any;
}

interface RejectedUser extends User {
  RejectedAt?: any;
  RejectedBy?: {
    id: string;
    email: string;
    displayName: string;
  };
}

const EMAILJS_PUBLIC_KEY = 'oiiPTVJU2reQ831XC';
const EMAILJS_SERVICE_ID = 'service_nb6i81u';
const EMAILJS_TEMPLATE_ID = 'template_6qph2gb';

type TableView = 'approved' | 'pending' | 'activation' | 'rejected';

const DashboardSuperAdmin = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'dashadmin' | 'peoples' | 'profiled' | 'supply' | 'clinical' | 'radiology' | 'dental' | 'dde' | 'notif'>('dashadmin');
  const [activeView, setActiveView] = useState<'dashadmin' | 'peoples' | 'profiled' | 'supply' | 'clinical' | 'radiology' | 'dental' | 'dde' | 'notif'>('dashadmin');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTableView, setActiveTableView] = useState<TableView>('approved');

  const [pendingAccounts, setPendingAccounts] = useState<User[]>([]);
  const [approvedAccounts, setApprovedAccounts] = useState<User[]>([]);
  const [pendingActivation, setPendingActivation] = useState<User[]>([]);
  const [rejectedAccounts, setRejectedAccounts] = useState<RejectedUser[]>([]);
  
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [disablingUser, setDisablingUser] = useState<User | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // ✅ Fetch accounts from Firestore with corrected filtering logic
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "IT_Supply_Users"));
        const users: User[] = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as User[];

        // ✅ Fixed logic
        setApprovedAccounts(
          users.filter(
            (u) => u.Status === "approved" && u.ActivationStatus === "completed"
          )
        );

        setPendingAccounts(users.filter((u) => u.Status === "pending"));

        setPendingActivation(
          users.filter(
            (u) =>
              u.Status === "approved" &&
              (u.ActivationStatus === "pending" || !u.ActivationStatus)
          )
        );

        const rejectedSnapshot = await getDocs(collection(db, "Rejected_Users"));
        const rejected: RejectedUser[] = rejectedSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as RejectedUser[];
        setRejectedAccounts(rejected);

      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };
    fetchAccounts();
  }, []);

  const getFullName = (user: User | RejectedUser) => {
    const mi = user.MiddleInitial ? `${user.MiddleInitial}. ` : '';
    return `${user.FirstName} ${mi}${user.LastName}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const confirmApprove = async () => {
    if (!assignedDepartment) {
      alert("Please select a department.");
      return;
    }

    if (!approvingUser) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(approvingUser.Email)) {
      alert("❌ Invalid email format. Please check the user's email address.");
      return;
    }

    try {
      const tempPassword = Math.random().toString(36).slice(-8);

      const userCred = await createUserWithEmailAndPassword(
        auth,
        approvingUser.Email,
        tempPassword
      );

      const userRef = doc(db, "IT_Supply_Users", approvingUser.id);
      await updateDoc(userRef, {
        Status: "approved",
        ActivationStatus: "pending",
        Department: assignedDepartment,
        AuthUID: userCred.user.uid,
      });

      emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY,
        blockHeadless: true,
      });

      const expireTime = new Date(Date.now() + 30 * 60 * 1000);
      const timeString = expireTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      const loginUrl = window.location.origin;
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: approvingUser.Email,
        passcode: tempPassword,
        time: timeString,
        login_url: loginUrl,
        first_name: approvingUser.FirstName,
      });

      setPendingAccounts(prev => prev.filter(u => u.id !== approvingUser.id));
      const updatedUser = {
        ...approvingUser,
        Status: "approved",
        Department: assignedDepartment,
        ActivationStatus: "pending",
      };
      setPendingActivation(prev => [...prev, updatedUser]);

      setApprovingUser(null);
      setAssignedDepartment("");
      alert("✅ User approved and temporary password emailed!");

    } catch (error: any) {
      console.error("Error approving user:", error);

      if (error.code === "auth/invalid-email") {
        alert("❌ The email address is invalid. Please update the user's email and try again.");
      } else if (error.code === "auth/email-already-in-use") {
        alert("❌ This email is already in use. The user may have been approved already.");
      } else if (error.code === "auth/operation-not-allowed") {
        alert("❌ Email/password sign-in is disabled in Firebase Authentication settings.");
      } else if (error.code === "auth/weak-password") {
        alert("❌ The generated password was too weak (unlikely, but possible). Please try again.");
      } else {
        alert(`❌ Failed to approve user: ${error.message || 'An unexpected error occurred.'}`);
      }
    }
  };

  const confirmReject = async () => {
    if (rejectingUser) {
      try {
        const userRef = doc(db, "IT_Supply_Users", rejectingUser.id);

        const currentAdmin = {
          id: auth.currentUser?.uid || "unknown",
          email: auth.currentUser?.email || "unknown",
          displayName: auth.currentUser?.displayName || "unknown",
        };

        const rejectedRef = doc(collection(db, "Rejected_Users"));
        await setDoc(rejectedRef, {
          ...rejectingUser,
          Status: "rejected",
          RejectedAt: new Date(),
          RejectedBy: currentAdmin,
        });

        await deleteDoc(userRef);

        setPendingAccounts(prev => prev.filter(u => u.id !== rejectingUser.id));
        setRejectedAccounts(prev => [...prev, {
          ...rejectingUser,
          Status: "rejected",
          RejectedAt: new Date(),
          RejectedBy: currentAdmin,
        }]);
        
        setRejectingUser(null);
        alert("User moved to Rejected_Users collection.");
      } catch (error: any) {
        console.error("Error rejecting user:", error);
        alert(`Failed to reject user: ${error.message}`);
      }
    }
  };

  const handleDisableUser = async () => {
    if (disablingUser) {
      try {
        const userRef = doc(db, "IT_Supply_Users", disablingUser.id);
        await updateDoc(userRef, {
          Status: "disabled",
          DisabledAt: new Date(),
          DisabledBy: {
            id: auth.currentUser?.uid || "unknown",
            email: auth.currentUser?.email || "unknown",
            displayName: auth.currentUser?.displayName || "unknown",
          }
        });

        setApprovedAccounts(prev => prev.filter(u => u.id !== disablingUser.id));
        setDisablingUser(null);
        alert("✅ User account has been disabled.");
      } catch (error: any) {
        console.error("Error disabling user:", error);
        alert(`❌ Failed to disable user: ${error.message}`);
      }
    }
  };

  const getFilteredApprovedAccounts = () => {
    return approvedAccounts.filter(
      (p) => selectedDepartment === "All" || p.Department === selectedDepartment
    );
  };
  return (
    <div className="dashadmin-body">
      <div className={`dashadmin-container ${sidebarCollapsed ? 'dashadmin-collapsed' : ''}`}>
        {/* Sidebar */}
        <aside className="dashadmin-sidebar">
          <div className="dashadmin-sidebar-header">
            <div
              onClick={() => {
                setCurrentView('dashadmin');
                setActiveView('dashadmin');
                navigate('/dashboard');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setCurrentView('dashadmin');
                  setActiveView('dashadmin');
                  navigate('/dashboard');
                }
              }}
              style={{ cursor: 'pointer', display: 'inline-block' }}
              aria-label="Go to dashboard"
            >
              <img
                className="dashadmin-logo"
                src="/logosaproject.jpg"
                alt="DOH Logo"
              />
            </div>

            <div className="dashadmin-logo-text">DOH-TRC Argao</div>
            <button className="dashadmin-toggle-btn" onClick={toggleSidebar}>☰</button>
          </div>
          <nav className="dashadmin-menu">
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'dashadmin' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('dashadmin');
                setActiveView('dashadmin');
              }}
            >
              <LayoutDashboard className="dashadmin-menu-icon" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'supply' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('supply');
                setActiveView('supply');
              }}
            >
              <Boxes className="dashadmin-menu-icon" />
              <span>Supply Unit</span>
            </Link>
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'clinical' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('clinical');
                setActiveView('clinical');
              }}
            >
              <FlaskConical className="dashadmin-menu-icon" />
              <span>Clinical Lab</span>
            </Link>
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'radiology' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('radiology');
                setActiveView('radiology');
              }}
            >
              <ScanLine className="dashadmin-menu-icon" />
              <span>Radiology</span>
            </Link>
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'dental' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('dental');
                setActiveView('dental');
              }}
            >
              <Syringe className="dashadmin-menu-icon" />
              <span>Dental</span>
            </Link>
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'dde' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('dde');
                setActiveView('dde');
              }}
            >
              <Stethoscope className="dashadmin-menu-icon" />
              <span>DDE</span>
            </Link>
            <Link
              to="#"
              className={`dashadmin-menu-item ${activeView === 'notif' ? 'dashadmin-active' : ''}`}
              onClick={() => {
                setCurrentView('notif');
                setActiveView('notif');
              }}
            >
              <Bell className="dashadmin-menu-icon" />
              <span>Notifications</span>
            </Link>
            <Link to="/" className="dashadmin-menu-item dashadmin-logout">
              <LogOut className="dashadmin-menu-icon" />
              <span>Sign Out</span>
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <div className="dashadmin-main-content">
          {currentView === 'dashadmin' && (
            <>
              {/* Table Navigation Tabs */}
              <div className="dashadmin-table-nav-tabs">
                <button
                  className={`dashadmin-tab-button ${activeTableView === 'approved' ? 'dashadmin-tab-active' : ''}`}
                  onClick={() => setActiveTableView('approved')}
                >
                  <UserCheck size={18} />
                  <span>Approved ({approvedAccounts.length})</span>
                </button>
                <button
                  className={`dashadmin-tab-button ${activeTableView === 'pending' ? 'dashadmin-tab-active' : ''}`}
                  onClick={() => setActiveTableView('pending')}
                >
                  <Clock size={18} />
                  <span>Pending Review ({pendingAccounts.length})</span>
                </button>
                <button
                  className={`dashadmin-tab-button ${activeTableView === 'activation' ? 'dashadmin-tab-active' : ''}`}
                  onClick={() => setActiveTableView('activation')}
                >
                  <Users size={18} />
                  <span>Pending Activation ({pendingActivation.length})</span>
                </button>
                <button
                  className={`dashadmin-tab-button ${activeTableView === 'rejected' ? 'dashadmin-tab-active' : ''}`}
                  onClick={() => setActiveTableView('rejected')}
                >
                  <UserX size={18} />
                  <span>Rejected ({rejectedAccounts.length})</span>
                </button>
              </div>

              {/* Approved Accounts Table */}
              {activeTableView === 'approved' && (
                <div className="dashadmin-table-section">
                  <div className="dashadmin-table-header">
                    <h2>Approved Accounts</h2>
                    <div className="dashadmin-department-dropdown">
                      <label>Filter by Department: </label>
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                      >
                        <option value="All">All Departments</option>
                        <option value="Supply Unit">Supply Unit</option>
                        <option value="IT Personnel">IT Personnel</option>
                        <option value="Radiology">Radiology</option>
                        <option value="Clinical Lab">Clinical Lab</option>
                        <option value="Dental">Dental</option>
                        <option value="DDE">DDE</option>
                      </select>
                    </div>
                  </div>
   

                  <div className="dashadmin-info-counters">
                    <p>
                      <strong>
                        Total Approved in{" "}
                        {selectedDepartment === "All" ? "All Departments" : selectedDepartment}:
                      </strong>{" "}
                      {getFilteredApprovedAccounts().length}
                    </p>
                  </div>

                  <table className="dashadmin-people-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredApprovedAccounts().map((p) => (
                        <tr key={p.id}>
                          <td>{getFullName(p)}</td>
                          <td>{p.Department || 'N/A'}</td>
                          <td>{p.Email}</td>
                          <td>
                            {p.ActivationStatus === "completed" ? (
                              <span className="dashadmin-status-badge dashadmin-status-active">Active</span>
                            ) : (
                              <span className="dashadmin-status-badge dashadmin-status-pending">Pending Activation</span>
                            )}
                          </td>
                          <td>
                            <div className="dashadmin-button-group">
                              <button 
                                className="dashadmin-btn dashadmin-view-btn" 
                                onClick={() => setViewingUser(p)}
                              >
                                View Profile
                              </button>
                              <button 
                                className="dashadmin-btn dashadmin-disable-btn" 
                                onClick={() => setDisablingUser(p)}
                              >
                                Disable
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pending Review Table */}
              {activeTableView === 'pending' && (
                <div className="dashadmin-table-section">
                  <h2>Pending Accounts for Review</h2>
                  <div className="dashadmin-info-counters">
                    <p><strong>Pending Accounts:</strong> {pendingAccounts.length}</p>
                  </div>
                  <table className="dashadmin-pending-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Suggested Position</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingAccounts.map((p) => (
                        <tr key={p.id}>
                          <td>{getFullName(p)}</td>
                          <td>{p.Email}</td>
                          <td>{p.Position || 'Not specified'}</td>
                          <td>
                            <div className='dashadmin-button-group'>
                              <button className='dashadmin-btn dashadmin-approve-btn' onClick={() => setApprovingUser(p)}>Approve</button>
                              <button className='dashadmin-btn dashadmin-reject-btn' onClick={() => setRejectingUser(p)}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pending Activation Table */}
              {activeTableView === 'activation' && (
                <div className="dashadmin-table-section">
                  <h2>Pending Activation Accounts</h2>
                  <p className="dashadmin-info-text">These users have been approved but haven't activated their accounts yet.</p>
                  <div className="dashadmin-info-counters">
                    <p><strong>Pending Activation:</strong> {pendingActivation.length}</p>
                  </div>
                  <table className="dashadmin-people-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingActivation.map((p) => (
                        <tr key={p.id}>
                          <td>{getFullName(p)}</td>
                          <td>{p.Department || 'N/A'}</td>
                          <td>{p.Email}</td>
                          <td><span className="dashadmin-status-badge dashadmin-status-pending">Pending Activation</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Rejected Accounts Table */}
              {activeTableView === 'rejected' && (
                <div className="dashadmin-table-section">
                  <h2>Rejected Accounts</h2>
                  <div className="dashadmin-info-counters">
                    <p><strong>Rejected Accounts:</strong> {rejectedAccounts.length}</p>
                  </div>
                  <table className="dashadmin-rejected-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Suggested Position</th>
                        <th>Rejected By</th>
                        <th>Rejected Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedAccounts.map((p) => (
                        <tr key={p.id}>
                          <td>{getFullName(p)}</td>
                          <td>{p.Email}</td>
                          <td>{p.Position || 'N/A'}</td>
                          <td>{p.RejectedBy?.displayName || p.RejectedBy?.email || 'N/A'}</td>
                          <td>{formatDate(p.RejectedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Approve Modal */}
              {approvingUser && (
                <div className="dashadmin-modal">
                  <div className="dashadmin-modal-content">
                    <h3>Assign Department to {approvingUser.FirstName}</h3>
                    <p className="dashadmin-suggested-position">
                      <strong>Suggested Position:</strong> {approvingUser.Position || 'Not specified'}
                    </p>
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

                    {approvingUser.IDPictureBase64 && (
                      <div className="dashadmin-id-picture">
                        <p>ID Picture:</p>
                        <img
                          src={approvingUser.IDPictureBase64}
                          alt="ID Preview"
                          style={{ width: "150px", height: "150px", objectFit: "cover", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                        />
                      </div>
                    )}

                    <div className='dashadmin-button-group'>
                      <button className='dashadmin-btn dashadmin-confirm-btn' onClick={confirmApprove}>Confirm</button>
                      <button className='dashadmin-btn dashadmin-cancel-btn' onClick={() => setApprovingUser(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reject Modal */}
              {rejectingUser && (
                <div className="dashadmin-modal">
                  <div className="dashadmin-modal-content">
                    <p>Do you want to reject {rejectingUser.FirstName}?</p>
                    <div className='dashadmin-button-group'>
                      <button className='dashadmin-btn dashadmin-yes-btn' onClick={confirmReject}>Yes, Reject</button>
                      <button className='dashadmin-btn dashadmin-no-btn' onClick={() => setRejectingUser(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* View Profile Modal */}
              {viewingUser && (
                <div className="dashadmin-modal">
                  <div className="dashadmin-modal-content dashadmin-modal-large">
                    <h3>User Profile</h3>
                    
                    {viewingUser.IDPictureBase64 && (
                      <div className="dashadmin-id-picture">
                        <img
                          src={viewingUser.IDPictureBase64}
                          alt="Profile"
                          style={{ width: "150px", height: "150px", objectFit: "cover", borderRadius: "50%", border: "3px solid #004d40" }}
                        />
                      </div>
                    )}

                    <div className="dashadmin-profile-details">
                      <div className="dashadmin-profile-row">
                        <strong>Full Name:</strong>
                        <span>{getFullName(viewingUser)}</span>
                      </div>
                      <div className="dashadmin-profile-row">
                        <strong>Email:</strong>
                        <span>{viewingUser.Email}</span>
                      </div>
                      <div className="dashadmin-profile-row">
                        <strong>Department:</strong>
                        <span>{viewingUser.Department || 'N/A'}</span>
                      </div>
                      <div className="dashadmin-profile-row">
                        <strong>Position:</strong>
                        <span>{viewingUser.Position || 'N/A'}</span>
                      </div>
                      <div className="dashadmin-profile-row">
                        <strong>Status:</strong>
                        <span>
                          {viewingUser.ActivationStatus === "activated" ? (
                            <span className="dashadmin-status-badge dashadmin-status-active">Active</span>
                          ) : (
                            <span className="dashadmin-status-badge dashadmin-status-pending">Pending Activation</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className='dashadmin-button-group'>
                      <button className='dashadmin-btn dashadmin-cancel-btn' onClick={() => setViewingUser(null)}>Close</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Disable User Modal */}
              {disablingUser && (
                <div className="dashadmin-modal">
                  <div className="dashadmin-modal-content">
                    <h3>Disable User Account?</h3>
                    <p>Are you sure you want to disable the account of <strong>{getFullName(disablingUser)}</strong>?</p>
                    <p className="dashadmin-warning-text">This user will no longer be able to access the system.</p>
                    <div className='dashadmin-button-group'>
                      <button className='dashadmin-btn dashadmin-yes-btn' onClick={handleDisableUser}>Yes, Disable</button>
                      <button className='dashadmin-btn dashadmin-no-btn' onClick={() => setDisablingUser(null)}>Cancel</button>
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
          {currentView === 'notif' && <Notifications />}
        </div>
      </div>
    </div>
  );
};

export default DashboardSuperAdmin;