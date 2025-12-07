// Register.tsx (Updated with renamed classes)
import { useState, useEffect } from "react";
import { db } from "../firebase/firebase"; 
import { toast } from "react-toastify";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

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
  const [role, setRole] = useState<"Medical" | "IT" | "Other" | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [idPicture, setIdPicture] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordTemp, setShowPasswordTemp] = useState(false);
  const [showConfirmPasswordTemp, setShowConfirmPasswordTemp] = useState(false);

  const passwordErrors = validatePassword(password);

  useEffect(() => {
    const storedRole = localStorage.getItem("registerRole") as "Medical" | "IT" | "Other" | null;
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  useEffect(() => {
    if (role) {
      const collectionName = role === "Medical" ? "Medical_Position" : role === "IT" ? "IT_Position" : "Other_Position";
      getDocs(collection(db, collectionName))
        .then((snap) => {
          setPositions(snap.docs.map((d) => d.data().name));
        })
        .catch((error) => {
          console.error("Error loading positions:", error);
          toast.error("Failed to load positions.");
        });
    }
  }, [role]);

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const sendRegistrationReceivedEmail = async (email: string, name: string) => {
    try {
      const functions = (await import("firebase/functions")).getFunctions();
      const httpsCallable = (await import("firebase/functions")).httpsCallable;
      const sendEmail = httpsCallable(functions, "sendRegistrationReceivedEmail");
      await sendEmail({ email, name });
    } catch (error) {
      console.warn("Failed to send confirmation email:", error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idPicture) {
      toast.error("ID Picture is required.");
      return;
    }

    try {
      const pendingQuery = query(
        collection(db, "IT_Supply_Users"),
        where("Email", "==", email),
        where("Username", "==", username),
        where("Status", "==", "pending")
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      if (!pendingSnapshot.empty) {
        toast.warning("You already have a pending registration. Please wait for admin approval.");
        return;
      }

      const emailQuery = query(collection(db, "IT_Supply_Users"), where("Email", "==", email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        toast.error("This email is already in use.");
        return;
      }

      const usernameQuery = query(collection(db, "IT_Supply_Users"), where("Username", "==", username));
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        toast.error("This Username is already in use.");
        return;
      }

      toast.info("Submitting registration...");

      const idPicBase64 = await fileToBase64(idPicture);

      await addDoc(collection(db, "IT_Supply_Users"), {
        Email: email,
        Username: username,
        FirstName: firstName,
        LastName: lastName,
        MiddleInitial: middleInitial,
        Position: position,
        Department: role || "",
        Status: "pending",
        CreatedAt: new Date(),
        IDPictureBase64: idPicBase64,
      });

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
    <div className="auth-register-form-card">
      <div className="auth-register-head">
        <h2>Create an Account</h2>
      </div>
      <form onSubmit={handleRegister}>
        <label className="auth-register-label">Username</label>
        <input
          className="auth-register-input"
          type="text"
          placeholder="Username"
          value={username}
          required
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className="auth-register-row1">
          <div>
            <label className="auth-register-label">First Name</label>
            <input
              className="auth-register-input"
              type="text"
              placeholder="First Name"
              value={firstName}
              required
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="auth-register-label">Middle Initial</label>
            <input
              className="auth-register-input"
              type="text"
              placeholder="M.I."
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value)}
            />
          </div>
        </div>

        <div className="auth-register-row2">
          <div>
            <label className="auth-register-label">Last Name</label>
            <input
              className="auth-register-input"
              type="text"
              placeholder="Last Name"
              value={lastName}
              required
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label className="auth-register-label">Position (Please Refer to your DOH-TRC ID)</label>
            <select
              className="auth-register-select"
              value={position}
              required
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="" disabled>
                Position
              </option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="auth-register-label">Email for Verification</label>
        <input
          className="auth-register-input"
          type="email"
          placeholder="Email for Verification"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="auth-register-label">ID Picture (Required)</label>
        {idPicture && (
          <button
            type="button"
            className="auth-register-preview-btn"
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
          className="auth-register-file-input"
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

              if (file.size > 1024 * 1024) {
                toast.error("Image file size cannot exceed 1MB. Please upload a smaller image.");
                e.target.value = "";
                setIdPicture(null);
                return;
              }
            }
            setIdPicture(file);
          }}
        />

        <button type="submit" className="auth-register-button">
          Register
        </button>
      </form>

      <div className="auth-register-switch">
        Already have an account? <span onClick={toggle}>Login</span>
      </div>
    </div>
  );
}