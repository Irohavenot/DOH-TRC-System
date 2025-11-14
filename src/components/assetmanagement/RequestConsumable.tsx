import React, { useState } from "react";
import { db, auth } from "../../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import "../../assets/requestconsumables.css";

const RequestConsumables: React.FC = () => {
  const [itemName, setItemName] = useState("");
  const [consumableType, setConsumableType] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [neededBy, setNeededBy] = useState("");
  const [department, setDepartment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUser = auth.currentUser;

  const consumableTypes = [
    "Medical/Clinical Consumable",
    "Sanitation Supplies",
    "Office Consumable",
    "Kitchen Supply",
    "Maintenance Supply",
  ];

  const departmentOptions = [
    "Clinical",
    "Dental",
    "Radiology",
    "Kitchen",
    "DDE",
    "Maintenance",
    "Information Technology",
    "Sanitation",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemName || !consumableType || !quantity || !unit || !department) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const userName =
        currentUser?.displayName || currentUser?.email || "Unknown User";

      const requestId = `REQ-${Date.now()}`;

      await addDoc(collection(db, "requested_consumables"), {
        requestId,
        name: itemName.trim(),
        type: consumableType,
        quantity: Number(quantity),
        unit: unit.trim(),
        priority,
        neededBy: priority === "Urgent" ? neededBy : "",
        department,
        remarks: remarks.trim(),
        status: "Pending",
        requestedBy: userName,
        requestedByUid: currentUser?.uid,
        requestedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        message: `New ${priority.toLowerCase()} consumable request: ${itemName} (${consumableType}) by ${userName}`,
        type: "requestedConsumable",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      toast.success("Consumable request submitted!");
      setItemName("");
      setConsumableType("");
      setQuantity(1);
      setUnit("");
      setPriority("Normal");
      setNeededBy("");
      setDepartment("");
      setRemarks("");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reqconsumable-outer-container">
      <div className="reqconsumable-function-container">
        <h2 className="reqconsumable-function-title">Request New Consumable</h2>

        <form className="reqconsumable-function-form" onSubmit={handleSubmit}>
          <div className="reqconsumable-function-field">
            <label>Consumable Name</label>
            <input
              type="text"
              placeholder="Enter item name (e.g., Alcohol Bottles)"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="reqconsumable-function-field">
            <label>Consumable Type</label>
            <select
              value={consumableType}
              onChange={(e) => setConsumableType(e.target.value)}
              required
            >
              <option value="">-- Select Type --</option>
              {consumableTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="reqconsumable-function-field">
            <label>Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div className="reqconsumable-function-field">
            <label>Unit</label>
            <input
              type="text"
              placeholder="e.g., bottles, boxes"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>

          <div className="reqconsumable-function-field">
            <label>Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            >
              <option value="">-- Select Department --</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="reqconsumable-function-field">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {priority === "Urgent" && (
            <div className="reqconsumable-function-field">
              <label>Needed By</label>
              <input
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                required={priority === "Urgent"}
              />
            </div>
          )}

          <div className="reqconsumable-function-field">
            <label>Remarks</label>
            <textarea
              placeholder="Optional notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequestConsumables;
