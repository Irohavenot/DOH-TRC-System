import { useState } from "react";

export default function RegisterForm({ toggle }: { toggle: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    alert(`Registered: ${firstName} ${middleInitial}. ${lastName} (${email})`);
  };

  return (
    <div className="form-card">
      <div className="login-head">
      <h2>Create an Account</h2>
      </div>
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="First Name" value={firstName} required onChange={(e) => setFirstName(e.target.value)} />
        <input type="text" placeholder="Middle Initial" value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value)} />
        <input type="text" placeholder="Last Name" value={lastName} required onChange={(e) => setLastName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} required onChange={(e) => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirm Password" value={confirmPassword} required onChange={(e) => setConfirmPassword(e.target.value)} />
        <button type="submit" className="login-button">Register</button>
      </form>
      <div className="switch">Already have an account? <span onClick={toggle}>Login</span></div>
    </div>
  );
}