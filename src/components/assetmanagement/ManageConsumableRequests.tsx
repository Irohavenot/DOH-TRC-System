import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import "../../assets/manageconsumablerequests.css";

const ManageConsumableRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<any | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, "requested_consumables"));
      const list = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(list);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch consumable requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, { status: "Approved" });
      toast.success("Request approved successfully!");
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to approve request.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, { status: "Rejected" });
      toast.success("Request rejected.");
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to reject request.");
    }
  };

  const handleRelease = async (id: string) => {
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      await addDoc(collection(db, "consumables"), {
        name: req.name,
        type: req.type,
        quantity: req.quantity,
        unit: req.unit,
        createdBy: req.requestedBy,
        createdAt: serverTimestamp(),
      });

      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, { status: "Released" });

      toast.success("Request released and added to inventory!");
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to release request.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this request permanently?")) return;
    try {
      await deleteDoc(doc(db, "requested_consumables", id));
      toast.success("Request deleted.");
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to delete request.");
    }
  };

  const filteredRequests =
    filter === "All"
      ? requests
      : requests.filter((req) => req.status === filter);

  return (
    <div className="mcreq-function-container">
      <div className="mcreq-function-header">
        <h2>Consumable Requests</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mcreq-function-filter"
        >
          <option>All</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Released</option>
        </select>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <table className="mcreq-function-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Item Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req) => (
              <tr
                key={req.id}
                className={req.priority === "Urgent" ? "urgent-row" : ""}
              >
                <td>{req.requestId}</td>
                <td>{req.name}</td>
                <td>{req.type}</td>
                <td>
                  {req.quantity} {req.unit}
                </td>
                <td>
                  <span className={`priority-badge ${req.priority.toLowerCase()}`}>
                    {req.priority}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </td>
                <td>
                  <button className="view-btn" onClick={() => setSelected(req)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {selected && (
        <div className="mcreq-function-modal" onClick={() => setSelected(null)}>
          <div className="mcreq-function-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Request Details</h3>
            <div className="modal-details">
              <p><strong>Request ID:</strong> {selected.requestId}</p>
              <p><strong>Item Name:</strong> {selected.name}</p>
              <p><strong>Type:</strong> {selected.type}</p>
              <p><strong>Quantity:</strong> {selected.quantity} {selected.unit}</p>
              <p><strong>Priority:</strong> 
                <span className={`priority-badge ${selected.priority.toLowerCase()}`}>
                  {selected.priority}
                </span>
              </p>
              {selected.priority === "Urgent" && (
                <p><strong>Needed By:</strong> {selected.neededBy}</p>
              )}
              <p><strong>Department:</strong> {selected.department}</p>
              <p><strong>Requested By:</strong> {selected.requestedBy}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge ${selected.status.toLowerCase()}`}>
                  {selected.status}
                </span>
              </p>
              {selected.remarks && (
                <p><strong>Remarks:</strong> {selected.remarks}</p>
              )}
            </div>

            <div className="mcreq-function-modal-actions">
              <button className="close-btn" onClick={() => setSelected(null)}>
                Close
              </button>
              
              {selected.status === "Pending" && (
                <>
                  <button className="approve-btn" onClick={() => handleApprove(selected.id)}>
                    Approve
                  </button>
                  <button className="reject-btn" onClick={() => handleReject(selected.id)}>
                    Reject
                  </button>
                </>
              )}
              
              {selected.status === "Approved" && (
                <button className="release-btn" onClick={() => handleRelease(selected.id)}>
                  Release to Inventory
                </button>
              )}
              
              <button className="delete-btn" onClick={() => handleDelete(selected.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageConsumableRequests;