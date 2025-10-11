import { useState, useEffect } from "react";
import { db } from "../firebase/firebase"; // 🔑 Removed `auth` import
import { toast } from "react-toastify";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
// 🔑 Removed Firebase Auth imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

// Helper: Validate password strength
const validatePassword = (password: string) => {
  const errors = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("Include uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Include lowercase letter");
  if (!/\d/.test(password)) errors.push("Include numeric character");
  return errors;
};

export default function RegisterForm({ toggle }: { toggle: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<"Medical" | "IT" | null>(null);
  const [username, setUsername] = useState("");
  const [idPicture, setIdPicture] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordTemp, setShowPasswordTemp] = useState(false);
  const [showConfirmPasswordTemp, setShowConfirmPasswordTemp] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPasswordTemp(true);
    setTimeout(() => setShowPasswordTemp(false), 1000);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPasswordTemp(true);
    setTimeout(() => setShowConfirmPasswordTemp(false), 1000);
  };

  const passwordErrors = validatePassword(password);

  useEffect(() => {
    const storedRole = localStorage.getItem("registerRole") as "Medical" | "IT" | null;
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // 🔑 Optional: Send custom email via Resend (via Cloud Function)
  const sendRegistrationReceivedEmail = async (email: string, name: string) => {
    try {
      // Call your Cloud Function that uses Resend
      const functions = (await import("firebase/functions")).getFunctions();
      const httpsCallable = (await import("firebase/functions")).httpsCallable;
      const sendEmail = httpsCallable(functions, "sendRegistrationReceivedEmail");
      await sendEmail({ email, name });
    } catch (error) {
      console.warn("Failed to send confirmation email:", error);
      // Don't block registration if email fails
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idPicture) {
      toast.error("ID Picture is required.");
      return;
    }

    if (passwordErrors.length > 0) {
      toast.error("Please fix password requirements.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      // 🔍 Check if email already used
      const emailQuery = query(collection(db, "IT_Supply_Users"), where("Email", "==", email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        toast.error("This email is already in use.");
        return;
      }

      // 🔍 Check if username already has a pending registration
      const pendingQuery = query(
        collection(db, "IT_Supply_Users"),
        where("Username", "==", username),
        where("Status", "==", "pending")
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      if (!pendingSnapshot.empty) {
        toast.warning("You already have a pending registration. Please wait for admin approval.");
        return;
      }

      toast.info("Submitting registration...");

      // 🖼️ Convert ID picture
      const idPicBase64 = await fileToBase64(idPicture);

      // 📦 Save ONLY to Firestore (no Auth account created!)
      await addDoc(collection(db, "IT_Supply_Users"), {
        Email: email,
        Username: username,
        FirstName: firstName,
        LastName: lastName,
        MiddleInitial: middleInitial,
        Position: position,
        Department: "",
        Status: "pending", // 👈 Back to "pending" (not "email_pending")
        CreatedAt: new Date(),
        IDPictureBase64: idPicBase64,
        // 🔑 NO AuthUID or EmailVerified fields
      });

      // 🔑 Optional: Send custom "Registration Received" email
      await sendRegistrationReceivedEmail(email, `${firstName} ${lastName}`);

      toast.success(
        "Registration submitted successfully! " +
        "Please wait for admin approval. You'll receive an email when approved."
      );
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error("Failed to register. Please try again.");
    }
  };

  return (
    <div className="form-card">
      <div className="login-head">
        <h2>Create an Account</h2>
      </div>
      <form onSubmit={handleRegister}>
        {/* Username */}
        <label>Username</label>
        <input
          type="text"
          placeholder="Username"
          value={username}
          required
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* First Name + Middle Initial */}
        <div className="register-row">
          <div>
            <label>First Name</label>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              required
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label>Middle Initial</label>
            <input
              type="text"
              placeholder="M.I."
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value)}
            />
          </div>
        </div>

        {/* Last Name + Position */}
        <div className="register-row">
          <div>
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              required
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label>Position</label>
            <select
              value={position}
              required
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="" disabled>
                Position
              </option>
              {role === "Medical" ? (
                <>
                  <option value="Clinical">Clinical</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Dental">Dental</option>
                  <option value="DDE">DDE</option>
                </>
              ) : (
                <>
                  <option value="Supply Unit">Supply Unit</option>
                  <option value="IT Personnel">IT Personnel</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Email */}
        <label>Email for Verification</label>
        <input
          type="email"
          placeholder="Email for Verification"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <label>Password</label>
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
        {/* 🔒 Real-time password requirements */}
        <div style={{ marginTop: "-10px", fontSize: "12px", color: "#555" }}>
          Password must contain:
          <ul style={{ margin: "4px 0 0 16px", paddingLeft: 0, listStyle: "none" }}>
            {["At least 8 characters", "Include uppercase letter", "Include lowercase letter", "Include numeric character"].map(
              (rule) => (
                <li
                  key={rule}
                  style={{
                    color: passwordErrors.includes(rule) ? "#d32f2f" : "#2e7d32",
                    fontWeight: passwordErrors.includes(rule) ? "normal" : "bold",
                  }}
                >
                  • {rule}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Confirm Password */}
        <label>Confirm Password</label>
        <div className="password-wrapper">
          <input
            type={showConfirmPasswordTemp ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            required
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <span className="eye-icon" onClick={toggleConfirmPasswordVisibility}>
            <FontAwesomeIcon icon={faEye} />
          </span>
        </div>
        {password && confirmPassword && password !== confirmPassword && (
          <div style={{ color: "#d32f2f", fontSize: "12px", marginTop: "-13px" }}>
            ❌ Passwords do not match
          </div>
        )}

        {/* ID Picture */}
        <label>ID Picture (Required)</label>
        {idPicture && (
          <button
            type="button"
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              backgroundColor: "#007BFF",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => {
              const imageUrl = URL.createObjectURL(idPicture);
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.write(`
                  <html>
                    <head><title>Image Preview</title></head>
                    <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#000;">
                      <img src="${imageUrl}" style="max-width:100%;max-height:100%;" />
                    </body>
                  </html>
                `);
              }
            }}
          >
            Preview Image
          </button>
        )}
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (file) {
              if (!file.type.startsWith("image/")) {
                toast.error("Only image files are allowed.");
                e.target.value = "";
                setIdPicture(null);
                return;
              }
            }
            setIdPicture(file);
          }}
        />

        <button type="submit" className="login-button">
          Register
        </button>
      </form>

      <div className="switch">
        Already have an account? <span onClick={toggle}>Login</span>
      </div>
    </div>
  );
}