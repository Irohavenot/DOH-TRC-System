// src/pages/VerifyAccount.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { toast } from "react-toastify";

export default function VerifyAccount() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = searchParams.get("uid");

    if (!uid) {
      toast.error("Invalid verification link.");
      setLoading(false);
      return;
    }

    const verifyUser = async () => {
      try {
        await updateDoc(doc(db, "IT_Supply_Users", uid), {
          CustomVerified: true
        });
        toast.success("✅ Account verified! You can now log in.");
      } catch (err) {
        console.error("Verification failed:", err);
        toast.error("Failed to verify account.");
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, [searchParams]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {loading ? <p>Verifying your account...</p> : <p>You may close this tab now.</p>}
    </div>
  );
}
