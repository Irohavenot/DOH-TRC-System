import React, { useState } from "react";
import { db, auth } from "../../firebase/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import "../../assets/reportassetmodal.css";

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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

    setSubmitting(true);

    try {
      const reportData = {
        assetId,
        assetDocId,
        assetName,
        reportedBy: auth.currentUser?.email || "Unknown User",
        condition,
        reason,
        image: preview || null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "Reported_Issues"), reportData);

      toast.success("Report submitted successfully.");
      onClose();
      setCondition("");
      setReason("");
      setImage(null);
      setPreview(null);
    } catch (err) {
      console.error("Failed to submit report:", err);
      toast.error("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-asset-backdrop" onClick={onClose}>
      <div className="report-asset-function" onClick={(e) => e.stopPropagation()}>
        <div className="report-asset-header">
          <h2>Report Asset Issue</h2>
          <p className="report-asset-subtitle">
            Reporting: <strong>{assetName}</strong>
          </p>
        </div>

        <div className="report-asset-body">
          <div className="report-asset-row">
            <label>Asset Condition</label>
            <select 
              className="report-asset-select"
              value={condition} 
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">-- Select Condition --</option>
              <option value="Damaged">Damaged</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Defective">Defective</option>
              <option value="Unserviceable">Unserviceable</option>
            </select>
          </div>

          <div className="report-asset-row">
            <label>Reason / Description</label>
            <textarea
              className="report-asset-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
            />
          </div>

          <div className="report-asset-row">
            <label>Attach Image (optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="report-asset-file-input"
            />
            {preview && (
              <div className="report-asset-preview">
                <img src={preview} alt="Preview" />
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
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportAssetModal;