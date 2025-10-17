import { useState, useEffect } from 'react';
import React from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import "../../assets/Reports.css";

interface Report {
  id: string;
  assetDocId: string;
  assetId: string;
  assetName: string;
  condition: string;
  createdAt: Date;
  image: string | null;
  reason: string;
  reportedBy: string;
}

const Reports: React.FC = () => {
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch reports from Firestore
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const reportsRef = collection(db, 'Reported_Issues');
        const q = query(reportsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedReports: Report[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            assetDocId: data.assetDocId || '',
            assetId: data.assetId || '',
            assetName: data.assetName || '',
            condition: data.condition || 'Pending',
            createdAt: data.createdAt?.toDate() || new Date(),
            image: data.image || null,
            reason: data.reason || '',
            reportedBy: data.reportedBy || '',
          };
        });
        
        setReports(fetchedReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Update status in Firestore
  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const reportRef = doc(db, 'Reported_Issues', reportId);
      await updateDoc(reportRef, {
        condition: newStatus
      });

      // Update local state
      setReports(reports.map(report => 
        report.id === reportId ? { ...report, condition: newStatus } : report
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Filter by selected month and year
  const filteredReports = reports.filter((report) => {
    const reportDate = report.createdAt;
    const reportMonth = (reportDate.getMonth() + 1).toString().padStart(2, '0');
    const reportYear = reportDate.getFullYear().toString();

    const matchesMonth = month ? reportMonth === month : true;
    const matchesYear = year ? reportYear === year : true;

    return matchesMonth && matchesYear;
  });

  // Get status color
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending') || statusLower.includes('maintenance')) {
      return '#f59e0b';
    } else if (statusLower.includes('progress')) {
      return '#3b82f6';
    } else if (statusLower.includes('resolved') || statusLower.includes('fixed')) {
      return '#10b981';
    }
    return '#6b7280';
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Open modal
  const openModal = (report: Report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
  };

  return (
    <div className="reports-container">
      <h2>Reported IT Asset Issues</h2>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="month">Month:</label>
          <select id="month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All Months</option>
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((monthName, index) => {
              const value = String(index + 1).padStart(2, '0');
              return (
                <option key={value} value={value}>
                  {monthName}
                </option>
              );
            })}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="year">Year:</label>
          <select id="year" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All Years</option>
            {Array.from({ length: 2050 - 2020 + 1 }, (_, i) => {
              const y = (2020 + i).toString();
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading reports...</p>
        </div>
      ) : (
        /* Reports Table */
        <table className="reports-table">
          <thead>
            <tr>
              <th>Date Reported</th>
              <th>Asset Name</th>
              <th>Asset ID</th>
              <th>Issue Type</th>
              <th>Reported By</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length > 0 ? (
              Object.entries(
                filteredReports.reduce((acc, report) => {
                  const date = report.createdAt;
                  const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
                  if (!acc[monthYear]) acc[monthYear] = [];
                  acc[monthYear].push(report);
                  return acc;
                }, {} as Record<string, Report[]>)
              ).map(([monthYear, reportsInMonth], groupIndex) => (
                <React.Fragment key={groupIndex}>
                  <tr className="month-header">
                    <td colSpan={7}>
                      {monthYear}
                    </td>
                  </tr>
                  {reportsInMonth.map((report, index) => (
                    <tr key={`${groupIndex}-${index}`}>
                      <td>{report.createdAt.toLocaleDateString()}</td>
                      <td>{report.assetName}</td>
                      <td className="asset-id-cell">{report.assetId}</td>
                      <td>
                        <div className="issue-cell">
                          <span className="issue-text">{truncateText(report.reason)}</span>
                          <button 
                            className="view-details-btn"
                            onClick={() => openModal(report)}
                          >
                            <i className="fas fa-eye"></i> View
                          </button>
                        </div>
                      </td>
                      <td>{report.reportedBy}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(report.condition) }}
                        >
                          {report.condition}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {report.condition.toLowerCase().includes('maintenance') && (
                            <>
                              <button
                                className="action-btn in-progress"
                                onClick={() => handleStatusChange(report.id, 'In Progress')}
                              >
                                In Progress
                              </button>
                              <button
                                className="action-btn resolved"
                                onClick={() => handleStatusChange(report.id, 'Resolved')}
                              >
                                Resolved
                              </button>
                            </>
                          )}

                          {report.condition.toLowerCase().includes('progress') && (
                            <button
                              className="action-btn resolved"
                              onClick={() => handleStatusChange(report.id, 'Resolved')}
                            >
                              Resolved
                            </button>
                          )}

                          {report.condition.toLowerCase().includes('resolved') && (
                            <span className="status-completed">
                              <i className="fas fa-check-circle"></i> Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty-message">
                  <i className="fas fa-inbox"></i>
                  <p>No reports found for selected filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Issue Details Modal */}
      {showModal && selectedReport && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="issue-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-exclamation-triangle"></i>
                Issue Details
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-content">
              <div className="modal-info-item">
                <i className="fas fa-laptop"></i>
                <div>
                  <div className="info-label">Asset Name</div>
                  <div className="info-value">{selectedReport.assetName}</div>
                </div>
              </div>

              <div className="modal-info-item">
                <i className="fas fa-barcode"></i>
                <div>
                  <div className="info-label">Asset ID</div>
                  <div className="info-value">{selectedReport.assetId}</div>
                </div>
              </div>

              <div className="modal-info-item">
                <i className="fas fa-calendar-alt"></i>
                <div>
                  <div className="info-label">Date Reported</div>
                  <div className="info-value">
                    {selectedReport.createdAt.toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-info-item">
                <i className="fas fa-user"></i>
                <div>
                  <div className="info-label">Reported By</div>
                  <div className="info-value">{selectedReport.reportedBy}</div>
                </div>
              </div>

              <div className="modal-info-item full-width">
                <i className="fas fa-info-circle"></i>
                <div>
                  <div className="info-label">Issue Description</div>
                  <div className="info-value issue-description">{selectedReport.reason}</div>
                </div>
              </div>

              <div className="modal-info-item">
                <i className="fas fa-flag"></i>
                <div>
                  <div className="info-label">Current Status</div>
                  <div className="info-value">
                    <span 
                      className="status-badge large"
                      style={{ backgroundColor: getStatusColor(selectedReport.condition) }}
                    >
                      {selectedReport.condition}
                    </span>
                  </div>
                </div>
              </div>

              {selectedReport.image && (
                <div className="modal-info-item full-width">
                  <i className="fas fa-image"></i>
                  <div>
                    <div className="info-label">Attached Image</div>
                    <img 
                      src={selectedReport.image} 
                      alt="Issue" 
                      className="issue-image"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                <i className="fas fa-times"></i> Close
              </button>
              {!selectedReport.condition.toLowerCase().includes('resolved') && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    handleStatusChange(selectedReport.id, 'Resolved');
                    closeModal();
                  }}
                >
                  <i className="fas fa-check"></i> Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;