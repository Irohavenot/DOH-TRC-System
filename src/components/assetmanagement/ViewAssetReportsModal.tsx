import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { toast } from "react-toastify";
import "../../assets/viewassetreportsmodal.css";

interface Report {
  id: string;
  assetId: string;
  assetDocId: string;
  assetName: string;
  reportedBy: string;
  condition: string;
  reason: string;
  image?: string | null;
  createdAt: any;
}

interface ViewAssetReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetDocId: string;
  assetName: string;
  onAddNewReport?: () => void;
}

const ViewAssetReportsModal: React.FC<ViewAssetReportsModalProps> = ({
  isOpen,
  onClose,
  assetDocId,
  assetName,
  onAddNewReport,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !assetDocId) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, "Reported_Issues");
        const q = query(
          reportsRef,
          where("assetDocId", "==", assetDocId),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const fetchedReports: Report[] = [];

        snapshot.forEach((doc) => {
          fetchedReports.push({
            id: doc.id,
            ...doc.data(),
          } as Report);
        });

        setReports(fetchedReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [isOpen, assetDocId]);

  if (!isOpen) return null;

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "damaged":
        return "#f59e0b";
      case "under maintenance":
        return "#3b82f6";
      case "defective":
        return "#ef4444";
      case "unserviceable":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="varm-backdrop" onClick={onClose}>
      <div className="varm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="varm-header">
          <div>
            <h2>
              <i className="fas fa-exclamation-triangle" />
              Reported Issues
            </h2>
            <p className="varm-asset-name">
              Asset: <strong>{assetName}</strong>
            </p>
          </div>
          <button className="varm-close-btn" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="varm-body">
          {loading ? (
            <div className="varm-loading">
              <div className="varm-spinner" />
              <p>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="varm-no-reports">
              <i className="fas fa-inbox" />
              <p>No reports found for this asset</p>
            </div>
          ) : (
            <div className="varm-reports-list">
              <div className="varm-reports-count">
                <i className="fas fa-flag" />
                <span>
                  {reports.length} Report{reports.length !== 1 ? "s" : ""}
                </span>
              </div>

              {reports.map((report) => (
                <div key={report.id} className="varm-report-card">
                  <div className="varm-report-header">
                    <span
                      className="varm-condition-badge"
                      style={{
                        backgroundColor: getConditionColor(report.condition),
                      }}
                    >
                      {report.condition}
                    </span>
                    <span className="varm-report-date">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>

                  <div className="varm-report-content">
                    <div className="varm-report-field">
                      <label>
                        <i className="fas fa-user" /> Reported By
                      </label>
                      <p>{report.reportedBy}</p>
                    </div>

                    <div className="varm-report-field">
                      <label>
                        <i className="fas fa-comment-alt" /> Description
                      </label>
                      <p className="varm-reason-text">{report.reason}</p>
                    </div>

                    {report.image && (
                      <div className="varm-report-field">
                        <label>
                          <i className="fas fa-image" /> Attached Image
                        </label>
                        <div
                          className="varm-image-preview"
                          onClick={() => setSelectedImage(report.image!)}
                        >
                          <img src={report.image} alt="Report evidence" />
                          <div className="varm-image-overlay">
                            <i className="fas fa-search-plus" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="varm-footer">
          {onAddNewReport && (
            <button className="varm-add-btn" onClick={onAddNewReport}>
              <i className="fas fa-plus-circle" />
              Add New Report
            </button>
          )}
          <button className="varm-close-footer-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {selectedImage && (
        <div className="varm-lightbox" onClick={() => setSelectedImage(null)}>
          <div className="varm-lightbox-content">
            <button
              className="varm-lightbox-close"
              onClick={() => setSelectedImage(null)}
            >
              <i className="fas fa-times" />
            </button>
            <img src={selectedImage} alt="Full size" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAssetReportsModal;
