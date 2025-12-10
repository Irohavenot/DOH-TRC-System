// Login.tsx (Updated with renamed classes)
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, provider, db } from "../firebase/firebase";
import {
  signInWithPopup,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  User,
  deleteUser,
  sendPasswordResetEmail,
} from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

type UserStatus = "email_pending" | "pending" | "approved" | "rejected";

interface ITSupplyUser {
  id: string;
  Email: string;
  Username: string;
  FirstName: string;
  LastName: string;
  MiddleInitial?: string;
  Position?: string;
  Department: string;
  Status: UserStatus;
  EmailVerified: boolean;
  CreatedAt: any;
  AuthUID: string;
  IDPictureBase64?: string;
}

export default function LoginForm({ toggle }: { toggle: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from as Location | undefined;
  const [showPasswordTemp, setShowPasswordTemp] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPasswordTemp(true);
    setTimeout(() => setShowPasswordTemp(false), 1000);
  };

  const targetAfterLogin =
    from ? `${from.pathname}${from.search}${from.hash}` : "/dashboard";

  useEffect(() => {
    const saved = localStorage.getItem("lastIdentifier");
    if (saved) setIdentifier(saved);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result) return;
        await postSignInChecks(result.user, true);
        toast.success(`Signed in using ${result.user.email}`);
        navigate(targetAfterLogin, { replace: true });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

const findUserDocByEmail = async (email: string): Promise<ITSupplyUser | null> => {
  const q = query(collection(db, "IT_Supply_Users"), where("Email", "==", email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as ITSupplyUser;
};


async function postSignInChecks(currentUser: User, isGoogle = false) {
  const { email, uid } = currentUser;

  if (!email) {
    toast.error("No email found on this account.");
    await auth.signOut();
    throw new Error("missing-email");
  }

  localStorage.setItem("lastIdentifier", email);

  // 🔍 Find user by email (NOT by AuthUID)
  const userDoc = await findUserDocByEmail(email);

  if (!userDoc) {
    toast.error("Account not registered in the system.");
    await auth.signOut();
    throw new Error("unregistered-user");
  }

  // 🔄 Auto-update AuthUID in Firestore if it's missing or outdated
  if (!userDoc.AuthUID || userDoc.AuthUID !== uid) {
    const userRef = doc(db, "IT_Supply_Users", userDoc.id);
    await updateDoc(userRef, { AuthUID: uid });

    console.log("🔄 AuthUID updated in Firestore for:", email);
  }

  // 🔐 Status checks
  if (userDoc.Status === "email_pending") {
    const ref = doc(db, "IT_Supply_Users", userDoc.id);
    await updateDoc(ref, {
      Status: "pending",
      EmailVerified: true,
    });

    toast.info("Email verified! Awaiting approval.");
    await auth.signOut();
    throw new Error("awaiting-approval");
  }

  if (userDoc.Status !== "approved") {
    toast.error("Your account is pending admin approval.");
    await auth.signOut();
    throw new Error("not-approved");
  }

  return userDoc;
}


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      let emailToLogin = identifier;
      localStorage.setItem("lastIdentifier", identifier);

      if (!identifier.includes("@")) {
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Username", "==", identifier)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          toast.error("Invalid credentials");
          return;
        }

        emailToLogin = snap.docs[0].data().Email;
      }

      if (identifier.includes("@")) {
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Email", "==", identifier)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          toast.error("Invalid credentials");
          return;
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, password);
      await postSignInChecks(userCredential.user, false);
      toast.success(`Signed in as ${emailToLogin}`);
      navigate(targetAfterLogin, { replace: true });
    } catch (error: any) {
      if ([
        "missing-email",
        "unregistered-user",
        "email-not-verified",
        "awaiting-approval",
        "not-approved"
      ].includes(error.message)) {
        return;
      }
      console.error("Login error:", error);
      toast.error("Invalid credentials or unexpected error.");
    }
  };

const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, provider);

    try {
      await postSignInChecks(result.user, true);
      toast.success(`Signed in using ${result.user.email}`);
      navigate(targetAfterLogin, { replace: true });

    } catch (err: any) {
      console.warn("Google login blocked:", err.message);

      await auth.signOut(); // SAFE — no more deleting users
      toast.error("Google account not authorized or not approved.");
    }

  } catch (e: any) {
    if ([
      "auth/popup-blocked",
      "auth/operation-not-supported-in-this-environment",
      "auth/unauthorized-domain"
    ].includes(e?.code)) {
      await signInWithRedirect(auth, provider);
      return;
    }

    console.error(e);
    toast.error("Google Sign-In Failed.");
  }
};


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      const q = query(collection(db, "IT_Supply_Users"), where("Email", "==", resetEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("No account found with this email.");
        setResetLoading(false);
        return;
      }

      const userDoc = snap.docs[0].data();
      const status = userDoc.Status as UserStatus;

      if (status === "rejected") {
        toast.error("This account has been rejected. Contact admin.");
        setResetLoading(false);
        return;
      }

      if (status === "email_pending") {
        toast.error("Please verify your email first using the link sent during registration.");
        setResetLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Forgot password error:", error);
      if (error.code === "auth/user-not-found") {
        toast.error("No account found with this email.");
      } else {
        toast.error("Failed to send reset email. Try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleRegisterChoice = (role: "Medical" | "IT" | "Other") => {
    localStorage.setItem("registerRole", role);
    setShowRegisterModal(false);
    toggle();
  };

  return (
    <div className="auth-login-form-card">
      <div className="auth-login-head">
        <h2>Log In</h2>
      </div>

      <form onSubmit={handleLogin}>
        <label className="auth-login-label">
          Username or Email:
          <input
            className="auth-login-input"
            type="text"
            placeholder="Username or Email"
            value={identifier}
            required
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>

        <label className="auth-login-label">
          Password:
          <div className="auth-login-password-wrapper">
            <input
              className="auth-login-input"
              type={showPasswordTemp ? "text" : "password"}
              placeholder="Password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="auth-login-eye-icon" onClick={togglePasswordVisibility}>
              <FontAwesomeIcon icon={faEye} />
            </span>
          </div>
        </label>

        <button className="auth-login-button" type="submit">
          Login
        </button>

        <div className="auth-login-forgot-link-container">
          <span
            className="auth-login-forgot-link"
            onClick={() => {
              setShowForgotPassword(true);
              setResetEmail(identifier || '');
            }}
          >
            Forgot Password?
          </span>
        </div>
      </form>

      <div className="auth-login-divider">or</div>

      <button className="auth-login-google-btn" onClick={handleGoogleSignIn}>
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
        />
        Sign in with Google
      </button>

      <div className="auth-login-switch">
        Don't have an account?{" "}
        <span onClick={() => setShowRegisterModal(true)}>Register</span>
      </div>

      {showRegisterModal && (
        <div className="auth-login-modal-overlay">
          <div className="auth-login-modal-content">
            <h3>Register As:</h3>
            <p>(This only Shows the admin your Preferred Position)</p>
            <p>(Please refer to your DOH-TRC ID to avoid mismatch)</p>
            <div className="auth-login-modal-buttons">
              <button className="auth-login-role-btn" onClick={() => handleRegisterChoice("Medical")}>
                Medical Department Personnel
              </button>
              <button className="auth-login-role-btn" onClick={() => handleRegisterChoice("IT")}>
                IT Department Personnel
              </button>
              <button className="auth-login-role-btn" onClick={() => handleRegisterChoice("Other")}>
                Other Department Personnel
              </button>
            </div>
            <button className="auth-login-close-btn" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showForgotPassword && (
        <div className="auth-login-forgot-overlay">
          <div className="auth-login-forgot-modal">
            <h3 className="auth-login-forgot-title">Reset Password</h3>
            <p className="auth-login-forgot-desc">
              Enter your email to receive a password reset link.
            </p>

            {resetSent ? (
              <div className="auth-login-forgot-success">
                <p>Check your email for the reset link!</p>
                <button
                  className="auth-login-forgot-btn auth-login-forgot-btn-primary"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail("");
                  }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="auth-login-forgot-form">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="auth-login-forgot-input"
                  autoFocus
                />
                <div className="auth-login-forgot-actions">
                  <button
                    type="button"
                    className="auth-login-forgot-btn auth-login-forgot-btn-cancel"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail("");
                      setResetSent(false);
                    }}
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="auth-login-forgot-btn auth-login-forgot-btn-submit"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}