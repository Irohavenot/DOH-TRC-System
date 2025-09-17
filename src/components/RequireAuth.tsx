// RequireAuth.tsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function RequireAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  if (user === undefined) {
    return <div style={{ padding: 24 }}>Loading…</div>; // or your spinner
  }

  if (!user) {
    // Go to /login and remember where we came from
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
