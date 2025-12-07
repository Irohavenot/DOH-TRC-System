import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";
import "../../assets/manageconsumablerequests.css";

const ManageConsumableRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "Pending" | "Approved" | "Rejected" | "Deleted" | "Released"
  >("Pending");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "Urgent" | "Normal">("All");
  const [selected, setSelected] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Badge counts
  const [counts, setCounts] = useState({
    Pending: 0,
    Approved: 0,
    Rejected: 0,
    Deleted: 0,
    Released: 0,
  });

  // Fetch users for name mapping
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "IT_Supply_Users"));
        const usersList = usersSnap.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().Email?.toLowerCase(),
          fullName:
            [
              doc.data().FirstName || doc.data().firstName,
              doc.data().MiddleInitial || doc.data().middleName,
              doc.data().LastName || doc.data().lastName,
            ]
              .filter(Boolean)
              .join(" ") || "Unknown User",
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Helper to get full name from email (SAFE)
  const getFullName = (email?: string) => {
    if (!email || typeof email !== "string") return "Unknown User";

    // Only lowercase if it looks like an email
    const safeEmail = email.includes("@") ? email.toLowerCase() : email;
    const user = users.find((u) => u.email === safeEmail);
    return user?.fullName || email;
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let collectionName = "requested_consumables";
      let queryConstraints: any[] = [];

      if (statusFilter === "Deleted") {
        collectionName = "deleted_requests";
      } else if (statusFilter === "Released") {
        collectionName = "consumables";
      } else {
        queryConstraints.push(where("status", "==", statusFilter));
      }

      const q =
        queryConstraints.length > 0
          ? query(collection(db, collectionName), ...queryConstraints)
          : collection(db, collectionName);

      const querySnap = await getDocs(q);
      const list = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: statusFilter === "Released" ? "Released" : doc.data().status,
      }));

      // Sort by priority (Urgent first) then by date
      const sorted = list.sort((a: any, b: any) => {
        const prioA = (a?.priority || "Normal") as string;
        const prioB = (b?.priority || "Normal") as string;

        if (prioA === "Urgent" && prioB !== "Urgent") return -1;
        if (prioA !== "Urgent" && prioB === "Urgent") return 1;

        // Prefer requestedAt, fall back to createdAt
        const tsA = a?.requestedAt || a?.createdAt;
        const tsB = b?.requestedAt || b?.createdAt;

        const dateA =
          tsA?.toDate?.() instanceof Function
            ? tsA.toDate()
            : tsA
            ? new Date(tsA)
            : new Date(0);
        const dateB =
          tsB?.toDate?.() instanceof Function
            ? tsB.toDate()
            : tsB
            ? new Date(tsB)
            : new Date(0);

        return dateB.getTime() - dateA.getTime();
      });

      setRequests(sorted);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (users.length > 0) {
      fetchRequests();
    }
  }, [statusFilter, users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter]);

  const handleApprove = async (id: string) => {
    try {
      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, {
        status: "Approved",
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.email || "Unknown",
      });
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
      await updateDoc(ref, {
        status: "Rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.email || "Unknown",
      });
      toast.success("Request rejected.");
      setSelected(null);
      fetchRequests();
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
        priority: req.priority || "Normal",
        department: req.department,
        requestedBy: req.requestedBy,
        originalRequestId: req.requestId,
        createdBy: req.requestedBy,
        createdAt: serverTimestamp(),
        releasedAt: serverTimestamp(),
        releasedBy: auth.currentUser?.email || "Unknown",
        requestedAt: req.requestedAt || req.createdAt || null,
        approvedAt: req.approvedAt || null,
        approvedBy: req.approvedBy || null,
        remarks: req.remarks || "",
        neededBy: req.neededBy || null,
      });

      await deleteDoc(doc(db, "requested_consumables", id));

      toast.success(`Request released with ID: ${releaseId}`);
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to release request.");
    }
  };

  const generateDeleteId = () => {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    return `DEL-${randomNum}`;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Archive this request?")) return;
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const deleteId = generateDeleteId();

      await addDoc(collection(db, "deleted_requests"), {
        ...req,
        originalId: req.id,
        deleteId: deleteId,
        deletedBy: auth.currentUser?.email || "Unknown",
        deletedAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "requested_consumables", id));

      toast.success(`Request archived with ID: ${deleteId}`);
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to archive request.");
    }
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm("Restore this request?")) return;
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const { deleteId, deletedBy, deletedAt, originalId, id: _, ...originalData } = req;

      await addDoc(collection(db, "requested_consumables"), originalData);
      await deleteDoc(doc(db, "deleted_requests", id));

      toast.success("Request restored successfully!");
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to restore request.");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this request? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "deleted_requests", id));
      toast.success("Request permanently deleted.");
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to permanently delete request.");
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date =
        timestamp?.toDate?.() instanceof Function
          ? timestamp.toDate()
          : new Date(timestamp);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const filteredByPriority = useMemo(() => {
    if (priorityFilter === "All") return requests;
    return requests.filter((req) => req.priority === priorityFilter);
  }, [requests, priorityFilter]);

  const totalPages = Math.ceil(filteredByPriority.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredByPriority.slice(startIndex, startIndex + itemsPerPage);

  // Fetch counts for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [
          pendingSnap,
          approvedSnap,
          rejectedSnap,
          deletedSnap,
          releasedSnap,
        ] = await Promise.all([
          getDocs(query(collection(db, "requested_consumables"), where("status", "==", "Pending"))),
          getDocs(query(collection(db, "requested_consumables"), where("status", "==", "Approved"))),
          getDocs(query(collection(db, "requested_consumables"), where("status", "==", "Rejected"))),
          getDocs(collection(db, "deleted_requests")),
          getDocs(collection(db, "consumables")),
        ]);

        setCounts({
          Pending: pendingSnap.size,
          Approved: approvedSnap.size,
          Rejected: rejectedSnap.size,
          Deleted: deletedSnap.size,
          Released: releasedSnap.size,
        });
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };
    fetchCounts();
  }, [requests]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${statusFilter} Consumable Requests Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #3b82f6; color: white; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .urgent-row { background-color: #fef2f2 !important; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${statusFilter} Consumable Requests</h1>
            <p>Priority Filter: ${priorityFilter} | Total: ${filteredByPriority.length}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              ${filteredByPriority
                .map((req) => {
                  const priorityValue = (req.priority || "Normal") as string;
                  return `
                <tr class="${
                  priorityValue === "Urgent" ? "urgent-row" : ""
                }">
                  <td>${req.requestId || req.deleteId || req.releaseId || "N/A"}</td>
                  <td>${req.name || ""}</td>
                  <td>${req.type || ""}</td>
                  <td>${req.quantity || ""} ${req.unit || ""}</td>
                  <td>${req.department || ""}</td>
                  <td>${priorityValue}</td>
                  <td>${formatDateTime(req.requestedAt || req.createdAt)}</td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="mcreq-container">
      <div className="mcreq-header">
        <h2>Consumable Requests Management</h2>
        <button className="print-btn" onClick={handlePrint}>
          <i className="fas fa-print" /> Print Report
        </button>
      </div>

      {/* Status Navigation */}
      <div className="mcreq-status-nav">
        <button
          className={`status-nav-btn pending ${statusFilter === "Pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("Pending")}
        >
          <i className="fas fa-clock" />
          <span>Pending</span>
          <span className="badge">{counts.Pending}</span>
        </button>
        <button
          className={`status-nav-btn approved ${statusFilter === "Approved" ? "active" : ""}`}
          onClick={() => setStatusFilter("Approved")}
        >
          <i className="fas fa-check-circle" />
          <span>Approved</span>
          <span className="badge">{counts.Approved}</span>
        </button>
        <button
          className={`status-nav-btn rejected ${statusFilter === "Rejected" ? "active" : ""}`}
          onClick={() => setStatusFilter("Rejected")}
        >
          <i className="fas fa-times-circle" />
          <span>Rejected</span>
          <span className="badge">{counts.Rejected}</span>
        </button>
        <button
          className={`status-nav-btn released ${statusFilter === "Released" ? "active" : ""}`}
          onClick={() => setStatusFilter("Released")}
        >
          <i className="fas fa-box-open" />
          <span>Released</span>
          <span className="badge">{counts.Released}</span>
        </button>
        <button
          className={`status-nav-btn deleted ${statusFilter === "Deleted" ? "active" : ""}`}
          onClick={() => setStatusFilter("Deleted")}
        >
          <i className="fas fa-archive" />
          <span>Archive</span>
          <span className="badge">{counts.Deleted}</span>
        </button>
      </div>

      {/* Priority Filter */}
      <div className="mcreq-controls">
        <div className="priority-filter">
          <button
            className={`priority-btn ${priorityFilter === "All" ? "active" : ""}`}
            onClick={() => setPriorityFilter("All")}
          >
            All Priorities
          </button>
          <button
            className={`priority-btn urgent ${
              priorityFilter === "Urgent" ? "active" : ""
            }`}
            onClick={() => setPriorityFilter("Urgent")}
          >
            <i className="fas fa-exclamation-triangle" /> Urgent Only
          </button>
          <button
            className={`priority-btn normal ${
              priorityFilter === "Normal" ? "active" : ""
            }`}
            onClick={() => setPriorityFilter("Normal")}
          >
            Normal Only
          </button>
        </div>
        <div className="results-info">
          Showing {currentItems.length} of {filteredByPriority.length} requests
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading requests...</p>
        </div>
      ) : (
        <>
          <div className="mcreq-table-container">
            <table className="mcreq-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Name</th>
                  <th>Requested</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      <i className="fas fa-inbox" />
                      <p>No {statusFilter.toLowerCase()} requests found</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((req) => {
                    const priorityValue = (req.priority || "Normal") as string;
                    const priorityClass = priorityValue.toLowerCase();

                    return (
                      <tr
                        key={req.id}
                        className={priorityValue === "Urgent" ? "urgent-row" : ""}
                      >
                        <td className="id-cell">
                          {statusFilter === "Deleted"
                            ? req.deleteId
                            : statusFilter === "Released"
                            ? req.releaseId
                            : req.requestId}
                        </td>
                        <td className="name-cell">{req.name}</td>
                        <td>{formatDateTime(req.requestedAt || req.createdAt)}</td>
                        <td>
                          {req.quantity} {req.unit}
                        </td>
                        <td>
                          <span className={`priority-badge ${priorityClass}`}>
                            {priorityValue === "Urgent" && (
                              <i className="fas fa-bolt" />
                            )}
                            {priorityValue}
                          </span>
                        </td>
                        <td>{req.department}</td>
                        <td>
                          <button
                            className="view-btn"
                            onClick={() => setSelected(req)}
                          >
                            <i className="fas fa-eye" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left" /> Previous
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="page-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Request Details</h3>
              <button
                className="modal-close"
                onClick={() => setSelected(null)}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="modal-body">
              {statusFilter === "Deleted" && (
                <div className="info-section deleted">
                  <h4>
                    <i className="fas fa-archive" /> Archive Information
                  </h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Delete ID:</span>
                      <span className="value">{selected.deleteId}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Deleted By:</span>
                      <span className="value">
                        {getFullName(selected.deletedBy)}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">Deleted At:</span>
                      <span className="value">
                        {formatDateTime(selected.deletedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="info-section">
                <h4>
                  <i className="fas fa-info-circle" /> Basic Information
                </h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Request ID:</span>
                    <span className="value">
                      {selected.requestId || selected.releaseId}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Item Name:</span>
                    <span className="value strong">{selected.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Type:</span>
                    <span className="value">{selected.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Quantity:</span>
                    <span className="value">
                      {selected.quantity} {selected.unit}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Department:</span>
                    <span className="value">{selected.department}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Priority:</span>
                    {(() => {
                      const prio = (selected.priority || "Normal") as string;
                      const cls = prio.toLowerCase();
                      return (
                        <span className={`priority-badge ${cls}`}>
                          {prio}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>
                  <i className="fas fa-user" /> Request Information
                </h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Requested By:</span>
                    <span className="value">{selected.requestedBy}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Requested At:</span>
                    <span className="value">
                      {formatDateTime(selected.requestedAt || selected.createdAt)}
                    </span>
                  </div>
                  {selected.neededBy && (
                    <div className="info-item">
                      <span className="label">Needed By:</span>
                      <span className="value urgent">
                        {formatDateTime(selected.neededBy)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {(selected.approvedAt ||
                selected.rejectedAt ||
                selected.releasedAt) && (
                <div className="info-section">
                  <h4>
                    <i className="fas fa-history" /> Action History
                  </h4>
                  <div className="info-grid">
                    {selected.approvedAt && (
                      <>
                        <div className="info-item">
                          <span className="label">Approved By:</span>
                          <span className="value">
                            {getFullName(selected.approvedBy)}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Approved At:</span>
                          <span className="value">
                            {formatDateTime(selected.approvedAt)}
                          </span>
                        </div>
                      </>
                    )}
                    {selected.rejectedAt && (
                      <>
                        <div className="info-item">
                          <span className="label">Rejected By:</span>
                          <span className="value">
                            {getFullName(selected.rejectedBy)}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Rejected At:</span>
                          <span className="value">
                            {formatDateTime(selected.rejectedAt)}
                          </span>
                        </div>
                      </>
                    )}
                    {selected.releasedAt && (
                      <>
                        <div className="info-item">
                          <span className="label">Released By:</span>
                          <span className="value">
                            {getFullName(selected.releasedBy)}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Released At:</span>
                          <span className="value">
                            {formatDateTime(selected.releasedAt)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selected.remarks && (
                <div className="info-section">
                  <h4>
                    <i className="fas fa-comment" /> Remarks
                  </h4>
                  <p className="remarks">{selected.remarks}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {statusFilter === "Pending" && (
                <>
                  <button
                    className="action-btn approve"
                    onClick={() => handleApprove(selected.id)}
                  >
                    <i className="fas fa-check" /> Approve
                  </button>
                  <button
                    className="action-btn reject"
                    onClick={() => handleReject(selected.id)}
                  >
                    <i className="fas fa-times" /> Reject
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(selected.id)}
                  >
                    <i className="fas fa-archive" /> Archive
                  </button>
                </>
              )}

              {statusFilter === "Approved" && (
                <>
                  <button
                    className="action-btn release"
                    onClick={() => handleRelease(selected.id)}
                  >
                    <i className="fas fa-box-open" /> Release to Inventory
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(selected.id)}
                  >
                    <i className="fas fa-archive" /> Archive
                  </button>
                </>
              )}

              {statusFilter === "Rejected" && (
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(selected.id)}
                >
                  <i className="fas fa-archive" /> Archive
                </button>
              )}

              {statusFilter === "Deleted" && (
                <>
                  <button
                    className="action-btn restore"
                    onClick={() => handleRestore(selected.id)}
                  >
                    <i className="fas fa-undo" /> Restore
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handlePermanentDelete(selected.id)}
                  >
                    <i className="fas fa-trash" /> Delete Permanently
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageConsumableRequests;
