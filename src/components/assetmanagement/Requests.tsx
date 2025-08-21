import React, { useEffect, useState } from "react";
import "../../assets/requestdata.css";

interface RequestData {
  id: string;
  requester: string;
  position: string;
  itemName: string;
  quantity: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  admin?: string;
  rejectionReason?: string;
}

const sampleData: RequestData[] = [
  {
    id: "1",
    requester: "John Doe",
    position: "Nurse",
    itemName: "Printer Ink",
    quantity: 2,
    date: "2025-05-20",
    status: "pending",
  },
  {
    id: "2",
    requester: "Jane Smith",
    position: "Doctor",
    itemName: "Bond Paper",
    quantity: 5,
    date: "2025-05-18",
    status: "approved",
    admin: "Admin A",
  },
  {
    id: "3",
    requester: "Alice Reyes",
    position: "Staff",
    itemName: "Alcohol",
    quantity: 10,
    date: "2025-05-17",
    status: "rejected",
    admin: "Admin B",
    rejectionReason: "Overstocked in supply room",
  },
  {
    id: "4",
    requester: "Carlos Dizon",
    position: "Technician",
    itemName: "Stapler",
    quantity: 1,
    date: "2025-05-21",
    status: "pending",
  },
  {
    id: "5",
    requester: "Maria Lopez",
    position: "Nurse",
    itemName: "Face Masks",
    quantity: 50,
    date: "2025-05-15",
    status: "approved",
    admin: "Admin C",
  },
  {
    id: "6",
    requester: "Kevin Cruz",
    position: "Maintenance",
    itemName: "Battery AA",
    quantity: 12,
    date: "2025-05-14",
    status: "rejected",
    admin: "Admin A",
    rejectionReason: "Request exceeds monthly quota",
  },
  {
    id: "7",
    requester: "Samantha Tan",
    position: "Doctor",
    itemName: "USB Drive",
    quantity: 3,
    date: "2025-05-22",
    status: "pending",
  },
  {
    id: "8",
    requester: "Mark Santos",
    position: "IT Staff",
    itemName: "Ethernet Cable",
    quantity: 5,
    date: "2025-05-19",
    status: "approved",
    admin: "Admin D",
  },
  {
    id: "9",
    requester: "Angela Lim",
    position: "Lab Assistant",
    itemName: "Gloves",
    quantity: 100,
    date: "2025-05-13",
    status: "rejected",
    admin: "Admin B",
    rejectionReason: "Item already distributed last week",
  },
  {
    id: "10",
    requester: "Brian Yu",
    position: "Technician",
    itemName: "Screwdriver Set",
    quantity: 2,
    date: "2025-05-16",
    status: "approved",
    admin: "Admin C",
  },
];


const Requests: React.FC = () => {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  useEffect(() => {
    setRequests(sampleData);
  }, []);

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    const updated = requests.map((req) =>
      req.id === id
        ? {
            ...req,
            status,
            admin: "Admin A", // Example: hardcoded, later connect to logged-in admin
            rejectionReason:
              status === "rejected" ? "Item not necessary at the moment" : undefined,
          }
        : req
    );
    setRequests(updated);
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected"
  );

  return (
    <div className="supply-container-main">
      <h2>Consumable Requests</h2>

      {/* Pending Requests */}
      <div className="supply-unit-containers">
        <h3>Pending Requests</h3>
        <table className="request-table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Position</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Date Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((req) => (
              <tr key={req.id}>
                <td>{req.requester}</td>
                <td>{req.position}</td>
                <td>{req.itemName}</td>
                <td>{req.quantity}</td>
                <td>{new Date(req.date).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => updateStatus(req.id, "approved")}>
                    Approve
                  </button>
                  <button onClick={() => updateStatus(req.id, "rejected")}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approved/Rejected Requests */}
      <div className="supply-unit-containers">
        <h3>Approved & Rejected Requests</h3>
        <table className="request-table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Position</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Date Requested</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {processedRequests.map((req) => (
              <tr key={req.id}>
                <td>{req.requester}</td>
                <td>{req.position}</td>
                <td>{req.itemName}</td>
                <td>{req.quantity}</td>
                <td>{new Date(req.date).toLocaleDateString()}</td>
                <td>{req.admin || "-"}</td>
                <td>{req.status}</td>
                <td>
                  {req.status === "rejected" ? (
                    <button onClick={() => setSelectedReason(req.rejectionReason || "No reason provided")}>
                      View Reason
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for rejection reason */}
      {selectedReason && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Rejection Reason</h4>
            <p>{selectedReason}</p>
            <button onClick={() => setSelectedReason(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
