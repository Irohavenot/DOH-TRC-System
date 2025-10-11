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
} from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

// 🔑 Define allowed status values
type UserStatus = "email_pending" | "pending" | "approved" | "rejected";

// 🔑 Define user document structure from Firestore
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
  CreatedAt: any; // Firestore Timestamp or Date
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔑 Type-safe: Fetch user doc by AuthUID
  const findUserDocByAuthUID = async (uid: string): Promise<ITSupplyUser | null> => {
    const q = query(collection(db, "IT_Supply_Users"), where("AuthUID", "==", uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docData = snapshot.docs[0].data();
    const id = snapshot.docs[0].id;

    // Validate required fields
    if (!docData.Email || !docData.AuthUID || !docData.hasOwnProperty('Status')) {
      console.warn("User document missing required fields:", { id, ...docData });
      return null;
    }

    // Ensure Status is valid
    const validStatuses: UserStatus[] = ["email_pending", "pending", "approved", "rejected"];
    const status = docData.Status as string;
    if (!validStatuses.includes(status as UserStatus)) {
      console.warn("Invalid Status value:", status);
      return null;
    }

    return {
      id,
      Email: docData.Email,
      Username: docData.Username,
      FirstName: docData.FirstName,
      LastName: docData.LastName,
      MiddleInitial: docData.MiddleInitial,
      Position: docData.Position,
      Department: docData.Department || "",
      Status: status as UserStatus, // ✅ Safe cast after validation
      EmailVerified: docData.EmailVerified ?? false,
      CreatedAt: docData.CreatedAt || new Date(),
      AuthUID: docData.AuthUID,
      IDPictureBase64: docData.IDPictureBase64,
    };
  };

  // ✅ Updated: Centralized post-sign-in logic
  async function postSignInChecks(currentUser: User, isGoogle = false) {
    const { email, uid, emailVerified } = currentUser;

    if (!email) {
      toast.error("No email found on the account.");
      await auth.signOut();
      throw new Error("missing-email");
    }

    localStorage.setItem("lastIdentifier", email);

    const userDoc = await findUserDocByAuthUID(uid);
    if (!userDoc) {
      toast.error(isGoogle 
        ? "Google account not registered in system." 
        : "Account not found in system."
      );
      await auth.signOut();
      throw new Error("unregistered-user");
    }

    if (!emailVerified) {
      try {
        await sendEmailVerification(currentUser);
        toast.error("Please verify your email first. A new verification email was sent.");
      } catch {
        toast.error("Email not verified. Please check your inbox.");
      }
      await auth.signOut();
      throw new Error("email-not-verified");
    }

    // 🔄 Promote email_pending → pending on first verified login
    if (userDoc.Status === "email_pending") {
      const userRef = doc(db, "IT_Supply_Users", userDoc.id);
      await updateDoc(userRef, {
        Status: "pending",
        EmailVerified: true,
      });
      toast.info("Email verified! Your registration is now pending admin approval.");
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
        const qUsers = query(
          collection(db, "IT_Supply_Users"),
          where("Username", "==", identifier)
        );
        const snap = await getDocs(qUsers);
        if (snap.empty) {
          toast.error("Username not found.");
          return;
        }
        emailToLogin = snap.docs[0].data().Email;
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
      await postSignInChecks(result.user, true);
      toast.success(`Signed in using ${result.user.email}`);
      navigate(targetAfterLogin, { replace: true });
    } catch (e: any) {
      if (
        e?.code === "auth/popup-blocked" ||
        e?.code === "auth/operation-not-supported-in-this-environment" ||
        e?.code === "auth/unauthorized-domain"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (![
        "unregistered-user",
        "email-not-verified",
        "not-approved",
        "awaiting-approval"
      ].some(msg => e?.message?.includes(msg))) {
        console.error(e);
        toast.error("Google Sign-In Failed.");
      }
    }
  };

  const handleRegisterChoice = (role: "Medical" | "IT") => {
    localStorage.setItem("registerRole", role);
    setShowRegisterModal(false);
    toggle();
  };

  return (
    <div className="form-card">
      <div className="login-head">
        <h2>Log In</h2>
      </div>

      <form onSubmit={handleLogin}>
        <label>
          Username or Email:
          <input
            type="text"
            placeholder="Username or Email"
            value={identifier}
            required
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>

        <label>
          Password:
          <div className="password-wrapper">
            <input
              type={showPasswordTemp ? "text" : "password"}
              placeholder="Password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="eye-icon" onClick={togglePasswordVisibility}>
              <FontAwesomeIcon icon={faEye} />
            </span>
          </div>
        </label>

        <button className="login-button" type="submit">
          Login
        </button>
      </form>

      <div className="or-divider">or</div>

      <button className="google-signin" onClick={handleGoogleSignIn}>
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
        />
        Sign in with Google
      </button>

      <div className="switch">
        Don't have an account?{" "}
        <span onClick={() => setShowRegisterModal(true)}>Register</span>
      </div>

      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Register As:</h3>
            <div className="modal-buttons">
              <button className="role-btn" onClick={() => handleRegisterChoice("Medical")}>
                Medical Department Personnel
              </button>
              <button className="role-btn" onClick={() => handleRegisterChoice("IT")}>
                IT Department Personnel
              </button>
            </div>
            <button className="close-btn" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}