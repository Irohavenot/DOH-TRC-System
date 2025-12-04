// src/hooks/useCurrentUserFullName.tsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
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
          const middleName = userData.MiddleInitial || userData.middleName || "";
          const lastName = userData.LastName || "";

          // ✅ Format middle name as single letter with period
          let middleInitial = "";
          if (middleName) {
            // Take first character and add period
            middleInitial = middleName.charAt(0).toUpperCase() + ".";
          }

          const name = [firstName, middleInitial, lastName]
            .filter(Boolean)
            .join(" ");
          
          setFullName(name || "User");
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