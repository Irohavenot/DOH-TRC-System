import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, db } from "../firebase/firebase";
import {
  signInWithPopup,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "react-toastify";

export default function LoginForm({ toggle }: { toggle: () => void }) {
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const navigate = useNavigate();

  // 🔹 Load saved identifier from localStorage on mount
  useEffect(() => {
    const savedIdentifier = localStorage.getItem("lastIdentifier");
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
    }
  }, []);

  // 🔹 Handle Register Choice
  const handleRegisterChoice = (role: "Medical" | "IT") => {
    localStorage.setItem("registerRole", role); // store selection for Register page
    setShowRegisterModal(false);
    toggle(); // call parent toggle to switch to Register form
  };

  // 🔹 Login with Email or Username
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      let emailToLogin = identifier;

      // Save to localStorage for next time
      localStorage.setItem("lastIdentifier", identifier);

      // If it's not an email, treat as username
      if (!identifier.includes("@")) {
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Username", "==", identifier)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          toast.error("Username not found.");
          return;
        }
        emailToLogin = snapshot.docs[0].data().Email;
      }

      // Sign in with email/password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailToLogin,
        password
      );
      const user = userCredential.user;
      if (!user.emailVerified) {
        toast.error("Please verify your email before logging in.");
        return;
      }

      toast.success(
        <>
          Login successful! <br />
          Welcome {user.displayName}
        </>
      );
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Invalid credentials.");
    }
  };

  // 🔹 Google Sign-In but only for registered emails
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save email to localStorage for next time
      if (user.email) {
        localStorage.setItem("lastIdentifier", user.email);
      }

      // Check if email exists in Firestore
      const q = query(
        collection(db, "IT_Supply_Users"),
        where("Email", "==", user.email)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error("Google account not registered in system.");
        await auth.signOut();
        return;
      }

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        toast.error("Email not verified. Verification email sent.");
        return;
      }

      toast.success(`Google Sign-In successful! Signed-in as ${user.email}`);
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Google Sign-In Failed.");
    }
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

      {/* 🔹 Register Role Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Register As:</h3>
            <div className="modal-buttons">
              <button
                className="role-btn"
                onClick={() => handleRegisterChoice("Medical")}
              >
                Medical Department Personnel
              </button>
              <button
                className="role-btn"
                onClick={() => handleRegisterChoice("IT")}
              >
                IT Department Personnel
              </button>
            </div>
            <button
              className="close-btn"
              onClick={() => setShowRegisterModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
