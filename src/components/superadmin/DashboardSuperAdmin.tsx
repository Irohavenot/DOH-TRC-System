import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { Link } from 'react-router-dom';
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
import { useNavigate } from 'react-router-dom';

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
import emailjs from '@emailjs/browser';
interface User {
  id: string; // Firestore UID
  Email: string;
  FirstName: string;
  LastName: string;
  MiddleInitial?: string;
  Position?: string;
  Department?: string;
  Status: string;
  IDPictureBase64?: string;
}
const EMAILJS_PUBLIC_KEY = 'oiiPTVJU2reQ831XC'; // ← Replace with your key!
const EMAILJS_SERVICE_ID = 'service_nb6i81u';        // e.g., 'service_gmail'
const EMAILJS_TEMPLATE_ID = 'template_6qph2gb';      // e.g., 'template_otp_login'


const DashboardSuperAdmin = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'dashadmin' | 'peoples' | 'profiled' | 'supply' | 'clinical' | 'radiology' | 'dental' | 'dde' | 'notif'>('dashadmin');
  const [activeView, setActiveView] = useState<'dashadmin' | 'peoples' | 'profiled' | 'supply' | 'clinical' | 'radiology' | 'dental' | 'dde' | 'notif'>('dashadmin');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [pendingAccounts, setPendingAccounts] = useState<User[]>([]);
  const [approvedAccounts, setApprovedAccounts] = useState<User[]>([]);
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState("Supply Unit");

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Fetch accounts from Firestore
  useEffect(() => {
    const fetchAccounts = async () => {
      const querySnapshot = await getDocs(collection(db, "IT_Supply_Users"));
      const users: User[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as User[];

      setApprovedAccounts(users.filter((u) => u.Status === "approved"));
      setPendingAccounts(users.filter((u) => u.Status === "pending"));
    };
    fetchAccounts();
  }, []);

  // Approve user


const confirmApprove = async () => {
  if (!assignedDepartment) {
    alert("Please select a department.");
    return;
  }

  if (!approvingUser) return;

  // ✅ 1. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(approvingUser.Email)) {
    alert("❌ Invalid email format. Please check the user's email address.");
    return;
  }

  try {
    // 2️⃣ Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    // 3️⃣ Create Firebase Auth account
    const userCred = await createUserWithEmailAndPassword(
      auth,
      approvingUser.Email,
      tempPassword
    );

    // 4️⃣ Update Firestore
    const userRef = doc(db, "IT_Supply_Users", approvingUser.id);
    await updateDoc(userRef, {
      Status: "approved",
      ActivationStatus: "pending",
      Department: assignedDepartment,
      AuthUID: userCred.user.uid,
    });

    // 5️⃣ Send email via EmailJS
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

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: approvingUser.Email,
      passcode: tempPassword,
      time: timeString,
      login_url: "https://192.168.254.188:5173",
      first_name: approvingUser.FirstName,
    });

    // 6️⃣ Update UI state
    setPendingAccounts(prev => prev.filter(u => u.id !== approvingUser.id));
    setApprovedAccounts(prev => [
      ...prev,
      {
        ...approvingUser,
        Status: "approved",
        Department: assignedDepartment,
        ActivationStatus: "pending",
      },
    ]);

    setApprovingUser(null);
    setAssignedDepartment("");
    alert("✅ User approved and temporary password emailed!");

  } catch (error: any) {
    console.error("Error approving user:", error);

    // ✅ Handle specific Firebase errors
    if (error.code === "auth/invalid-email") {
      alert("❌ The email address is invalid. Please update the user's email and try again.");
    } else if (error.code === "auth/email-already-in-use") {
      alert("❌ This email is already in use. The user may have been approved already.");
    } else if (error.code === "auth/operation-not-allowed") {
      alert("❌ Email/password sign-in is disabled in Firebase Authentication settings.");
    } else if (error.code === "auth/weak-password") {
      alert("❌ The generated password was too weak (unlikely, but possible). Please try again.");
    } else {
      // Generic error
      alert(`❌ Failed to approve user: ${error.message || 'An unexpected error occurred.'}`);
    }
  }
};

// ✅ Reject user
const confirmReject = async () => {
  if (rejectingUser) {
    try {
      const userRef = doc(db, "IT_Supply_Users", rejectingUser.id);

      // Example: current admin info (get from Firebase Auth or state/context)
      const currentAdmin = {
        id: auth.currentUser?.uid || "unknown",
        email: auth.currentUser?.email || "unknown",
        displayName: auth.currentUser?.displayName || "unknown",
      };

      // 1. Save rejected user into a backup collection
      const rejectedRef = doc(collection(db, "Rejected_Users"));
      await setDoc(rejectedRef, {
        ...rejectingUser,
        Status: "rejected",
        RejectedAt: new Date(),
        RejectedBy: currentAdmin, // 👈 who rejected the user
      });

      // 2. Delete them from active collection
      await deleteDoc(userRef);

      // 3. Update local state
      setPendingAccounts(prev =>
        prev.filter(u => u.id !== rejectingUser.id)
      );
      setRejectingUser(null);

      alert("User moved to Rejected_Users collection.");
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      alert(`Failed to reject user: ${error.message}`);
    }
  }
};


  return (
    <div className="dashboard-bodys">
      <div className={`dashboard-containers ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            {/* Programmatic navigation for logo (go to /dashboard) */}
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
                    className="dashboard-logos"
                    src="/logosaproject.jpg"
                    alt="DOH Logo"
                  />
                </div>

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

        {/* Main content */}
        <div className="main-content-admin">
          {currentView === 'dashadmin' && (
            <>
              {/* ✅ Dropdown */}
                  <div className="department-dropdown">
                    <label>Select Department: </label>
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

                  {/* ✅ Counter */}
                  <div className="info-counters">
                    <p>
                      <strong>
                        Total Approved in{" "}
                        {selectedDepartment === "All"
                          ? "All Departments"
                          : selectedDepartment}
                        :
                      </strong>{" "}
                      {approvedAccounts.filter(
                        (p) =>
                          selectedDepartment === "All" ||
                          p.Department === selectedDepartment
                      ).length}
                    </p>
                  </div>

                  {/* ✅ Table for approved users */}
                  <table className="people-table">
                    <thead>
                      <tr>
                        <th>Lastname</th>
                        <th>Firstname</th>
                        <th>M.I.</th>
                        <th>Department</th> {/* ✅ Changed from ID to Department */}
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedAccounts
                        .filter(
                          (p) =>
                            selectedDepartment === "All" ||
                            p.Department === selectedDepartment
                        )
                        .map((p) => (
                          <tr key={p.id}>
                            <td>{p.LastName}</td>
                            <td>{p.FirstName}</td>
                            <td>{p.MiddleInitial}</td>
                            <td>{p.Department}</td> {/* ✅ Show Department */}
                            <td>{p.Email}</td>
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
                      <td>{p.LastName}</td>
                      <td>{p.FirstName}</td>
                      <td>{p.MiddleInitial}</td>
                      <td>{p.Email}</td>
                      <td>
                        <div className='button-approve'>
                          <button className='approve-btn' onClick={() => setApprovingUser(p)}>Approve</button>
                          <button className='reject-btn' onClick={() => setRejectingUser(p)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Approve Modal */}
              {approvingUser && (
                <div className="modal-admin">
                  <div className="modal-contents">
                    <h3>Assign Department to {approvingUser.FirstName}</h3>
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

                    {/* Show ID Picture */}
                    {approvingUser.IDPictureBase64 && (
                      <div className="id-picture-preview">
                        <p>ID Picture:</p>
                        <img
                          src={approvingUser.IDPictureBase64}
                          alt="ID Preview"
                          style={{ width: "150px", height: "150px", objectFit: "cover", marginTop: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
                        />
                      </div>
                    )}

                    <div className='button-approves'>
                      <button className='confirm-btn' onClick={confirmApprove}>Confirm</button>
                      <button className='cancel-btn' onClick={() => setApprovingUser(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reject Modal */}
              {rejectingUser && (
                <div className="modal-admin">
                  <div className="modal-contents">
                    <p>Do you want to reject {rejectingUser.FirstName}?</p>
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
          {currentView === 'notif' && <Notifications />}
        </div>
      </div>
    </div>
  );
};

export default DashboardSuperAdmin;
