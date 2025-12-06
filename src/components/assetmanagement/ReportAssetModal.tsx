import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import "../../assets/reportassetmodal.css";
import ViewAssetReportsModal from "./ViewAssetReportsModal";

interface ReportAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetDocId: string;
  assetName: string;
}

const ReportAssetModal: React.FC<ReportAssetModalProps> = ({
  isOpen,
  onClose,
  assetId,
  assetDocId,
  assetName,
}) => {
  const [condition, setCondition] = useState("");
  const [reason, setReason] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // New states for existing reports check
  const [hasExistingReports, setHasExistingReports] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [showViewReports, setShowViewReports] = useState(false);
  const [checkingReports, setCheckingReports] = useState(true);

  // Check for existing reports when modal opens
  useEffect(() => {
    if (!isOpen || !assetDocId) {
      setCheckingReports(false);
      return;
    }

    const checkExistingReports = async () => {
      setCheckingReports(true);
      try {
        const reportsRef = collection(db, "Reported_Issues");
        const q1 = query(reportsRef, where("assetDocId", "==", assetDocId));
        const q2 = query(reportsRef, where("assetId", "==", assetDocId));
        const snap1 = await getDocs(q1);
        const snap2 = await getDocs(q2);

        const count = snap1.size + snap2.size;
        
        setReportCount(count);
        setHasExistingReports(count > 0);
      } catch (error) {
        console.error("Error checking existing reports:", error);
      } finally {
        setCheckingReports(false);
      }
    };

    checkExistingReports();
  }, [isOpen, assetDocId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!condition || !reason.trim()) {
      toast.error("Please provide both asset condition and reason.");
      return;
    }

    if (reason.trim().length < 10) {
      toast.error("Please provide a more detailed description (at least 10 characters).");
      return;
    }

    setSubmitting(true);

    try {
      const reportData = {
        assetId,
        assetDocId,
        assetName,
        reportedBy: auth.currentUser?.email || "Unknown User",
        condition,
        reason: reason.trim(),
        image: preview || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "Reported_Issues"), reportData);

      toast.success("Report submitted successfully.");
      
      // Reset form
      setCondition("");
      setReason("");
      setImage(null);
      setPreview(null);
      
      onClose();
    } catch (err) {
      console.error("Failed to submit report:", err);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewExistingReports = () => {
    setShowViewReports(true);
  };

  const handleCloseViewReports = () => {
    setShowViewReports(false);
  };

  const handleAddAnotherReport = () => {
    setShowViewReports(false);
    // Keep the report modal open so user can add new report
  };

  return (
    <>
      <div className="report-asset-backdrop" onClick={onClose}>
        <div className="report-asset-function" onClick={(e) => e.stopPropagation()}>
          <div className="report-asset-header">
            <div className="report-asset-title-date">
              <h2>Report Asset Issue</h2>
              <span className="report-asset-date">
                <b>Date:</b> {new Date().toLocaleDateString()}
              </span>
            </div>
            <p className="report-asset-subtitle">
              Reporting: <strong>{assetName}</strong>
            </p>
          </div>

          {/* Existing Reports Warning */}
          {checkingReports ? (
            <div className="checking-reports">
              <div className="spinner-small"></div>
              <span>Checking existing reports...</span>
            </div>
          ) : hasExistingReports && (
            <div className="existing-reports-warning">
              <div className="warning-icon">
                <i className="fas fa-info-circle" />
              </div>
              <div className="warning-content">
                <p className="warning-title">
                  This asset already has {reportCount} existing report{reportCount !== 1 ? 's' : ''}
                </p>
                <p className="warning-text">
                  Before submitting a new report, please review existing issues to avoid duplicates.
                </p>
                <button 
                  className="view-existing-btn"
                  onClick={handleViewExistingReports}
                  type="button"
                >
                  <i className="fas fa-eye" />
                  View Existing Reports
                </button>
              </div>
            </div>
          )}

          <div className="report-asset-body">
            <div className="report-asset-row">
              <label>
                Asset Condition <span className="required">*</span>
              </label>
              <select 
                className="report-asset-select"
                value={condition} 
                onChange={(e) => setCondition(e.target.value)}
                disabled={submitting}
              >
                <option value="">-- Select Condition --</option>
                <option value="Damaged">Damaged</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Defective">Defective</option>
                <option value="Unserviceable">Unserviceable</option>
              </select>
            </div>

            <div className="report-asset-row">
              <label>
                Reason / Description <span className="required">*</span>
              </label>
              <textarea
                className="report-asset-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue in detail (minimum 10 characters)..."
                rows={4}
                disabled={submitting}
                minLength={10}
              />
              <span className="char-count">
                {reason.length} characters
              </span>
            </div>

            <div className="report-asset-row">
              <label>Attach Image (optional)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="report-asset-file-input"
                disabled={submitting}
              />
              {preview && (
                <div className="report-asset-preview">
                  <img src={preview} alt="Preview" />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => {
                      setImage(null);
                      setPreview(null);
                    }}
                    disabled={submitting}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="report-asset-footer">
            <button 
              className="report-asset-btn report-asset-cancel" 
              onClick={onClose} 
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              className="report-asset-btn report-asset-submit" 
              onClick={handleSubmit} 
              disabled={submitting || !condition || !reason.trim() || reason.trim().length < 10}
            >
              {submitting ? (
                <>
                  <div className="spinner-small" />
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* View Existing Reports Modal */}
      <ViewAssetReportsModal
        isOpen={showViewReports}
        onClose={handleCloseViewReports}
        assetDocId={assetDocId}
        assetName={assetName}
        onAddNewReport={handleAddAnotherReport}
      />
    </>
  );
};

export default ReportAssetModal;