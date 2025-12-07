import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import Registe from "./Register";
import "../assets/auth.css";

export default function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState("");
  const [activeView, setActiveView] = useState("");

  useEffect(() => {
    const wrapper = document.querySelector(".auth-wrapper") as HTMLElement;
    const switchLinks = document.querySelectorAll(".auth-login-switch span, .auth-register-switch span");

    switchLinks.forEach((link) => {
      link.addEventListener("click", () => {
        wrapper?.classList.toggle("auth-register-active");
      });
    });

    return () => {
      switchLinks.forEach((link) => {
        link.removeEventListener("click", () => {});
      });
    };
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-left">
          <div className="auth-logo-container">
            <div
              onClick={() => {
                setCurrentView("dashboard");
                setActiveView("dashboard");
                navigate("/dashadmin");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setCurrentView("dashboard");
                  setActiveView("dashboard");
                  navigate("/dashadmin");
                }
              }}
              style={{ cursor: "pointer", display: "inline-block" }}
              aria-label="Go to dashadmin"
            >
              <img
                className="auth-rounded-logo"
                src="/dohlogo1.png"
                alt="DOH Logo"
              />
            </div>

            <h1>Department of Health</h1>
            <h2>Treatment & Rehabilitation Center - Argao</h2>
            <p>IT Asset Tracking System</p>
          </div>
        </div>

        <div
          className={`auth-right ${
            isRegistering ? "auth-slide-left" : "auth-slide-right"
          }`}
        >
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