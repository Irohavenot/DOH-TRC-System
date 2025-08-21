import { useState, useEffect } from "react";
import { db } from "../firebase/firebase"; // Adjust path if needed
import { toast } from "react-toastify";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function RegisterForm({ toggle }: { toggle: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<"Medical" | "IT" | null>(null);
  const [username, setUsername] = useState("");
  const [idPicture, setIdPicture] = useState<File | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("registerRole") as
      | "Medical"
      | "IT"
      | null;
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);
  // Utility: Convert File to Base64
  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!idPicture) {
    toast.error("ID Picture is required.");
    return;
  }

  try {
    // Step 1 — Check if email is already in use (any status)
    const emailQuery = query(
      collection(db, "IT_Supply_Users"),
      where("Email", "==", email)
    );
    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      toast.error("This email is already in use.");
      return;
    }

    // Step 2 — Check if pending user already exists with the same username
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

    // Step 3 — Convert file to Base64
    const idPicBase64 = await fileToBase64(idPicture);

    // Step 4 — Save user data in Firestore (pending approval)
    await addDoc(collection(db, "IT_Supply_Users"), {
      Email: email,
      Username: username,
      FirstName: firstName,
      LastName: lastName,
      MiddleInitial: middleInitial,
      Position: position,
      Department: "", // admin can assign later
      Status: "pending",
      CreatedAt: new Date(),
      IDPictureBase64: idPicBase64,
    });

    toast.success("Registration submitted! Please wait for admin approval.");
  } catch (error) {
    console.error("Error registering user:", error);
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

        {/* 🔹 Show Medical options if role = Medical */}
        {role === "Medical" ? (
          <>
            <option value="Clinical">Clinical</option>
            <option value="Radiology">Radiology</option>
            <option value="Dental">Dental</option>
            <option value="DDE">DDE</option>
          </>
        ) : (
          // 🔹 Otherwise show IT options
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
              cursor: "pointer"
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
          onChange={(e) => setIdPicture(e.target.files?.[0] || null)}
          required
        />

        {/* Submit */}
        <button type="submit" className="login-button">Register</button>
      </form>

      <div className="switch">
        Already have an account? <span onClick={toggle}>Login</span>
      </div>
    </div>
  );
}
