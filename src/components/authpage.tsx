import { useEffect, useState } from "react";
import Login from "./Login";
import Registe from "./Register";
import "../assets/auth.css"; // Import your CSS file


export default function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const wrapper = document.querySelector('.auth-wrapper') as HTMLElement;
    const switchLinks = document.querySelectorAll('.switch span');

    switchLinks.forEach(link => {
      link.addEventListener('click', () => {
        wrapper?.classList.toggle('register-active');
      });
    });

    return () => {
      switchLinks.forEach(link => {
        link.removeEventListener('click', () => {});
      });
    };
  }, []);

  return (
  <div className="auth-page">
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="logo-container">
          <img className="rounded-logo" src="/dohlogo1.png" alt="DOH Logo" />
          <h1>Department of Health</h1>
          <h2>Treatment & Rehabilitation Center - Argao</h2>
          <p>IT Asset Tracking System</p>
        </div>
      </div>

      <div className={`auth-right ${isRegistering ? "slide-left" : "slide-right"}`}>
        {isRegistering ? (
          <Registe toggle={() => setIsRegistering(false)} />
        ) : (
          <Login toggle={() => setIsRegistering(true)} />
        )}
      </div>
    </div>
    </div>
  );
}
