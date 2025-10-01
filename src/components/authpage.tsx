import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import navigate
import Login from "./Login";
import Registe from "./Register";
import "../assets/auth.css"; // Import your CSS file

export default function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate(); // ✅ for programmatic navigation

  // These states are optional — if you need them to match your Dashboard
  const [currentView, setCurrentView] = useState("");
  const [activeView, setActiveView] = useState("");

  useEffect(() => {
    const wrapper = document.querySelector(".auth-wrapper") as HTMLElement;
    const switchLinks = document.querySelectorAll(".switch span");

    switchLinks.forEach((link) => {
      link.addEventListener("click", () => {
        wrapper?.classList.toggle("register-active");
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
          <div className="logo-container">
            {/* ✅ Clickable logo with navigate */}
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
                className="rounded-logo"
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
            isRegistering ? "slide-left" : "slide-right"
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
