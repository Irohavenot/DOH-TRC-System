import React, { useState } from "react";
import axios from "axios";
import "../../assets/request.css";

const RequestConsumable: React.FC = () => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Submitting request:", { itemName, quantity, reason });

    try {
      const response = await axios.post("/api/consumables/request", {
        itemName,
        quantity,
        reason,
      });
      console.log("Response:", response.data);
      alert(`Request for "${itemName}" submitted successfully!`);
      setItemName("");
      setQuantity(1);
      setReason("");
    } catch (error: any) {
      console.error("Submission error:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
        alert(error.response.data.message || "Successfully submitted the request.");
      } else if (error.request) {
        console.error("Request made but no response:", error.request);
        alert("No response from server. Please try again later.");
      } else {
        console.error("Error setting up request:", error.message);
        alert("Error submitting request. Please check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="request-container">
      <h2>Request Consumable Item</h2>
      <form onSubmit={handleSubmit} className="request-form">
        <div>
          <label htmlFor="itemName">Item Name</label>
          <select
            id="itemName"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a consumable
            </option>
            <option value="Printer Ink">Printer Ink</option>
            <option value="Bond Paper">Bond Paper</option>
            <option value="USB Drive">USB Drive</option>
            <option value="Battery AA">Battery AA</option>
            <option value="Stapler">Stapler</option>
            {/* Add more options as needed */}
          </select>
        </div>

        <div>
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label htmlFor="reason">Reason for Request</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
};

export default RequestConsumable;
