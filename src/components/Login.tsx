import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase/firebase";
import { signInWithPopup } from "firebase/auth";


export default function LoginForm({ toggle }: { toggle: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      alert(`Logged in with: ${email}`);
      navigate("/dashboard");
    } else {
      alert("Please fill in all fields.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Optional: Call reCAPTCHA verification API here
      // (e.g., using Google reCAPTCHA enterprise or a backend validator)

      alert(`Signed in as: ${user.displayName}`);
      navigate("/dashboard");
    } catch (error) {
      alert("Google Sign-In Failed.");
      console.error(error);
    }
  };

  return (
    <div className="form-card">
      <div className="login-head">
      <h2>Log In</h2>
      </div>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} required onChange={(e) => setPassword(e.target.value)} />
        <button className="login-button" type="submit">Login</button>
      </form>

      <div className="or-divider">or</div>

      <button className="google-signin" onClick={handleGoogleSignIn}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
        Sign in with Google
      </button>

      <div className="switch">Don't have an account? <span onClick={toggle}>Register</span></div>
    </div>
  );
}