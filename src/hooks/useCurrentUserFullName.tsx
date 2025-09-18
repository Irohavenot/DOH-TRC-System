// src/hooks/useCurrentUserFullName.tsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase"; // ✅ adjust path as needed
import { collection, query, where, getDocs } from "firebase/firestore";

export const useCurrentUserFullName = () => {
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullName = async () => {
      if (!auth.currentUser?.email) {
        setFullName(null);
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Email", "==", auth.currentUser.email)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          const firstName = userData.FirstName || "";
          const middleInitial = userData.MiddleInitial ? `${userData.MiddleInitial}.` : "";
          const lastName = userData.LastName || "";

          const name = [firstName, middleInitial, lastName].filter(Boolean).join(" ");
          setFullName(name);
        } else {
          setFullName(null);
        }
      } catch (err) {
        console.error("Failed to fetch user full name:", err);
        setFullName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFullName();
  }, []);

  return { fullName, loading };
};