import { useState, useEffect } from 'react';
import React from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, arrayUnion, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
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
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  disposedBy?: string;
  disposedAt?: Date;
  disposalReason?: string;
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
            resolvedBy: data.resolvedBy || '',
            resolvedAt: data.resolvedAt?.toDate() || undefined,
            resolutionNotes: data.resolutionNotes || '',
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

  // Show confirmation modal before status change
  const showConfirmationModal = (
    reportId: string, 
    newStatus: string, 
    assetName: string,
    currentStatus: string
  ): Promise<{ confirmed: boolean; maintainedBy?: string; reason?: string }> => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'confirmation-modal-backdrop';
      
      const actionText = newStatus === 'In Repair' ? 'repair' : 
                        newStatus === 'In Progress' ? 'maintenance' : 'resolution';
      
      const needsMaintainer = newStatus === 'Resolved';
      
      modal.innerHTML = `
        <div class="confirmation-modal">
          <div class="confirmation-modal-header">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Confirm ${newStatus} Action</h3>
          </div>
          <div class="confirmation-modal-body">
            <p><strong>Asset:</strong> ${assetName}</p>
            <p><strong>Current Status:</strong> ${currentStatus}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
            <br>
            <p>Are you sure you want to mark this issue as <strong>${newStatus}</strong>?</p>
            ${needsMaintainer ? `
              <div class="form-group">
                <label class="form-label">
                  <i class="fas fa-wrench"></i> Resolved/Maintained By <span class="required">*</span>
                </label>
                <input
                  type="text"
                  id="maintainedBy"
                  class="form-input"
                  placeholder="Enter name of person/team"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">
                  <i class="fas fa-comment-alt"></i> Resolution Notes <span class="required">*</span>
                </label>
                <textarea
                  id="statusReason"
                  class="form-textarea"
                  placeholder="Describe what was done to resolve the issue..."
                  rows="3"
                  required
                ></textarea>
              </div>
            ` : ''}
          </div>
          <div class="confirmation-modal-footer">
            <button class="btn btn-cancel" id="cancelBtn">
              <i class="fas fa-times"></i> Cancel
            </button>
            <button class="btn btn-confirm" id="confirmBtn">
              <i class="fas fa-check"></i> Confirm
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const confirmBtn = modal.querySelector('#confirmBtn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#cancelBtn') as HTMLButtonElement;
      const maintainedByInput = modal.querySelector('#maintainedBy') as HTMLInputElement;
      const reasonInput = modal.querySelector('#statusReason') as HTMLTextAreaElement;
      
      const cleanup = () => {
        document.body.removeChild(modal);
      };
      
      confirmBtn.onclick = () => {
        if (needsMaintainer) {
          const maintainedBy = maintainedByInput?.value.trim();
          const reason = reasonInput?.value.trim();
          
          if (!maintainedBy || !reason) {
            alert('Please fill in all required fields.');
            return;
          }
          
          cleanup();
          resolve({ confirmed: true, maintainedBy, reason });
        } else {
          cleanup();
          resolve({ confirmed: true });
        }
      };
      
      cancelBtn.onclick = () => {
        cleanup();
        resolve({ confirmed: false });
      };
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve({ confirmed: false });
        }
      };
    });
  };

  // Handle disposal of asset
  const handleDisposeAsset = async (report: Report) => {
    const warningMessage = 
      `⚠️ WARNING: You will be held accountable for the disposal of this asset.\n\n` +
      `Asset: "${report.assetName}" (ID: ${report.assetId})\n\n` +
      `Are you absolutely sure you want to dispose this asset? This action cannot be undone.`;

    if (!window.confirm(warningMessage)) return;

    // Get disposal reason
    const disposalReason = window.prompt('Please provide a reason for disposal:');
    if (!disposalReason || disposalReason.trim() === '') {
      alert('Disposal reason is required.');
      return;
    }

    try {
      if (!report.assetDocId) {
        throw new Error('Asset document ID not found');
      }

      const assetRef = doc(db, 'IT_Assets', report.assetDocId);
      const assetDoc = await getDoc(assetRef);

      if (!assetDoc.exists()) {
        throw new Error('Asset not found');
      }

      const assetData = assetDoc.data();
      const deletedBy = auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
      const deletedByEmail = auth.currentUser?.email || '';
      const deletedAt = new Date().toISOString();

      // Create comprehensive audit record
      const auditRecord = {
        assetId: assetData.assetId || '',
        assetName: assetData.assetName || '',
        assetUrl: assetData.assetUrl || '',
        category: assetData.category || '',
        subType: assetData.subType || '',
        licenseType: assetData.licenseType || '',
        personnel: assetData.personnelId || '',
        personnelName: assetData.personnel || '',
        purchaseDate: assetData.purchaseDate || '',
        renewdate: assetData.renewdate || '',
        serialNo: assetData.serialNo || '',
        status: assetData.status || '',
        qrcode: assetData.qrcode || null,
        generateQR: assetData.generateQR || false,
        image: assetData.image || '',
        createdBy: assetData.createdBy || '',
        createdAt: assetData.createdAt || '',
        updatedBy: assetData.updatedBy || '',
        updatedAt: assetData.updatedAt || '',
        assetHistory: assetData.assetHistory || [],
        hasReports: assetData.hasReports || false,
        reportCount: assetData.reportCount || 0,
        deletedAt,
        deletedBy,
        deletedByEmail,
        deletionReason: `Disposed - ${disposalReason.trim()}`,
        originalId: report.assetDocId,
        relatedReportId: report.id,
      };

      // Save to Deleted_Assets first
      await addDoc(collection(db, 'Deleted_Assets'), auditRecord);
      
      // Update report status to disposed
      const reportRef = doc(db, 'Reported_Issues', report.id);
      await updateDoc(reportRef, {
        condition: 'Disposed',
        disposedBy: deletedBy,
        disposedAt: new Date(),
        disposalReason: disposalReason.trim()
      });

      // Then delete from IT_Assets
      await deleteDoc(assetRef);
      
      // Update local state
      setReports(reports.map(r => 
        r.id === report.id ? { ...r, condition: 'Disposed' } : r
      ));

      alert('Asset disposed and archived successfully');
      closeModal();
    } catch (error) {
      console.error('Error disposing asset:', error);
      alert('Failed to dispose asset. Please try again.');
    }
  };

  // Update status in Firestore and corresponding asset
  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      // Find the report to get asset details
      const report = reports.find(r => r.id === reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Show confirmation modal
      const confirmation = await showConfirmationModal(
        reportId, 
        newStatus, 
        report.assetName,
        report.condition
      );
      
      if (!confirmation.confirmed) {
        return; // User cancelled
      }

      // Map report status to asset status
      let assetStatus = '';
      if (newStatus === 'In Progress') {
        assetStatus = 'Under Maintenance';
      } else if (newStatus === 'In Repair') {
        assetStatus = 'Under Maintenance';
      } else if (newStatus === 'Resolved') {
        assetStatus = 'Functional';
      }

      // Update the report status
      const reportRef = doc(db, 'Reported_Issues', reportId);
      const updateData: any = {
        condition: newStatus
      };

      // If resolved, add resolution details
      if (newStatus === 'Resolved' && confirmation.maintainedBy && confirmation.reason) {
        updateData.resolvedBy = confirmation.maintainedBy;
        updateData.resolvedAt = new Date();
        updateData.resolutionNotes = confirmation.reason;
      }

      await updateDoc(reportRef, updateData);

      // Update the corresponding asset status if we have a valid mapping
      if (assetStatus && report.assetDocId) {
        const assetRef = doc(db, 'IT_Assets', report.assetDocId);
        
        // Create history entry for asset
        const historyEntry = {
          changedAt: new Date().toISOString(),
          changedBy: auth.currentUser?.email || 'Unknown',
          from: report.condition,
          to: assetStatus,
          reason: confirmation.reason || `Issue reported: ${report.reason}`,
          maintainedBy: confirmation.maintainedBy || ''
        };

        await updateDoc(assetRef, {
          status: assetStatus,
          updatedAt: new Date(),
          updatedBy: auth.currentUser?.email || 'Unknown',
          assetHistory: arrayUnion(historyEntry)
        });
      }

      // Update local state
      setReports(reports.map(r => 
        r.id === reportId ? { 
          ...r, 
          condition: newStatus,
          resolvedBy: confirmation.maintainedBy,
          resolvedAt: newStatus === 'Resolved' ? new Date() : r.resolvedAt,
          resolutionNotes: confirmation.reason
        } : r
      ));

      alert('Status updated successfully!');
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
    } else if (statusLower.includes('progress') || statusLower.includes('repair')) {
      return '#3b82f6';
    } else if (statusLower.includes('resolved') || statusLower.includes('fixed')) {
      return '#10b981';
    } else if (statusLower.includes('disposed')) {
      return '#6b7280';
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
      <div className="reports-filter-section">
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

                          {(report.condition.toLowerCase().includes('defective') || 
                            report.condition.toLowerCase().includes('unserviceable') ||
                            report.condition.toLowerCase().includes('damaged')) && (
                            <>
                              <button
                                className="action-btn in-repair"
                                onClick={() => handleStatusChange(report.id, 'In Repair')}
                              >
                                <i className="fas fa-tools"></i> In Repair
                              </button>
                              <button
                                className="action-btn resolved"
                                onClick={() => handleStatusChange(report.id, 'Resolved')}
                              >
                                Resolved
                              </button>
                            </>
                          )}

                          {(report.condition.toLowerCase().includes('progress') || 
                            report.condition.toLowerCase().includes('repair')) && (
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

                          {report.condition.toLowerCase().includes('disposed') && (
                            <span className="status-completed">
                              <i className="fas fa-trash"></i> Disposed
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
        <div className="report-modal-backdrop" onClick={closeModal}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h2>
                <i className="fas fa-exclamation-triangle"></i>
                Issue Details
              </h2>
              <button className="report-modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="report-modal-content">
              <div className="report-modal-info-item">
                <i className="fas fa-laptop"></i>
                <div>
                  <div className="report-info-label">Asset Name</div>
                  <div className="report-info-value">{selectedReport.assetName}</div>
                </div>
              </div>

              <div className="report-modal-info-item">
                <i className="fas fa-barcode"></i>
                <div>
                  <div className="report-info-label">Asset ID</div>
                  <div className="report-info-value">{selectedReport.assetId}</div>
                </div>
              </div>

              <div className="report-modal-info-item">
                <i className="fas fa-calendar-alt"></i>
                <div>
                  <div className="report-info-label">Date Reported</div>
                  <div className="report-info-value">
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

              <div className="report-modal-info-item">
                <i className="fas fa-user"></i>
                <div>
                  <div className="report-info-label">Reported By</div>
                  <div className="report-info-value">{selectedReport.reportedBy}</div>
                </div>
              </div>

              <div className="report-modal-info-item full-width">
                <i className="fas fa-info-circle"></i>
                <div>
                  <div className="report-info-label">Issue Description</div>
                  <div className="report-info-value report-issue-description">{selectedReport.reason}</div>
                </div>
              </div>

              <div className="report-modal-info-item">
                <i className="fas fa-flag"></i>
                <div>
                  <div className="report-info-label">Current Status</div>
                  <div className="report-info-value">
                    <span 
                      className="status-badge large"
                      style={{ backgroundColor: getStatusColor(selectedReport.condition) }}
                    >
                      {selectedReport.condition}
                    </span>
                  </div>
                </div>
              </div>

              {selectedReport.condition.toLowerCase().includes('resolved') && selectedReport.resolvedBy && (
                <>
                  <div className="report-modal-info-item">
                    <i className="fas fa-user-check"></i>
                    <div>
                      <div className="report-info-label">Resolved By</div>
                      <div className="report-info-value">{selectedReport.resolvedBy}</div>
                    </div>
                  </div>

                  {selectedReport.resolvedAt && (
                    <div className="report-modal-info-item">
                      <i className="fas fa-clock"></i>
                      <div>
                        <div className="report-info-label">Resolved At</div>
                        <div className="report-info-value">
                          {selectedReport.resolvedAt.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedReport.disposalReason && (
                    <div className="report-modal-info-item full-width">
                      <i className="fas fa-trash-alt"></i>
                      <div>
                        <div className="report-info-label">Disposal Reason</div>
                        <div className="report-info-value report-issue-description">
                          {selectedReport.disposalReason}
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedReport.resolutionNotes && (
                    <div className="report-modal-info-item full-width">
                      <i className="fas fa-check-circle"></i>
                      <div>
                        <div className="report-info-label">Resolution Notes</div>
                        <div className="report-info-value report-issue-description">{selectedReport.resolutionNotes}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedReport.image && (
                <div className="report-modal-info-item full-width">

                     
                  <i className="fas fa-image"></i>
                  <div>
                    <div className="report-info-label">Attached Image</div>
                    <img 
                      src={selectedReport.image} 
                      alt="Issue" 
                      className="report-issue-image"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="report-modal-footer">
              <button className="report-btn-secondary" onClick={closeModal}>
                <i className="fas fa-times"></i> Close
              </button>
              
              {!selectedReport.condition.toLowerCase().includes('resolved') && 
               !selectedReport.condition.toLowerCase().includes('disposed') && (
                <>
                  {/* Show In Progress for Under Maintenance */}
                  {selectedReport.condition.toLowerCase().includes('maintenance') && (
                    <button 
                      className="report-btn-status in-progress"
                      onClick={() => {
                        handleStatusChange(selectedReport.id, 'In Progress');
                        closeModal();
                      }}
                    >
                      <i className="fas fa-spinner"></i> In Progress
                    </button>
                  )}

                  {/* Show In Repair for Defective/Damaged/Unserviceable */}
                  {(selectedReport.condition.toLowerCase().includes('defective') || 
                    selectedReport.condition.toLowerCase().includes('damaged') ||
                    selectedReport.condition.toLowerCase().includes('unserviceable')) && (
                    <button 
                      className="report-btn-status in-repair"
                      onClick={() => {
                        handleStatusChange(selectedReport.id, 'In Repair');
                        closeModal();
                      }}
                    >
                      <i className="fas fa-tools"></i> In Repair
                    </button>
                  )}

                  {/* Dispose button for all non-resolved items */}
                  <button 
                    className="report-btn-danger"
                    onClick={() => handleDisposeAsset(selectedReport)}
                  >
                    <i className="fas fa-trash-alt"></i> Dispose Item
                  </button>

                  {/* Mark as Resolved button */}
                  <button 
                    className="report-btn-primary"
                    onClick={() => {
                      handleStatusChange(selectedReport.id, 'Resolved');
                      closeModal();
                    }}
                  >
                    <i className="fas fa-check"></i> Mark as Resolved
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

export default Reports;