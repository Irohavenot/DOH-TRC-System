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
  const [deletedRequests, setDeletedRequests] = useState<any[]>([]);
  const [releasedRequests, setReleasedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "deleted" | "released">("active");

  const sortRequestsByPriority = (requestList: any[]) => {
    return [...requestList].sort((a, b) => {
      if (a.priority === "Urgent" && b.priority !== "Urgent") return -1;
      if (a.priority !== "Urgent" && b.priority === "Urgent") return 1;
      return 0;
    });
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, "requested_consumables"));
      const list = querySnap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((req) => req.status !== "Released"); // Exclude released items
      const sortedList = sortRequestsByPriority(list);
      setRequests(sortedList);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch consumable requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedRequests = async () => {
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, "deleted_requests"));
      const list = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDeletedRequests(list);
    } catch (error) {
      console.error("Error fetching deleted requests:", error);
      toast.error("Failed to fetch deleted requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReleasedRequests = async () => {
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, "consumables"));
      const list = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: "Released", // Add status for display consistency
      }));
      setReleasedRequests(list);
    } catch (error) {
      console.error("Error fetching released requests:", error);
      toast.error("Failed to fetch released requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "active") {
      fetchRequests();
    } else if (viewMode === "deleted") {
      fetchDeletedRequests();
    } else {
      fetchReleasedRequests();
    }
  }, [viewMode]);

  const generateDeleteId = () => {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    return `DEL-${randomNum}`;
  };

  const handleApprove = async (id: string) => {
    try {
      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, { status: "Approved" });
      toast.success("Request approved successfully!");
      setSelected(null);
      
      // Refresh current view
      if (viewMode === "active") {
        fetchRequests();
      }
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
      
      // Refresh current view
      if (viewMode === "active") {
        fetchRequests();
      }
    } catch (error) {
      toast.error("Failed to reject request.");
    }
  };

  const generateReleaseId = () => {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    return `REL-${randomNum}`;
  };

  const handleRelease = async (id: string) => {
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const releaseId = generateReleaseId();

      await addDoc(collection(db, "consumables"), {
        releaseId: releaseId,
        name: req.name,
        type: req.type,
        quantity: req.quantity,
        unit: req.unit,
        priority: req.priority,
        department: req.department,
        requestedBy: req.requestedBy,
        originalRequestId: req.requestId,
        createdBy: req.requestedBy,
        createdAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "requested_consumables", id));

      toast.success(`Request released with ID: ${releaseId}`);
      setSelected(null);
      
      // Refresh all views
      if (viewMode === "active") {
        fetchRequests();
      } else if (viewMode === "released") {
        fetchReleasedRequests();
      }
    } catch (error) {
      toast.error("Failed to release request.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this request permanently?")) return;
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const currentUser = auth.currentUser;
      const deleteId = generateDeleteId();

      await addDoc(collection(db, "deleted_requests"), {
        ...req,
        originalId: req.id,
        deleteId: deleteId,
        deletedBy: currentUser?.email || "Unknown",
        deletedAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "requested_consumables", id));
      
      toast.success(`Request archived with ID: ${deleteId}`);
      setSelected(null);
      
      // Refresh current view
      if (viewMode === "active") {
        fetchRequests();
      }
    } catch (error) {
      toast.error("Failed to delete request.");
      console.error(error);
    }
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm("Restore this request?")) return;
    try {
      const req = deletedRequests.find((r) => r.id === id);
      if (!req) return;

      const { deleteId, deletedBy, deletedAt, originalId, id: _, ...originalData } = req;

      await addDoc(collection(db, "requested_consumables"), originalData);

      await deleteDoc(doc(db, "deleted_requests", id));
      
      toast.success("Request restored successfully!");
      setSelected(null);
      
      // Refresh current view
      if (viewMode === "deleted") {
        fetchDeletedRequests();
      }
    } catch (error) {
      toast.error("Failed to restore request.");
      console.error(error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this request? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "deleted_requests", id));
      toast.success("Request permanently deleted.");
      setSelected(null);
      
      // Refresh current view
      if (viewMode === "deleted") {
        fetchDeletedRequests();
      }
    } catch (error) {
      toast.error("Failed to permanently delete request.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const filteredRequests =
    filter === "All"
      ? requests
      : requests.filter((req) => req.status === filter);

  const currentList = viewMode === "active" ? filteredRequests : viewMode === "deleted" ? deletedRequests : releasedRequests;

  return (
    <div className="mcreq-function-container">
      <div className="mcreq-function-header">
        <h2>Consumable Requests</h2>
        <div className="mcreq-header-controls">
          <div className="mcreq-view-toggle">
            <button
              className={`toggle-btn ${viewMode === "active" ? "active" : ""}`}
              onClick={() => setViewMode("active")}
            >
              Active Requests
            </button>
            <button
              className={`toggle-btn ${viewMode === "released" ? "active" : ""}`}
              onClick={() => setViewMode("released")}
            >
              Released ({releasedRequests.length})
            </button>
            <button
              className={`toggle-btn ${viewMode === "deleted" ? "active" : ""}`}
              onClick={() => setViewMode("deleted")}
            >
              Deleted Archive ({deletedRequests.length})
            </button>
          </div>
          {viewMode === "active" && (
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
          )}
        </div>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <table className="mcreq-function-table">
          <thead>
            <tr>
              <th>{viewMode === "deleted" ? "Delete ID" : "Request ID"}</th>
              <th>Item Name</th>
              <th>Date Requested</th>
              <th>Quantity</th>
              {viewMode === "active" && <th>Priority</th>}
              <th>Status</th>
              {viewMode === "deleted" && <th>Deleted By</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentList.length === 0 ? (
              <tr>
                <td colSpan={viewMode === "active" ? 7 : 7} style={{ textAlign: "center", padding: "2rem" }}>
                  No {viewMode === "deleted" ? "deleted" : viewMode === "released" ? "released" : ""} requests found
                </td>
              </tr>
            ) : (
              currentList.map((req) => (
                <tr
                  key={req.id}
                  className={req.priority === "Urgent" ? "urgent-row" : ""}
                >
                  <td>{viewMode === "deleted" ? req.deleteId : viewMode === "released" ? req.releaseId : req.requestId}</td>
                  <td>{req.name}</td>
                  <td>{formatDate(req.requestedAt || req.createdAt)}</td>
                  <td>
                    {req.quantity} {req.unit}
                  </td>
                  {viewMode === "active" && (
                    <td>
                      <span className={`priority-badge ${req.priority.toLowerCase()}`}>
                        {req.priority}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={`status-badge ${req.status.toLowerCase()}`}>
                      {req.status}
                    </span>
                  </td>
                  {viewMode === "deleted" && (
                    <td>{req.deletedBy}</td>
                  )}
                  <td>
                    <button className="view-btn" onClick={() => setSelected(req)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="mcreq-function-modal" onClick={() => setSelected(null)}>
          <div className="mcreq-function-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{viewMode === "deleted" ? "Deleted Request Details" : viewMode === "released" ? "Released Request Details" : "Request Details"}</h3>
            <div className="modal-details">
              {viewMode === "deleted" && (
                <>
                  <p><strong>Delete ID:</strong> {selected.deleteId}</p>
                  <p><strong>Original Request ID:</strong> {selected.requestId}</p>
                  <p><strong>Deleted By:</strong> {selected.deletedBy}</p>
                  <p><strong>Deleted At:</strong> {selected.deletedAt?.toDate?.()?.toLocaleString() || "N/A"}</p>
                  <div className="modal-divider"></div>
                </>
              )}
              {viewMode === "active" && (
                <p><strong>Request ID:</strong> {selected.requestId}</p>
              )}
              {viewMode === "released" && (
                <>
                  <p><strong>Release ID:</strong> {selected.releaseId}</p>
                  <p><strong>Original Request ID:</strong> {selected.originalRequestId}</p>
                </>
              )}
              <p><strong>Item Name:</strong> {selected.name}</p>
              <p><strong>Type:</strong> {selected.type}</p>
              <p><strong>Quantity:</strong> {selected.quantity} {selected.unit}</p>
              <p><strong>Date Requested:</strong> {formatDate(selected.requestedAt || selected.createdAt)}</p>
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
              
              {viewMode === "active" ? (
                <>
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
                </>
              ) : viewMode === "deleted" ? (
                <>
                  <button className="restore-btn" onClick={() => handleRestore(selected.id)}>
                    Restore Request
                  </button>
                  <button className="delete-btn" onClick={() => handlePermanentDelete(selected.id)}>
                    Delete Permanently
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageConsumableRequests;