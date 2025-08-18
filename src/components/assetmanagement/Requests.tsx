import React, { useEffect, useState } from "react";
import "../../assets/requestdata.css";

interface RequestData {
  id: string;
  requester: string;
  itemName: string;
  quantity: number;
  date: string;
  status: "pending" | "approved" | "rejected";
}

const sampleData: RequestData[] = [
  {
    id: "1",
    requester: "John Doe",
    itemName: "Printer Ink",
    quantity: 2,
    date: "2025-05-20",
    status: "pending",
  },
  {
    id: "2",
    requester: "Jane Smith",
    itemName: "Bond Paper",
    quantity: 5,
    date: "2025-05-18",
    status: "approved",
  },
  {
    id: "3",
    requester: "Alice Reyes",
    itemName: "Alcohol",
    quantity: 10,
    date: "2025-05-17",
    status: "rejected",
  },
  {
    id: "4",
    requester: "Carlos Dizon",
    itemName: "Stapler",
    quantity: 1,
    date: "2025-05-21",
    status: "pending",
  },
  {
    id: "5",
    requester: "Maria Santos",
    itemName: "Face Mask",
    quantity: 20,
    date: "2025-05-19",
    status: "pending",
  },
  {
    id: "6",
    requester: "Liza Gabo",
    itemName: "Whiteboard Marker",
    quantity: 8,
    date: "2025-05-20",
    status: "approved",
  },
  {
    id: "7",
    requester: "Raymond Cruz",
    itemName: "Disinfectant Spray",
    quantity: 4,
    date: "2025-05-18",
    status: "pending",
  },
  {
    id: "8",
    requester: "Nina Lopez",
    itemName: "Scissors",
    quantity: 3,
    date: "2025-05-16",
    status: "rejected",
  },
  {
    id: "9",
    requester: "Eric Mateo",
    itemName: "Envelopes",
    quantity: 50,
    date: "2025-05-15",
    status: "pending",
  },
  {
    id: "10",
    requester: "Samantha Uy",
    itemName: "Paper Clips",
    quantity: 200,
    date: "2025-05-14",
    status: "approved",
  }
];


const Requests: React.FC = () => {
  const [requests, setRequests] = useState<RequestData[]>([]);

  useEffect(() => {
    // Sort: pending requests first, then approved/rejected
    const sorted = [...sampleData].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });
    setRequests(sorted);
  }, []);

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    const updated = requests.map((req) =>
      req.id === id ? { ...req, status } : req
    );

    // Re-sort after updating status
    const sorted = [...updated].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });

    setRequests(sorted);
  };


  return (
    <div className="supply-container-main">
    <div className="supply-unit-containers">
      <h2>Consumable Requests</h2>
      <table className="request-table">
        <thead>
          <tr>
            <th>Requester</th>
            <th>Item</th>
            <th>Quantity</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id}>
              <td>{req.requester}</td>
              <td>{req.itemName}</td>
              <td>{req.quantity}</td>
              <td>{new Date(req.date).toLocaleDateString()}</td>
              <td>{req.status}</td>
              <td>
                {req.status === "pending" ? (
                  <>
                    <button onClick={() => updateStatus(req.id, "approved")}>
                      Approve
                    </button>
                    <button onClick={() => updateStatus(req.id, "rejected")}>
                      Reject
                    </button>
                  </>
                ) : (
                  <em>No action</em>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default Requests;


