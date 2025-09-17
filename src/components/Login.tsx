import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, provider, db } from "../firebase/firebase";
import {
  signInWithPopup,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "react-toastify";

export default function LoginForm({ toggle }: { toggle: () => void }) {
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from as Location | undefined;

  // Compute where to go after successful auth
  const targetAfterLogin =
    from ? `${from.pathname}${from.search}${from.hash}` : "/dashboard";

  // Load saved identifier on mount
  useEffect(() => {
    const saved = localStorage.getItem("lastIdentifier");
    if (saved) setIdentifier(saved);
  }, []);

  // Handle redirect-based Google sign-in result (mobile-friendly)
  useEffect(() => {
  (async () => {
    try {
      const result = await getRedirectResult(auth);
      if (!result) return; // <-- important: no result, do nothing
      const email = result.user.email;

      await postSignInChecks(email, /*isGoogle=*/true);
      toast.success(`Signed in as ${email}`); // toast here once
      navigate(targetAfterLogin, { replace: true });
    } catch (e) {
      console.error(e);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // run once

  // Centralized checks after any successful sign-in
  async function postSignInChecks(email: string | null | undefined, isGoogle = false) {
  if (!email) {
    toast.error("No email found on the account.");
    throw new Error("missing-email");
  }

  localStorage.setItem("lastIdentifier", email);

  if (isGoogle) {
    const qUsers = query(collection(db, "IT_Supply_Users"), where("Email", "==", email));
    const snap = await getDocs(qUsers);
    if (snap.empty) {
      toast.error("Google account not registered in system.");
      await auth.signOut();
      throw new Error("unregistered-google");
    }
  }

  if (!auth.currentUser?.emailVerified) {
    try {
      await sendEmailVerification(auth.currentUser!);
      toast.error("Email not verified. Verification email sent.");
    } catch {
      toast.error("Email not verified. Please check your inbox.");
    }
    throw new Error("email-not-verified");
  }
}


  // Email/Username + Password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      let emailToLogin = identifier;

      // Save early for UX
      localStorage.setItem("lastIdentifier", identifier);

      // If not an email, treat as username -> resolve email
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

      await signInWithEmailAndPassword(auth, emailToLogin, password);
      await postSignInChecks(emailToLogin, /*isGoogle=*/false);
      toast.success(`Signed in as ${emailToLogin}`);
      navigate(targetAfterLogin, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Invalid credentials.");
    }
  };

  // Google sign-in with popup → redirect fallback
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      await postSignInChecks(email, /*isGoogle=*/true);
      toast.success(`Signed in as ${email}`);
      navigate(targetAfterLogin, { replace: true });
    } catch (e: any) {
      // Common mobile/blocked popup cases → fallback to redirect
      if (
        e?.code === "auth/popup-blocked" ||
        e?.code === "auth/operation-not-supported-in-this-environment" ||
        e?.code === "auth/unauthorized-domain"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      console.error(e);
      toast.error("Google Sign-In Failed.");
    }
  };

  // Register role modal handler
  const handleRegisterChoice = (role: "Medical" | "IT") => {
    localStorage.setItem("registerRole", role);
    setShowRegisterModal(false);
    toggle(); // switch to your Register form
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
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
