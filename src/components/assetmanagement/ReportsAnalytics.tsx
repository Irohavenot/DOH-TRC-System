import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../../assets/ReportsAnalytics.css";

const ReportsAnalytics: React.FC = () => {

  interface Issue {
    id: number;
    dateReported: string;
    assetName: string;
    issueType: string;
    reportedBy: string;
    status: "Pending" | "In Progress" | "Resolved";
    category: 
      | "Laptops"
      | "Desktops"
      | "Printer"
      | "Servers"
      | "Furnitures and Fixtures"
      | "Consumables"
      | "Other Devices";
  }
  const [category, setCategory] = useState("");
  const [openOptionsId, setOpenOptionsId] = useState<number | null>(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Resolved">("All");

  const issues: Issue[] = [
    {
      id: 1,
      dateReported: "2025-05-01",
      assetName: "Printer A",
      issueType: "Hardware Failure",
      reportedBy: "Donna M.",
      status: "Pending",
      category: "Printer",
    },
    {
      id: 2,
      dateReported: "2025-05-02",
      assetName: "Laptop B",
      issueType: "Software Crash",
      reportedBy: "Ronzel G.",
      status: "In Progress",
      category: "Laptops",
    },
    {
      id: 3,
      dateReported: "2025-05-03",
      assetName: "Router X",
      issueType: "Network Issue",
      reportedBy: "Shelonie D.",
      status: "Resolved",
      category: "Other Devices",
    },
    {
      id: 4,
      dateReported: "2025-05-04",
      assetName: "Projector",
      issueType: "Display Issue",
      reportedBy: "John D.",
      status: "Pending",
      category: "Other Devices",
    },
  ];


  const filteredIssues = issues.filter((issue) => {
    return issueStatusFilter === "All" || issue.status === issueStatusFilter;
  });
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notification-options") && openOptionsId !== null) {
        setOpenOptionsId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openOptionsId]);

  interface Asset {
    name: string;
    category: string;
    status: "Functional" | "Defective" | "Unserviceable" 
    assignedTo: string;
    licenseType: string;
    licenseExpirationDate: string;
    assignedDate: string;
  }

  const assets: Asset[] = [
    {
    name: "Printer A",
    category: "Printer",
    status: "Functional",
    assignedTo: "Donna M.",
    licenseType: "Monthly",
    licenseExpirationDate: "2040-06-01",
    assignedDate: "2024-05-01",
  },
  {
    name: "Laptop B",
    category: "Laptops",
    status: "Defective",
    assignedTo: "Ronzel G.",
    licenseType: "Annual",
    licenseExpirationDate: "2030-02-15",
    assignedDate: "2024-02-15",
  },
  {
    name: "Router X",
    category: "Other Devices",
    status: "Unserviceable",
    assignedTo: "Shelonie D.",
    licenseType: "Monthly",
    licenseExpirationDate: "2030-08-01",
    assignedDate: "2024-01-10",
  },
  {
    name: "Desktop D",
    category: "Desktops",
    status: "Functional",
    assignedTo: "John D.",
    licenseType: "Annual",
    licenseExpirationDate: "2029-11-25",
    assignedDate: "2024-03-05",
  },
  {
    name: "Server Z1",
    category: "Servers",
    status: "Unserviceable",
    assignedTo: "Mark V.",
    licenseType: "Lifetime",
    licenseExpirationDate: "2050-01-01",
    assignedDate: "2024-01-20",
  },
  {
    name: "Office Chair",
    category: "Furnitures and Fixtures",
    status: "Functional",
    assignedTo: "Lara M.",
    licenseType: "None",
    licenseExpirationDate: "",
    assignedDate: "2024-04-10",
  },
  {
    name: "Ink Cartridge Set",
    category: "Consumables",
    status: "Defective",
    assignedTo: "Rico T.",
    licenseType: "None",
    licenseExpirationDate: "",
    assignedDate: "2024-05-18",
  },
  {
    name: "Monitor X2",
    category: "Desktops",
    status: "Functional",
    assignedTo: "Ana S.",
    licenseType: "Annual",
    licenseExpirationDate: "2035-12-30",
    assignedDate: "2024-05-11",
  },
  {
    name: "Laptop C",
    category: "Laptops",
    status: "Functional",
    assignedTo: "Chris K.",
    licenseType: "Monthly",
    licenseExpirationDate: "2032-07-01",
    assignedDate: "2024-06-01",
  },
  {
    name: "Server R2",
    category: "Servers",
    status: "Defective",
    assignedTo: "Evan H.",
    licenseType: "Lifetime",
    licenseExpirationDate: "2045-12-12",
    assignedDate: "2024-03-20",
  },
  ];

  const filteredAssets = assets.filter((asset) => {
  const assetDate = new Date(asset.assignedDate);
  const assetMonth = String(assetDate.getMonth() + 1).padStart(2, "0");
  const assetYear = String(assetDate.getFullYear());
  return (
    (!month || month === assetMonth) &&
    (!year || year === assetYear) &&
    (!status || status === asset.status) &&
    (!category || asset.category === category)
  );
});


  const assetByMonth = Array.from({ length: 12 }, (_, i) => {
    const activeCount = filteredAssets.filter(
      (asset) =>
        asset.status === "Functional" &&
        new Date(asset.assignedDate).getMonth() + 1 === i + 1
    ).length;

    const underMaintenanceCount = filteredAssets.filter(
      (asset) =>
        asset.status === "Unserviceable" &&
        new Date(asset.assignedDate).getMonth() + 1 === i + 1
    ).length;

    const damagedCount = filteredAssets.filter(
      (asset) =>
        asset.status === "Defective" &&
        new Date(asset.assignedDate).getMonth() + 1 === i + 1
    ).length;

    return {
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      active: activeCount,
      underMaintenance: underMaintenanceCount,
      damaged: damagedCount,
    };
  });
const loadImageAsBase64 = (url: string): Promise<string> => {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
};

 const exportPDF = async () => {
  const doc = new jsPDF();

  try {
    const pilipinasLogo = await loadImageAsBase64("/dohlogo1.png");
    const dohLogo = await loadImageAsBase64("/pilipinas.jpg");

    doc.addImage(pilipinasLogo, "PNG", 14, 10, 25, 25);
    doc.addImage(dohLogo, "PNG", doc.internal.pageSize.width - 39, 10, 25, 25);
  } catch (error) {
    console.error("Error loading images", error);
    alert("Failed to load header images. Please check image paths.");
    return;
  }

  // ✅ Your remaining code stays the same below
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Republic of the Philippines", doc.internal.pageSize.width / 2, 15, { align: "center" });

  doc.setFontSize(9.5);
  doc.text("Department of Health - Treatment and Rehabilitation Center - Argao", doc.internal.pageSize.width / 2, 21, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Candabong, Binlod, Argao, Cebu, Municipality of Argao, 6021 Cebu", doc.internal.pageSize.width / 2, 27, { align: "center" });
  doc.text("Email: dohtrc@doh.gov.ph", doc.internal.pageSize.width / 2, 32, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IT Asset Report", doc.internal.pageSize.width / 2, 60, { align: "center" });

  const currentDate = new Date().toLocaleDateString();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Date: ${currentDate}`, 14, 68);

  autoTable(doc, {
    startY: 75,
    theme: "grid",
    head: [["Asset Name", "Category", "Status", "Assigned To", "License Type", "License Expiration Date", "Assigned Date"]],
    body: filteredAssets.map((asset) => [
      asset.name,
      asset.category,
      asset.status,
      asset.assignedTo,
      asset.licenseType,
      asset.licenseExpirationDate,
      asset.assignedDate,
    ]),
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 20,
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const signatureStartY = pageHeight - 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Prepared by:", pageWidth / 2, signatureStartY, { align: "center" });

  doc.setFontSize(12);
  doc.text("RONZEL GO", pageWidth / 2, signatureStartY + 18, { align: "center" });

  doc.setFontSize(10);
  doc.text("Head, Information Technology Unit", pageWidth / 2, signatureStartY + 24, { align: "center" });

  doc.save("DOH-TRC_Assets_Report.pdf");
};

  const handlePrint = () => {
    const printContent = document.getElementById("printable-report")?.innerHTML;

    if (printContent) {
      const printWindow = window.open("", "_blank", "width=800,height=600");

      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Report</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 20px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                th, td {
                  border: 1px solid black;
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f2f2f2;
                }
                img {
                  height: 60px;
                }
                h3, h4, p {
                  margin: 5px 0;
                }
                .signature {
                  margin-top: 100px;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();

        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };

        printWindow.onafterprint = () => {
          printWindow.close();
        };

        printWindow.onbeforeunload = () => {
          printWindow.close();
        };
      } else {
        console.error("Error: Unable to open print window.");
      }
    } else {
      console.error("Error: Printable content not found.");
    }
  };

  return (
    
    

    
        <div className="reports-container">
  <h2>Asset Reports and Analytics</h2>

  <div className="filter-section">
    <div className="filter-group">
      <label htmlFor="month">Month:</label>
      <select id="month" value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="">All Months</option>
        {[
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ].map((m, i) => (
          <option key={i} value={String(i + 1).padStart(2, "0")}>
            {m}
          </option>
        ))}
      </select>
    </div>

    <div className="filter-group">
      <label htmlFor="year">Year:</label>
      <select id="year" value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">All Years</option>
        {Array.from({ length: 61 }, (_, i) => {
          const y = (1990 + i).toString();
          return (
            <option key={y} value={y}>
              {y}
            </option>
          );
        })}
      </select>
    </div>

    <div className="filter-group">
      <label htmlFor="status">Status:</label>
      <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All Status</option>
        <option value="Functional">Functional</option>
        <option value="Unserviceable">Unserviceable</option>
        <option value="Defective">Defective</option>
      </select>
    </div>
    <div className="filter-group">
  <label htmlFor="category">Category:</label>
  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
    <option value="">All Categories</option>
    <option value="Laptops">Laptops</option>
    <option value="Desktops">Desktops</option>
    <option value="Printer">Printer</option>
    <option value="Servers">Servers</option>
    <option value="Furnitures and Fixtures">Furnitures and Fixtures</option>
    <option value="Consumables">Consumables</option>
    <option value="Other Devices">Other Devices</option>
  </select>
</div>
  </div>
            {(month || year || status || category) && (
              <div className="selected-filters">
                <p>
                  Showing results for:{" "}
                  {month && `${new Date(0, parseInt(month) - 1).toLocaleString("default", { month: "long" })} `}
                  {year && `${year} `}
                  {status && `(Status: ${status})`}
                  {category && `(Category: ${category})`}
                </p>
              </div>
            )}

            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={assetByMonth}>
                  <CartesianGrid stroke="#ccc" />
                  <XAxis dataKey="month" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="active" stroke="#4CAF50" name="Active" />
                  <Line type="monotone" dataKey="underMaintenance" stroke="#FFC107" name="Under Maintenance" />
                  <Line type="monotone" dataKey="damaged" stroke="#F44336" name="Damaged" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <table className="reports-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>License Type</th>
                  <th>License Expiration Date</th>
                  <th>Assigned Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset, idx) => (
                    <tr key={idx}>
                      <td>{asset.name}</td>
                      <td>{asset.category}</td>
                      <td>{asset.status}</td>
                      <td>{asset.assignedTo}</td>
                      <td>{asset.licenseType}</td>
                      <td>{asset.licenseExpirationDate}</td>
                      <td>{asset.assignedDate}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No assets found for selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div
              style={{
                textAlign: "right",
                marginTop: "1rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <div className="export-buttons">
                <button onClick={handlePrint}>🖨️ Print Report</button>
                <button onClick={exportPDF}>📄 Download PDF</button>
              </div>
            </div>

            <div className="issues-container">
              <h2>Reported IT Asset Issues</h2>
              <div className="issue-filter">
                <button
                  className={issueStatusFilter === "All" ? "active-filter" : ""}
                  data-filter="all"
                  onClick={() => setIssueStatusFilter("All")}
                >
                  All
                </button>
                <button
                  className={issueStatusFilter === "Pending" ? "active-filter" : ""}
                  data-filter="pending"
                  onClick={() => setIssueStatusFilter("Pending")}
                >
                  Pending
                </button>
                <button
                  className={issueStatusFilter === "In Progress" ? "active-filter" : ""}
                  data-filter="in-progress"
                  onClick={() => setIssueStatusFilter("In Progress")}
                >
                  In Progress
                </button>
                <button
                  className={issueStatusFilter === "Resolved" ? "active-filter" : ""}
                  data-filter="resolved"
                  onClick={() => setIssueStatusFilter("Resolved")}
                >
                  Resolved
                </button>
              </div>

              <table className="issues-table">
                <thead>
                  <tr>
                    <th>Date Reported</th>
                    <th>Asset Name</th>
                    <th>Issue Type</th>
                    <th>Reported By</th>
                    <th>Status</th>
                    <th>Category</th> {/* New column header */}
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length > 0 ? (
                    filteredIssues.map((issue) => (
                      <tr key={issue.id}>
                        <td>{issue.dateReported}</td>
                        <td>{issue.assetName}</td>
                        <td>{issue.issueType}</td>
                        <td>{issue.reportedBy}</td>
                        <td>{issue.status}</td>
                        <td>{issue.category}</td> {/* New category data */}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No issues found for selected filter.</td> {/* Updated colspan */}
                    </tr>
                  )}
                </tbody>
              </table>

            </div>

            <div id="printable-report" style={{ display: "none" }}>
              <div style={{ textAlign: "center" }}>
                <img src="/dohlogo1.png" style={{ height: 60, float: "left" }} />
                <img src="/pilipinas.jpg" style={{ height: 60, float: "right" }} />
                <h3>Republic of the Philippines</h3>
                <h4>Department of Health - Treatment and Rehabilitation Center - Argao</h4>
                <p>Candabong, Binlod, Argao, Cebu, Municipality of Argao, 6021 Cebu</p>
                <p>Email: dohtrc@doh.gov.ph</p>
                <h2 style={{ marginTop: 20 }}>IT Asset Report</h2>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }} border={1}>
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>License Type</th>
                    <th>License Expiration Date</th>
                    <th>Assigned Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset, idx) => (
                    <tr key={idx}>
                      <td>{asset.name}</td>
                      <td>{asset.category}</td>
                      <td>{asset.status}</td>
                      <td>{asset.assignedTo}</td>
                      <td>{asset.licenseType}</td>
                      <td>{asset.licenseExpirationDate}</td>
                      <td>{asset.assignedDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: "center", marginTop: 300, marginBottom: 200 }}>
                <p>Prepared by:</p>
                <div style={{ height: 40 }}></div>
                <h4>RONZEL GO</h4>
                <p>Head, Information Technology Unit</p>
              </div>
            </div>
          </div>
       
       
  );
};

export default ReportsAnalytics;