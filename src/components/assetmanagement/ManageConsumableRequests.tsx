import React, { useEffect, useState, useRef } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const printRef = useRef<HTMLDivElement>(null);

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
        .map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
          };
        })
        .filter((req: any) => req.status !== "Released");
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
        status: "Released",
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
    setCurrentPage(1);
  }, [viewMode]);

  const generateDeleteId = () => {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    return `DEL-${randomNum}`;
  };

  const handleApprove = async (id: string) => {
    try {
      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, { 
        status: "Approved",
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.email || "Unknown"
      });
      toast.success("Request approved successfully!");
      setSelected(null);
      
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
      await updateDoc(ref, { 
        status: "Rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.email || "Unknown"
      });
      toast.success("Request rejected.");
      setSelected(null);
      
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
        releasedAt: serverTimestamp(),
        releasedBy: auth.currentUser?.email || "Unknown",
        requestedAt: req.requestedAt,
        approvedAt: req.approvedAt,
        approvedBy: req.approvedBy
      });

      await deleteDoc(doc(db, "requested_consumables", id));

      toast.success(`Request released with ID: ${releaseId}`);
      setSelected(null);
      
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

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "N/A";
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === "All") return true;

    if (filter === "RequestedToday") {
      const today = new Date();
      const reqDate = req.requestedAt?.toDate?.() || new Date(req.requestedAt);
      return (
        reqDate.getFullYear() === today.getFullYear() &&
        reqDate.getMonth() === today.getMonth() &&
        reqDate.getDate() === today.getDate()
      );
    }

    if (filter === "Urgent") {
      return req.priority === "Urgent";
    }

    if (filter === "Normal") {
      return req.priority === "Normal";
    }

    if (filter === "Pending" || filter === "Approved") {
      return req.status === filter;
    }

    return true;
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentList = viewMode === "active" ? filteredRequests : viewMode === "deleted" ? deletedRequests : releasedRequests;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Consumable Requests Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 15px;
            }
            .print-header h1 {
              margin: 0;
              color: #1f2937;
            }
            .print-info {
              margin: 15px 0;
              font-size: 14px;
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #3b82f6;
              color: white;
              font-weight: 600;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .urgent-row {
              background-color: #fef2f2 !important;
              border-left: 4px solid #ef4444;
            }
            .priority-badge, .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .priority-badge.normal {
              background: #dbeafe;
              color: #1e40af;
            }
            .priority-badge.urgent {
              background: #fee2e2;
              color: #991b1b;
            }
            .status-badge.pending {
              background: #fef3c7;
              color: #92400e;
            }
            .status-badge.approved {
              background: #d1fae5;
              color: #065f46;
            }
            .status-badge.rejected {
              background: #fee2e2;
              color: #991b1b;
            }
            .status-badge.released {
              background: #e0e7ff;
              color: #3730a3;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${viewMode === "active" ? "Active" : viewMode === "deleted" ? "Deleted Archive" : "Released"} Consumable Requests</h1>
            <div class="print-info">
              <p><strong>Filter:</strong> ${filter}</p>
              <p><strong>Total Records:</strong> ${currentList.length}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>${viewMode === "deleted" ? "Delete ID" : viewMode === "released" ? "Release ID" : "Request ID"}</th>
                <th>Item Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Department</th>
                ${viewMode === "active" ? "<th>Priority</th>" : ""}
                <th>Status</th>
                <th>Date Requested</th>
                ${viewMode === "deleted" ? "<th>Deleted By</th><th>Deleted At</th>" : ""}
                ${viewMode === "released" ? "<th>Released At</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${currentList.map(req => `
                <tr class="${req.priority === 'Urgent' ? 'urgent-row' : ''}">
                  <td>${viewMode === "deleted" ? req.deleteId : viewMode === "released" ? req.releaseId : req.requestId}</td>
                  <td>${req.name}</td>
                  <td>${req.type}</td>
                  <td>${req.quantity} ${req.unit}</td>
                  <td>${req.department}</td>
                  ${viewMode === "active" ? `<td><span class="priority-badge ${req.priority.toLowerCase()}">${req.priority}</span></td>` : ""}
                  <td><span class="status-badge ${req.status.toLowerCase()}">${req.status}</span></td>
                  <td>${formatDate(req.requestedAt || req.createdAt)}</td>
                  ${viewMode === "deleted" ? `<td>${req.deletedBy}</td><td>${formatDateTime(req.deletedAt)}</td>` : ""}
                  ${viewMode === "released" ? `<td>${formatDateTime(req.releasedAt || req.createdAt)}</td>` : ""}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const currentList = viewMode === "active" ? filteredRequests : viewMode === "deleted" ? deletedRequests : releasedRequests;
  
  // Pagination logic
  const totalPages = Math.ceil(currentList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = currentList.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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
              <option value="All">All</option>
              <option value="RequestedToday">Requested Today</option>
              <option value="Urgent">Urgent</option>
              <option value="Normal">Normal Requests</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
            </select>
          )}
          <button className="print-btn" onClick={handlePrint}>
            <span>🖨️</span> Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <>
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
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === "active" ? 7 : 7} style={{ textAlign: "center", padding: "2rem" }}>
                    No {viewMode === "deleted" ? "deleted" : viewMode === "released" ? "released" : ""} requests found
                  </td>
                </tr>
              ) : (
                currentItems.map((req) => (
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

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages} ({currentList.length} total items)
              </span>
              <button 
                className="pagination-btn" 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
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
                  <p><strong>Deleted At:</strong> {formatDateTime(selected.deletedAt)}</p>
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
              
              {selected.approvedAt && (
                <>
                  <div className="modal-divider"></div>
                  <p><strong>Approved At:</strong> {formatDateTime(selected.approvedAt)}</p>
                  {selected.approvedBy && <p><strong>Approved By:</strong> {selected.approvedBy}</p>}
                </>
              )}
              
              {selected.rejectedAt && (
                <>
                  <div className="modal-divider"></div>
                  <p><strong>Rejected At:</strong> {formatDateTime(selected.rejectedAt)}</p>
                  {selected.rejectedBy && <p><strong>Rejected By:</strong> {selected.rejectedBy}</p>}
                </>
              )}
              
              {selected.releasedAt && (
                <>
                  <div className="modal-divider"></div>
                  <p><strong>Released At:</strong> {formatDateTime(selected.releasedAt)}</p>
                  {selected.releasedBy && <p><strong>Released By:</strong> {selected.releasedBy}</p>}
                </>
              )}
              
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