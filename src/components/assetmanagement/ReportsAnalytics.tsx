import React, { useState, useEffect, useMemo} from "react";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
    YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../../assets/ReportsAnalytics.css";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);

interface Asset {
  id: string;
  assetName: string;
  assetId: string;
  category: string;
  subType?: string;
  status: string;
  personnel?: string;
  licenseType?: string;
  expirationDate?: string;
  purchaseDate?: string;
  assignedDate?: string;
  serialNo: string;
  createdAt?: any;
}
const ReportsAnalytics: React.FC = () => {
  const currentDate = new Date();
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [status, setStatus] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [uidToNameMap, setUidToNameMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Asset_Categories"));
        const list: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.Category_Name) list.push(data.Category_Name);
        });
        list.sort();
        setCategories(list);
      } catch (e) {
        console.error("Error fetching categories:", e);
      }
    };
    fetchCategories();
  }, []);

  // Fetch users for name mapping
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "IT_Supply_Users"),
      (snap) => {
        const umap: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data: any = d.data();
          const uid = d.id;
          const first = data.FirstName || data.firstName || '';
          const middle = data.MiddleInitial || data.middleName || '';
          const last = data.LastName || data.lastName || '';
          
          let middleInitial = '';
          if (middle) {
            if (middle.length > 1 && !middle.endsWith('.')) {
              middleInitial = middle.charAt(0).toUpperCase() + '.';
            } else {
              middleInitial = middle.trim();
              if (middleInitial.length === 1) middleInitial += '.';
            }
          }
          
          const fullName = [first, middleInitial, last].filter(Boolean).join(' ') || 'Unknown User';
          umap[uid] = fullName;
        });
        setUidToNameMap(umap);
      },
      (err) => console.error("Failed to fetch IT_Supply_Users:", err)
    );
    return () => unsub();
  }, []);

  // Fetch assets
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "IT_Assets"),
      (snap) => {
        const fetchedAssets: Asset[] = snap.docs.map((d) => ({
          id: d.id,
          assetName: d.data().assetName || 'Unnamed Asset',
          assetId: d.data().assetId || '',
          category: d.data().category || 'Uncategorized',
          subType: d.data().subType,
          status: d.data().status || 'Unknown',
          personnel: d.data().personnel,
          licenseType: d.data().licenseType,
          expirationDate: d.data().expirationDate,
          purchaseDate: d.data().purchaseDate,
          assignedDate: d.data().assignedDate || d.data().purchaseDate,
          serialNo: d.data().serialNo || 'N/A',
          createdAt: d.data().createdAt,
        }));
        setAssets(fetchedAssets);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching IT_Assets:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Compute asset status based on expiration
  const computeAssetStatus = (licenseType?: string, expirationDate?: string) => {
    if (licenseType && NON_EXPIRING.has(licenseType)) return 'Functional';
    if (!expirationDate) return 'Functional';
    
    const today = new Date();
    const exp = new Date(expirationDate);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / MS_PER_DAY);
    
    if (daysLeft < 0) return 'Unserviceable';
    if (daysLeft <= 30) return 'Defective';
    return 'Functional';
  };

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const assetDate = new Date(asset.assignedDate || asset.purchaseDate || asset.createdAt?.toDate?.() || new Date());
      const assetMonth = String(assetDate.getMonth() + 1).padStart(2, "0");
      const assetYear = String(assetDate.getFullYear());
      
      const computedStatus = computeAssetStatus(asset.licenseType, asset.expirationDate);
      
      return (
        (!month || month === assetMonth) &&
        (!year || year === assetYear) &&
        (!status || status === computedStatus) &&
        (!category || asset.category === category)
      );
    });
  }, [assets, month, year, status, category]);

  // Compute chart data
  const assetByMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const activeCount = filteredAssets.filter((asset) => {
        const assetDate = new Date(asset.assignedDate || asset.purchaseDate || asset.createdAt?.toDate?.() || new Date());
        const assetMonth = assetDate.getMonth() + 1;
        const computedStatus = computeAssetStatus(asset.licenseType, asset.expirationDate);
        return computedStatus === "Functional" && assetMonth === i + 1;
      }).length;

      const underMaintenanceCount = filteredAssets.filter((asset) => {
        const assetDate = new Date(asset.assignedDate || asset.purchaseDate || asset.createdAt?.toDate?.() || new Date());
        const assetMonth = assetDate.getMonth() + 1;
        const computedStatus = computeAssetStatus(asset.licenseType, asset.expirationDate);
        return computedStatus === "Unserviceable" && assetMonth === i + 1;
      }).length;

      const damagedCount = filteredAssets.filter((asset) => {
        const assetDate = new Date(asset.assignedDate || asset.purchaseDate || asset.createdAt?.toDate?.() || new Date());
        const assetMonth = assetDate.getMonth() + 1;
        const computedStatus = computeAssetStatus(asset.licenseType, asset.expirationDate);
        return computedStatus === "Defective" && assetMonth === i + 1;
      }).length;

      return {
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        active: activeCount,
        underMaintenance: underMaintenanceCount,
        damaged: damagedCount,
      };
    });
  }, [filteredAssets]);

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
    }

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

    // Add filter information
    let filterY = 73;
    if (month || year || status || category) {
      doc.setFontSize(10);
      doc.text("Filters Applied:", 14, filterY);
      filterY += 5;
      if (month) {
        doc.text(`Month: ${new Date(0, parseInt(month) - 1).toLocaleString("default", { month: "long" })}`, 14, filterY);
        filterY += 5;
      }
      if (year) {
        doc.text(`Year: ${year}`, 14, filterY);
        filterY += 5;
      }
      if (status) {
        doc.text(`Status: ${status}`, 14, filterY);
        filterY += 5;
      }
      if (category) {
        doc.text(`Category: ${category}`, 14, filterY);
        filterY += 5;
      }
      filterY += 3;
    }

    autoTable(doc, {
      startY: filterY,
      theme: "grid",
      head: [["Asset Name", "Asset ID", "Category", "Status", "Assigned To", "Serial No", "Date"]],
      body: filteredAssets.map((asset) => [
        asset.assetName,
        asset.assetId,
        asset.category,
        computeAssetStatus(asset.licenseType, asset.expirationDate),
        asset.personnel ? uidToNameMap[asset.personnel] || asset.personnel : 'Unassigned',
        asset.serialNo,
        asset.assignedDate || asset.purchaseDate || 'N/A',
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
        fontSize: 9,
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
    const printContent = document.getElementById("analytics-printable-report")?.innerHTML;

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
                  margin-top: 20px;
                }
                th, td {
                  border: 1px solid black;
                  padding: 8px;
                  text-align: center;
                  font-size: 10pt;
                }
                th {
                  background-color: #f2f2f2;
                  font-weight: bold;
                }
                img {
                  height: 60px;
                }
                h3, h4, p {
                  margin: 5px 0;
                  text-align: center;
                }
                .analytics-header-section {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .analytics-signature {
                  margin-top: 100px;
                  text-align: center;
                }
                .analytics-filter-info {
                  margin: 20px 0;
                  padding: 10px;
                  background-color: #f5f5f5;
                  border: 1px solid #ddd;
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
      }
    }
  };

  const clearFilters = () => {
    const currentDate = new Date();
    setMonth(String(currentDate.getMonth() + 1).padStart(2, "0"));
    setYear(String(currentDate.getFullYear()));
    setStatus("");
    setCategory("");
    setCurrentPage(1);
  };

  const hasActiveFilters = month || year || status || category;

  // Pagination logic
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [month, year, status, category]);

  return (
    <div className="reports-analytics-wrapper">
      <div className="analytics-page-container">
        <h2 className="analytics-page-title">Asset Reports and Analytics</h2>

        <div className="analytics-filters-wrapper">
          <div className="analytics-filter-item">
            <label htmlFor="analytics-month" className="analytics-filter-label">Month:</label>
            <select id="analytics-month" className="analytics-filter-select" value={month} onChange={(e) => setMonth(e.target.value)}>
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

          <div className="analytics-filter-item">
            <label htmlFor="analytics-year" className="analytics-filter-label">Year:</label>
            <select id="analytics-year" className="analytics-filter-select" value={year} onChange={(e) => setYear(e.target.value)}>
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

          <div className="analytics-filter-item">
            <label htmlFor="analytics-status" className="analytics-filter-label">Status:</label>
            <select id="analytics-status" className="analytics-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="Functional">Functional</option>
              <option value="Defective">Defective</option>
              <option value="Unserviceable">Unserviceable</option>
            </select>
          </div>

          <div className="analytics-filter-item">
            <label htmlFor="analytics-category" className="analytics-filter-label">Category:</label>
            <select id="analytics-category" className="analytics-filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="analytics-active-filters-banner">
            <div className="analytics-active-filters-text">
              <strong>Active Filters:</strong>
              {month && <span> Month: {new Date(0, parseInt(month) - 1).toLocaleString("default", { month: "long" })}</span>}
              {year && <span> | Year: {year}</span>}
              {status && <span> | Status: {status}</span>}
              {category && <span> | Category: {category}</span>}
            </div>
            <button className="analytics-clear-all-btn" onClick={clearFilters}>
              Clear All Filters
            </button>
          </div>
        )}

        <div className="analytics-chart-wrapper" style={{ width: "100%", height: 350, marginTop: 30, marginBottom: 30 }}>
          <ResponsiveContainer>
            <LineChart data={assetByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#00796b', fontSize: 12 }}
                stroke="#00796b"
              />
              <YAxis 
                tick={{ fill: '#00796b', fontSize: 12 }}
                stroke="#00796b"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #00796b',
                  borderRadius: '6px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="active" 
                stroke="#4CAF50" 
                strokeWidth={3}
                name="Functional" 
                dot={{ fill: '#4CAF50', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="damaged" 
                stroke="#F44336" 
                strokeWidth={3}
                name="Unserviceable" 
                dot={{ fill: '#F44336', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="underMaintenance" 
                stroke="#FFC107" 
                strokeWidth={3}
                name="Defective" 
                dot={{ fill: '#FFC107', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-summary-cards">
          <div className="analytics-summary-card analytics-card-functional">
            <i className="fas fa-check-circle analytics-card-icon"></i>
            <div>
              <h3 className="analytics-card-number">{filteredAssets.filter(a => computeAssetStatus(a.licenseType, a.expirationDate) === 'Functional').length}</h3>
              <p className="analytics-card-label">Functional</p>
            </div>
          </div>
          <div className="analytics-summary-card analytics-card-defective">
            <i className="fas fa-exclamation-triangle analytics-card-icon"></i>
            <div>
              <h3 className="analytics-card-number">{filteredAssets.filter(a => computeAssetStatus(a.licenseType, a.expirationDate) === 'Defective').length}</h3>
              <p className="analytics-card-label">Defective</p>
            </div>
          </div>
          <div className="analytics-summary-card analytics-card-unserviceable">
            <i className="fas fa-times-circle analytics-card-icon"></i>
            <div>
              <h3 className="analytics-card-number">{filteredAssets.filter(a => computeAssetStatus(a.licenseType, a.expirationDate) === 'Unserviceable').length}</h3>
              <p className="analytics-card-label">Unserviceable</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="analytics-loading-wrapper">
            <div className="analytics-loading-spinner-element"></div>
            <p className="analytics-loading-text">Loading assets...</p>
          </div>
        ) : (
          <>
            <table className="analytics-data-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Asset ID</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Serial No</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.length > 0 ? (
                  paginatedAssets.map((asset, idx) => (
                    <tr key={idx}>
                      <td>{asset.assetName}</td>
                      <td>{asset.assetId}</td>
                      <td>{asset.category}</td>
                      <td>
                        <span className={`analytics-status-pill analytics-status-${computeAssetStatus(asset.licenseType, asset.expirationDate).toLowerCase()}`}>
                          {computeAssetStatus(asset.licenseType, asset.expirationDate)}
                        </span>
                      </td>
                      <td>{asset.personnel ? uidToNameMap[asset.personnel] || asset.personnel : 'Unassigned'}</td>
                      <td>{asset.serialNo}</td>
                      <td>{asset.assignedDate || asset.purchaseDate || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No assets found for selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {filteredAssets.length > itemsPerPage && (
              <div className="analytics-pagination">
                <button 
                  className="analytics-pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="analytics-pagination-info">
                  Page {currentPage} of {totalPages} ({filteredAssets.length} total assets)
                </span>
                <button 
                  className="analytics-pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <div className="analytics-action-buttons">
          <button className="analytics-action-btn analytics-print-button" onClick={handlePrint}>
            <i className="fas fa-print"></i> Print Report
          </button>
          <button className="analytics-action-btn analytics-pdf-button" onClick={exportPDF}>
            <i className="fas fa-file-pdf"></i> Download PDF
          </button>
        </div>

        <div id="analytics-printable-report" style={{ display: "none" }}>
          <div className="analytics-print-header">
            <img src="/dohlogo1.png" style={{ height: 60, float: "left" }} alt="DOH Logo" />
            <img src="/pilipinas.jpg" style={{ height: 60, float: "right" }} alt="Pilipinas Logo" />
            <h3>Republic of the Philippines</h3>
            <h4>Department of Health - Treatment and Rehabilitation Center - Argao</h4>
            <p>Candabong, Binlod, Argao, Cebu, Municipality of Argao, 6021 Cebu</p>
            <p>Email: dohtrc@doh.gov.ph</p>
            <h2 style={{ marginTop: 20 }}>IT Asset Report</h2>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>

          {hasActiveFilters && (
            <div className="analytics-print-filters">
              <strong>Filters Applied:</strong>
              {month && <div>Month: {new Date(0, parseInt(month) - 1).toLocaleString("default", { month: "long" })}</div>}
              {year && <div>Year: {year}</div>}
              {status && <div>Status: {status}</div>}
              {category && <div>Category: {category}</div>}
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }} border={1}>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Asset ID</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Serial No</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset, idx) => (
                <tr key={idx}>
                  <td>{asset.assetName}</td>
                  <td>{asset.assetId}</td>
                  <td>{asset.category}</td>
                  <td>{computeAssetStatus(asset.licenseType, asset.expirationDate)}</td>
                  <td>{asset.personnel ? uidToNameMap[asset.personnel] || asset.personnel : 'Unassigned'}</td>
                  <td>{asset.serialNo}</td>
                  <td>{asset.assignedDate || asset.purchaseDate || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="analytics-print-signature">
            <p>Prepared by:</p>
            <div style={{ height: 40 }}></div>
            <h4>RONZEL GO</h4>
            <p>Head, Information Technology Unit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;