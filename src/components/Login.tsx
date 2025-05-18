import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
export default function LoginForm({ toggle }: { toggle: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Example validation logic
    if (email && password) {
      alert(`Logged in with: ${email}`);
      navigate("/dashboard"); // Redirect to the dashboard route
    } else {
      alert("Please fill in all fields.");
    }
  };

  return (
    <div className="form-card">
      <h2>Log In</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} required onChange={(e) => setPassword(e.target.value)} />
        <button className="login-button" type="submit">Login</button>
      </form>
      <div className="switch">Don't have an account? <span onClick={toggle}>Register</span></div>
    </div>
  );
}