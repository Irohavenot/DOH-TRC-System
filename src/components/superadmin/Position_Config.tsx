// Position_Config.tsx - Updated to show Full Name instead of Email
import { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import "../../superadmincss/positionconfig.css";

const departments = [
  { label: "IT Department", value: "IT_Position" },
  { label: "Medical Department", value: "Medical_Position" },
  { label: "Other", value: "Other_Position" },
];

interface Position {
  id: string;
  name: string;
  createdBy?: string;        // Now stores full name
  createdByEmail?: string;   // Optional: keep email for reference
  createdAt?: any;
  updatedBy?: string;        // Full name
  updatedByEmail?: string;
  updatedAt?: any;
}

const PositionConfig = () => {
  const [selectedDept, setSelectedDept] = useState("IT_Position");
  const [positions, setPositions] = useState<Position[]>([]);
  const [newPosition, setNewPosition] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Unknown User");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Fetch current user's full name from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserEmail(user.email || "");

        try {
          // Try common collections where user profiles are stored
          const possibleCollections = ["IT_Supply_Users", "users", "Employees"];

          let fullName = "Unknown User";

          for (const coll of possibleCollections) {
            const userDoc = await getDoc(doc(db, coll, user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              fullName = `${data.FirstName || ""} ${data.MiddleInitial ? data.MiddleInitial + ". " : ""}${data.LastName || ""}`.trim();
              if (fullName && fullName !== " ") {
                break;
              }
            }
          }

          setCurrentUserName(fullName || user.email || "Unknown User");
        } catch (err) {
          console.warn("Could not fetch user full name:", err);
          setCurrentUserName(user.email || "Unknown User");
        }
      } else {
        setCurrentUserName("Unknown User");
        setCurrentUserEmail("");
      }
    });

    return () => unsubscribe();
  }, []);

  const loadPositions = async () => {
    try {
      const snap = await getDocs(collection(db, selectedDept));
      const list: Position[] = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        createdBy: d.data().createdBy || "-",
        createdByEmail: d.data().createdByEmail,
        createdAt: d.data().createdAt,
        updatedBy: d.data().updatedBy || "-",
        updatedByEmail: d.data().updatedByEmail,
        updatedAt: d.data().updatedAt,
      }));
      setPositions(list);
    } catch (error) {
      console.error("Error loading positions:", error);
    }
  };

  useEffect(() => {
    loadPositions();
  }, [selectedDept]);

  // Add new position
  const addPosition = async () => {
    if (!newPosition.trim()) return alert("Enter a position name.");
    try {
      await addDoc(collection(db, selectedDept), {
        name: newPosition.trim(),
        createdBy: currentUserName,
        createdByEmail: currentUserEmail,
        createdAt: serverTimestamp(),
      });
      setNewPosition("");
      loadPositions();
    } catch (error) {
      console.error("Error adding position:", error);
    }
  };

  // Save Edit
  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await updateDoc(doc(db, selectedDept, editId), {
        name: editName.trim(),
        updatedBy: currentUserName,
        updatedByEmail: currentUserEmail,
        updatedAt: serverTimestamp(),
      });
      setEditId(null);
      setEditName("");
      loadPositions();
    } catch (error) {
      console.error("Error updating position:", error);
    }
  };

  // Delete position
  const removePosition = async (id: string) => {
    if (!confirm("Are you sure you want to delete this position?")) return;
    try {
      await deleteDoc(doc(db, selectedDept, id));
      setPositions((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting position:", error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      return timestamp.toDate().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="positionconfig-container">
      {/* ... rest of your JSX remains the same ... */}
      <div className="positionconfig-header">
        <h2>Position Configuration</h2>
        <p className="positionconfig-subtitle">
          Manage positions for different departments
        </p>
      </div>

      {/* Department Selector & Add */}
      <div className="positionconfig-card">
        <div className="positionconfig-selector">
          <label>Select Department:</label>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            {departments.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>

        <div className="positionconfig-add">
          <input
            type="text"
            placeholder="Enter new position"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addPosition()}
          />
          <button onClick={addPosition} className="add-btn">
            Add Position
          </button>
        </div>
      </div>

      <div className="positionconfig-count">
        <span>Total Positions: {positions.length}</span>
      </div>

      <div className="positionconfig-table-wrapper">
        {positions.length === 0 ? (
          <div className="positionconfig-empty">
            <p>No positions found for this department.</p>
          </div>
        ) : (
          <table className="positionconfig-table">
            <thead>
              <tr>
                <th>Position Name</th>
                <th>Added By</th>
                <th>Added At</th>
                <th>Updated By</th>
                <th>Updated At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id}>
                  <td className="position-name-cell">
                    {editId === pos.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <span className="position-name">{pos.name}</span>
                    )}
                  </td>

                  <td title={pos.createdByEmail}>{pos.createdBy}</td>
                  <td>{formatDate(pos.createdAt)}</td>
                  <td title={pos.updatedByEmail}>{pos.updatedBy}</td>
                  <td>{formatDate(pos.updatedAt)}</td>

                  <td>
                    <div className="action-buttons">
                      {editId === pos.id ? (
                        <>
                          <button onClick={saveEdit} className="save-btn">
                            Save
                          </button>
                          <button onClick={() => { setEditId(null); setEditName(""); }} className="cancel-btn">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(pos.id); setEditName(pos.name); }} className="edit-btn">
                            Edit
                          </button>
                          <button onClick={() => removePosition(pos.id)} className="delete-btn">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PositionConfig;