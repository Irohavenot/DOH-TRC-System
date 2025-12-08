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
import { useSearch } from "../../context/SearchContext";



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
  const itemsPerPage = 6;

  // Date filter state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // -1 = All Months
  const [selectedYear, setSelectedYear] = useState<string>(
    currentDate.getFullYear().toString()
  ); // "all" or "" = All Years
 const { debouncedQuery } = useSearch();


  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | "archive" | "restore" | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const [counts, setCounts] = useState({
    Pending: 0,
    Approved: 0,
    Rejected: 0,
    Deleted: 0,
    Released: 0,
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 10 }, (_, i) =>
    (currentDate.getFullYear() - i).toString()
  );

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "IT_Supply_Users"));
        const usersList = usersSnap.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().Email?.toLowerCase(),
          fullName: (() => {
            const firstName = doc.data().FirstName || doc.data().firstName;
            const middleInitial = doc.data().MiddleInitial || doc.data().middleName;
            const lastName = doc.data().LastName || doc.data().lastName;

            const formattedMiddle = middleInitial
              ? `${middleInitial.charAt(0).toUpperCase()}.`
              : "";

            return (
              [firstName, formattedMiddle, lastName]
                .filter(Boolean)
                .join(" ") || "Unknown User"
            );
          })(),
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const getFullName = (email?: string) => {
    if (!email || typeof email !== "string") return "Unknown User";
    const safeEmail = email.includes("@") ? email.toLowerCase() : email;
    const user = users.find((u) => u.email === safeEmail);
    return user?.fullName || email;
  };

  const fetchRequests = async () => {
    setLoading(true);
    setSelectedItems(new Set());
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

      // IMPORTANT: ensure id is ALWAYS the Firestore doc ID
      const list = querySnap.docs.map((snap) => {
        const data = snap.data();
        return {
          ...data,
          id: snap.id,
          status: statusFilter === "Released" ? "Released" : data.status,
        };
      });

      const sorted = list.sort((a: any, b: any) => {
        const prioA = (a?.priority || "Normal") as string;
        const prioB = (b?.priority || "Normal") as string;

        if (prioA === "Urgent" && prioB !== "Urgent") return -1;
        if (prioA !== "Urgent" && prioB === "Urgent") return 1;

        const tsA = a?.requestedAt || a?.createdAt;
        const tsB = b?.requestedAt || b?.createdAt;

        const dateA =
          tsA?.toDate && typeof tsA.toDate === "function"
            ? tsA.toDate()
            : tsA
            ? new Date(tsA)
            : new Date(0);
        const dateB =
          tsB?.toDate && typeof tsB.toDate === "function"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, users]);

  // Reset pagination & multi-select when filters change
  useEffect(() => {
    setCurrentPage(1);
    setMultiSelectMode(false);
    setSelectedItems(new Set());
  }, [statusFilter, priorityFilter, selectedMonth, selectedYear]);

  const handleApprove = async (id: string) => {
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const approvedId = `APRVD-${Math.floor(1000000 + Math.random() * 9000000)}`;

      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, {
        status: "Approved",
        approvedId: approvedId,
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.email || "Unknown",
      });
      toast.success(`Request approved with ID: ${approvedId}`);
      setSelected(null);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to approve request.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const rejectedId = `REJ-${Math.floor(1000000 + Math.random() * 9000000)}`;

      const ref = doc(db, "requested_consumables", id);
      await updateDoc(ref, {
        status: "Rejected",
        rejectedId: rejectedId,
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.email || "Unknown",
      });
      toast.success(`Request rejected with ID: ${rejectedId}`);
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
        previousStatus: req.status || "Pending",
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

      const {
        id: archiveDocId,
        deleteId,
        deletedBy,
        deletedAt,
        originalId,
        previousStatus,
        ...originalData
      } = req;

      await addDoc(collection(db, "requested_consumables"), {
        ...originalData,
        status: previousStatus || originalData.status || "Pending",
      });

      await deleteDoc(doc(db, "deleted_requests", archiveDocId));

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

  // Multi-select handlers
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

const handleSelectAll = () => {
  const allFilteredIds = filteredByPriority.map(item => item.id);

  // If everything is already selected → unselect all
  if (selectedItems.size === allFilteredIds.length) {
    setSelectedItems(new Set());
  } else {
    setSelectedItems(new Set(allFilteredIds));
  }
};


  const handleBulkAction = (action: "approve" | "reject" | "archive" | "restore") => {
    if (selectedItems.size === 0) {
      toast.warning("Please select at least one item");
      return;
    }
    setBulkAction(action);
    setShowBulkModal(true);
  };

  const confirmBulkAction = async () => {
    if (!bulkAction) return;

    const ids = Array.from(selectedItems);
    let successCount = 0;

    try {
      for (const id of ids) {
        const req = requests.find((r) => r.id === id);
        if (!req) continue;

        try {
          if (bulkAction === "approve") {
            await handleApprove(id);
            successCount++;
          }

          if (bulkAction === "reject") {
            await handleReject(id);
            successCount++;
          }

          if (bulkAction === "archive") {
            const deleteId = generateDeleteId();

            await addDoc(collection(db, "deleted_requests"), {
              ...req,
              originalId: req.id,
              previousStatus: req.status || "Pending",
              deleteId,
              deletedBy: auth.currentUser?.email || "Unknown",
              deletedAt: serverTimestamp(),
            });

            await deleteDoc(doc(db, "requested_consumables", id));
            successCount++;
          }

          if (bulkAction === "restore") {
            const {
              id: archiveDocId,
              deleteId,
              deletedBy,
              deletedAt,
              originalId,
              previousStatus,
              ...originalData
            } = req;

            await addDoc(collection(db, "requested_consumables"), {
              ...originalData,
              status: previousStatus || originalData.status || "Pending",
            });

            await deleteDoc(doc(db, "deleted_requests", archiveDocId));
            successCount++;
          }
        } catch (error) {
          console.error(`Bulk ${bulkAction} failed for ${id}:`, error);
        }
      }

      toast.success(
        `Successfully ${bulkAction}ed ${successCount} of ${ids.length} items`
      );

      setShowBulkModal(false);
      setBulkAction(null);
      setSelectedItems(new Set());
      fetchRequests();

    } catch (error) {
      toast.error(`Bulk ${bulkAction} failed`);
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      let date;

      if (timestamp?.toDate && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return "N/A";
      }

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "N/A";
    }
  };

  const getMonthLabel = () => {
    return selectedMonth === -1 ? "All Months" : months[selectedMonth];
  };

  const getYearLabel = () => {
    const trimmed = selectedYear.trim();
    if (trimmed.toLowerCase() === "all" || trimmed === "") return "All Years";
    return trimmed;
  };
  const filteredBySearch = useMemo(() => {
  if (!debouncedQuery.trim()) return requests;

  const lower = debouncedQuery.toLowerCase();

  return requests.filter(r =>
    r.name?.toLowerCase().includes(lower) ||
    r.requestId?.toLowerCase().includes(lower) ||
    r.department?.toLowerCase().includes(lower) ||
    r.requestedBy?.toLowerCase().includes(lower)
  );
}, [requests, debouncedQuery]);
  // Filter by date
  const filteredByDate = useMemo(() => {
    return filteredBySearch.filter((req) => {

      let timestamp;

      switch (statusFilter) {
        case "Pending":
          timestamp = req.requestedAt || req.createdAt;
          break;
        case "Approved":
          timestamp = req.approvedAt;
          break;
        case "Rejected":
          timestamp = req.rejectedAt;
          break;
        case "Released":
          timestamp = req.releasedAt || req.createdAt;
          break;
        case "Deleted":
          timestamp = req.deletedAt;
          break;
        default:
          timestamp = req.requestedAt || req.createdAt;
      }

      if (!timestamp) return false;

      let date;
      if (timestamp?.toDate && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) return false;

      const monthMatch = selectedMonth === -1 ? true : date.getMonth() === selectedMonth;

      const trimmedYear = selectedYear.trim();
      let yearMatch = true;
      if (trimmedYear.toLowerCase() === "all" || trimmedYear === "") {
        yearMatch = true;
      } else {
        const numericYear = parseInt(trimmedYear, 10);
        yearMatch = !isNaN(numericYear) && date.getFullYear() === numericYear;
      }

      return monthMatch && yearMatch;
    });
  }, [filteredBySearch, selectedMonth, selectedYear, statusFilter]);
  // SEARCH FILTER — runs first


  const filteredByPriority = useMemo(() => {
    if (priorityFilter === "All") return filteredByDate;
    return filteredByDate.filter((req) => req.priority === priorityFilter);
  }, [filteredByDate, priorityFilter]);

  const totalPages = Math.ceil(filteredByPriority.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredByPriority.slice(startIndex, startIndex + itemsPerPage);

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
          getDocs(
            query(
              collection(db, "requested_consumables"),
              where("status", "==", "Pending")
            )
          ),
          getDocs(
            query(
              collection(db, "requested_consumables"),
              where("status", "==", "Approved")
            )
          ),
          getDocs(
            query(
              collection(db, "requested_consumables"),
              where("status", "==", "Rejected")
            )
          ),
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

  const getDateColumnHeader = () => {
    switch (statusFilter) {
      case "Pending":
        return "Date Requested";
      case "Approved":
        return "Date Approved";
      case "Rejected":
        return "Date Rejected";
      case "Released":
        return "Date Released";
      case "Deleted":
        return "Date Archived";
      default:
        return "Date";
    }
  };

  const getDateValue = (req: any) => {
    switch (statusFilter) {
      case "Pending":
        return formatDateTime(req.requestedAt || req.createdAt);
      case "Approved":
        return formatDateTime(req.approvedAt);
      case "Rejected":
        return formatDateTime(req.rejectedAt);
      case "Released":
        return formatDateTime(req.releasedAt || req.createdAt);
      case "Deleted":
        return formatDateTime(req.deletedAt);
      default:
        return formatDateTime(req.requestedAt || req.createdAt);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const periodLabel = `${getMonthLabel()} ${getYearLabel()}`;

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
            <p>Period: ${periodLabel}</p>
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
                <th>${getDateColumnHeader()}</th>
              </tr>
            </thead>
            <tbody>
              ${filteredByPriority
                .map((req) => {
                  const priorityValue = (req.priority || "Normal") as string;
                  let displayId = req.requestId || "N/A";

                  if (statusFilter === "Deleted") displayId = req.deleteId || displayId;
                  else if (statusFilter === "Released") displayId = req.releaseId || displayId;
                  else if (statusFilter === "Approved") displayId = req.approvedId || displayId;
                  else if (statusFilter === "Rejected") displayId = req.rejectedId || displayId;

                  return `
                <tr class="${
                  priorityValue === "Urgent" ? "urgent-row" : ""
                }">
                  <td>${displayId}</td>
                  <td>${req.name || ""}</td>
                  <td>${req.type || ""}</td>
                  <td>${req.quantity || ""} ${req.unit || ""}</td>
                  <td>${req.department || ""}</td>
                  <td>${priorityValue}</td>
                  <td>${getDateValue(req)}</td>
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

  const showMultiSelect =
    multiSelectMode &&
    ["Pending", "Approved", "Rejected", "Released", "Deleted"].includes(statusFilter);

  return (
    <div className="mcreq-container">
      <div className="mcreq-header">
        <h2>Consumable Requests Management</h2>
        <button className="print-btn" onClick={handlePrint}>
          <i className="fas fa-print" /> Print Report
        </button>
      </div>

      <div className="mcreq-status-nav">
        <button
          className={`status-nav-btn pending ${
            statusFilter === "Pending" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("Pending")}
        >
          <i className="fas fa-clock" />
          <span>Pending</span>
          <span className="badge">{counts.Pending}</span>
        </button>
        <button
          className={`status-nav-btn approved ${
            statusFilter === "Approved" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("Approved")}
        >
          <i className="fas fa-check-circle" />
          <span>Approved</span>
          <span className="badge">{counts.Approved}</span>
        </button>
        <button
          className={`status-nav-btn rejected ${
            statusFilter === "Rejected" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("Rejected")}
        >
          <i className="fas fa-times-circle" />
          <span>Rejected</span>
          <span className="badge">{counts.Rejected}</span>
        </button>
        <button
          className={`status-nav-btn released ${
            statusFilter === "Released" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("Released")}
        >
          <i className="fas fa-box-open" />
          <span>Released</span>
          <span className="badge">{counts.Released}</span>
        </button>
        <button
          className={`status-nav-btn deleted ${
            statusFilter === "Deleted" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("Deleted")}
        >
          <i className="fas fa-archive" />
          <span>Archive</span>
          <span className="badge">{counts.Deleted}</span>
        </button>
      </div>

      <div className="mcreq-controls">
        <div className="date-filter">
          <label>
            <i className="fas fa-calendar" /> Month:
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="date-select"
            >
              <option value={-1}>All Months</option>
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year:
            <input
              type="text"
              list="year-options"
              className="date-select date-input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              placeholder="Type year or 'all'"
            />
            <datalist id="year-options">
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year} />
              ))}
            </datalist>
          </label>
        </div>

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
          <button
            className={`priority-btn multiselect-toggle ${
              multiSelectMode ? "active" : ""
            }`}
            onClick={() => {
              const newMode = !multiSelectMode;
              setMultiSelectMode(newMode);
              if (!newMode) {
                setSelectedItems(new Set());
              }
            }}
          >
            <i className="fas fa-check-square" />{" "}
            {multiSelectMode ? "Multi-Select: On" : "Multi-Select Items"}
          </button>
        </div>

        <div className="results-info">
          Showing {currentItems.length} of {filteredByPriority.length} requests
        </div>
      </div>

      {showMultiSelect && selectedItems.size > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            <i className="fas fa-check-square" />
            {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""} selected
          </div>
          <div className="bulk-buttons">
            {["Pending"].includes(statusFilter) && (
              <>
                <button
                  className="bulk-btn approve"
                  onClick={() => handleBulkAction("approve")}
                >
                  <i className="fas fa-check" /> Approve Selected
                </button>
                <button
                  className="bulk-btn reject"
                  onClick={() => handleBulkAction("reject")}
                >
                  <i className="fas fa-times" /> Reject Selected
                </button>
                <button
                  className="bulk-btn archive"
                  onClick={() => handleBulkAction("archive")}
                >
                  <i className="fas fa-archive" /> Archive Selected
                </button>
              </>
            )}

            {["Approved", "Rejected", "Released"].includes(statusFilter) && (
              <button
                className="bulk-btn archive"
                onClick={() => handleBulkAction("archive")}
              >
                <i className="fas fa-archive" /> Archive Selected
              </button>
            )}

            {statusFilter === "Deleted" && (
              <button
                className="bulk-btn restore"
                onClick={() => handleBulkAction("restore")}
              >
                <i className="fas fa-undo" /> Restore Selected
              </button>
            )}

            <button
              className="bulk-btn cancel"
              onClick={() => setSelectedItems(new Set())}
            >
              <i className="fas fa-ban" /> Clear Selection
            </button>
          </div>
        </div>
      )}

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
                  {showMultiSelect && (
                    <th>
                      <input
                        type="checkbox"
                        checked={
                              selectedItems.size === filteredByPriority.length &&
                              filteredByPriority.length > 0
                            }
                            onChange={handleSelectAll}

                        className="checkbox-input"
                      />
                    </th>
                  )}
                  <th>Request ID</th>
                  {statusFilter === "Approved" && <th>Approved ID</th>}
                  {statusFilter === "Rejected" && <th>Rejected ID</th>}
                  {statusFilter === "Released" && <th>Release ID</th>}
                  {statusFilter === "Deleted" && <th>Delete ID</th>}
                  <th>Item Name</th>
                  <th>{getDateColumnHeader()}</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        showMultiSelect
                          ? statusFilter === "Pending"
                            ? 8
                            : 9
                          : statusFilter === "Pending"
                          ? 7
                          : 8
                      }
                      className="empty-cell"
                    >
                      <i className="fas fa-inbox" />
                      <p>
                        No {statusFilter.toLowerCase()} requests found for{" "}
                        {getMonthLabel()} {getYearLabel()}
                      </p>
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
                        {showMultiSelect && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedItems.has(req.id)}
                              onChange={() => handleSelectItem(req.id)}
                              className="checkbox-input"
                            />
                          </td>
                        )}

                        <td className="id-cell">{req.requestId}</td>

                        {statusFilter === "Approved" && (
                          <td className="id-cell">{req.approvedId || "N/A"}</td>
                        )}

                        {statusFilter === "Rejected" && (
                          <td className="id-cell">{req.rejectedId || "N/A"}</td>
                        )}

                        {statusFilter === "Released" && (
                          <td className="id-cell">{req.releaseId || "N/A"}</td>
                        )}

                        {statusFilter === "Deleted" && (
                          <td className="id-cell">{req.deleteId || "N/A"}</td>
                        )}

                        <td className="name-cell">{req.name}</td>
                        <td>{getDateValue(req)}</td>
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

      {/* Bulk Action Confirmation Modal */}
      {showBulkModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="modal-content bulk-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <i
                  className={`fas fa-${
                    bulkAction === "approve"
                      ? "check"
                      : bulkAction === "reject"
                      ? "times"
                      : bulkAction === "restore"
                      ? "undo"
                      : "archive"
                  }`}
                />
                Confirm Bulk{" "}
                {bulkAction?.charAt(0).toUpperCase()}
                {bulkAction?.slice(1)}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowBulkModal(false)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-body">
              <p className="confirmation-text">
                Are you sure you want to <strong>{bulkAction}</strong>{" "}
                {selectedItems.size} selected item
                {selectedItems.size > 1 ? "s" : ""}?
              </p>
              <p className="warning-text">
                <i className="fas fa-exclamation-triangle" />
                This action will be applied to all selected items.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="action-btn cancel"
                onClick={() => setShowBulkModal(false)}
              >
                <i className="fas fa-ban" /> Cancel
              </button>
              <button
                className={`action-btn ${bulkAction}`}
                onClick={confirmBulkAction}
              >
                <i
                  className={`fas fa-${
                    bulkAction === "approve"
                      ? "check"
                      : bulkAction === "reject"
                      ? "times"
                      : bulkAction === "restore"
                      ? "undo"
                      : "archive"
                  }`}
                />
                Confirm{" "}
                {bulkAction?.charAt(0).toUpperCase()}
                {bulkAction?.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
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
                      {statusFilter === "Approved"
                        ? selected.approvedId || selected.requestId
                        : statusFilter === "Rejected"
                        ? selected.rejectedId || selected.requestId
                        : selected.requestId || selected.releaseId}
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
