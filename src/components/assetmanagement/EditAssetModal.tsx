// src/components/assetmanagement/EditAssetModal.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  addDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";
import QrCreator from "qr-creator";
import { toast } from "react-toastify";
import "../../assets/EditAssetModal.css";

type HistoryEntry = {
  changedAt?: any;
  changedBy?: string;
  from?: string;
  to?: string;
  reason?: string;
  maintainedBy?: string;
};

type AssetDoc = {
  docId?: string;
  assetId?: string;
  assetName?: string;
  assetUrl?: string;
  category?: string;
  subType?: string; // NEW: Asset Type or License Type
  licenseType?: string;
  personnel?: string;
  purchaseDate?: string;
  renewdate?: string;
  serialNo?: string;
  status?: string;
  qrcode?: string | null;
  generateQR?: boolean;
  image?: string;
  createdBy?: string;
  createdAt?: any;
  updatedBy?: string;
  updatedAt?: any;
  assetHistory?: HistoryEntry[];
  statusReason?: string;
  maintainedBy?: string;
};

interface ITUser {
  id: string;
  fullName: string;
  position?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetDoc | null;
  onSaved?: (updated?: AssetDoc) => void;
  onDeleted?: (archivedId?: string) => void;
}

const NON_EXPIRING = new Set(["Perpetual", "OEM", "Open Source"]);
const WARN_BYTES = 700 * 1024;
const ABORT_BYTES = 950 * 1024;

// Asset and License type options
const ASSET_TYPES = [
  'Furniture and Fixture',
  'Desktop',
  'Laptop',
  'Printer',
  'Server',
  'Machinery/Equipment',
  'Infrastructure',
  'Vehicles/Transport'
];

const LICENSE_TYPES = [
  'Software License',
  'Business License',
  'Government License',
  'General License'
];

const EditAssetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  asset,
  onSaved,
  onDeleted,
}) => {
  const [form, setForm] = useState<AssetDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itUsers, setItUsers] = useState<ITUser[]>([]);
  const [uidToNameMap, setUidToNameMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"qr" | "image">("qr");
  const qrPreviewRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    setForm(asset ? { ...asset } : null);
  }, [asset]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Asset_Categories"));
        const list: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          if (data.Category_Name) list.push(data.Category_Name);
        });
        list.sort();
        setCategories(list);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch IT personnel
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "IT_Supply_Users"), (snap) => {
      const umap: Record<string, string> = {};
      const list: ITUser[] = snap.docs.map((d) => {
        const data: any = d.data();
        const uid = d.id;
        const first = data.FirstName || data.firstName || "";
        const middle = data.MiddleInitial || data.middleName || "";
        const last = data.LastName || data.lastName || "";
        
        let middleInitial = '';
        if (middle) {
          if (middle.length > 1 && !middle.endsWith('.')) {
            middleInitial = middle.charAt(0).toUpperCase() + '.';
          } else {
            middleInitial = middle.trim();
            if (middleInitial.length === 1) middleInitial += '.';
          }
        }
        
        const fullName = [first, middleInitial, last].filter(Boolean).join(" ") || "Unknown User";
        umap[uid] = fullName;
        
        const position =
          data.Position ||
          data.Role ||
          data.Position_Name ||
          data.Department ||
          "";
        return { id: uid, fullName, position };
      });
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setItUsers(list);
      setUidToNameMap(umap);
    });
    return () => unsub();
  }, []);

  // Render QR Preview
useEffect(() => {
  if (previewMode !== "qr") return;
  
  const container = qrPreviewRef.current;
  if (!container || !form) return;
  container.innerHTML = "";

  const assetId = form.assetId || form.docId || "";
  const assetUrl =
    form.assetUrl ||
    `${window.location.origin}/dashboard/${encodeURIComponent(assetId)}`;

  if (form.qrcode && !form.generateQR) {
    container.innerHTML = `<img src="${form.qrcode}" class="qr-image" alt="QR Code" />`;
    return;
  }

  if (form.generateQR) {
    try {
      QrCreator.render(
        {
          text: assetUrl, // ✅ CHANGED: Just the URL, not JSON
          radius: 0.45,
          ecLevel: "H",
          fill: "#162a37",
          background: null,
          size: 250,
        },
        container as any
      );
    } catch (e) {
      console.error("QR preview failed:", e);
      container.innerHTML = `<div class="qr-error"><i class="fas fa-exclamation-triangle"></i> Preview unavailable</div>`;
    }
  } else {
    container.innerHTML = `<div class="qr-placeholder"><i class="fas fa-qrcode"></i><p>QR generation disabled</p></div>`;
  }
}, [form, previewMode]);

  const onChange = (key: keyof AssetDoc, value: any) => {
    // Reset subType when category changes
    if (key === 'category') {
      setForm((prev) => (prev ? { ...prev, category: value, subType: '' } : prev));
    } else {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      onChange("image", result);
      setPreviewMode("image");
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (window.confirm("Are you sure you want to remove the asset image?")) {
      onChange("image", "");
      if (imageInputRef.current) imageInputRef.current.value = "";
      toast.info("Image removed.");
    }
  };

  const makeQRDataUrl = async (url: string): Promise<string> => {
  const canvas = document.createElement("canvas");
  QrCreator.render(
    {
      text: url, // ✅ CHANGED: Just the URL, not JSON
      radius: 0.45,
      ecLevel: "H",
      fill: "#162a37",
      background: null,
      size: 250,
    },
    canvas as any
  );
  return (canvas as HTMLCanvasElement).toDataURL("image/png");
};

  const handleSave = async () => {
    if (!form?.docId) return toast.error("Missing asset ID.");
    const origStatus = asset?.status || "";
    const newStatus = form.status || "";

    if (origStatus !== newStatus && (!form.statusReason || !form.statusReason.trim()))
      return toast.error("Please provide a reason for status change.");
    if (origStatus === "Under Maintenance" && newStatus === "Functional" && !form.maintainedBy)
      return toast.error("Specify who performed maintenance.");

    setSaving(true);
    try {
      const assetRef = doc(db, "IT_Assets", form.docId);
      const payload: any = {
        assetName: form.assetName || "",
        category: form.category || "",
        subType: form.subType || "",
        licenseType: form.licenseType || "",
        personnel: form.personnel || "",
        purchaseDate: form.purchaseDate || "",
        renewdate: form.renewdate || "",
        serialNo: form.serialNo || "",
        status: form.status || "",
        assetId: form.assetId || "",
        assetUrl: form.assetUrl || "",
        generateQR: !!form.generateQR,
        image: form.image || "",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "",
      };

      if (form.generateQR) {
        const assetId = form.assetId || form.docId;
        const assetUrl =
          form.assetUrl ||
          `${window.location.origin}/dashboard/${encodeURIComponent(assetId)}`;
        
        // ✅ CHANGED: Pass URL directly, not JSON
        const dataUrl = await makeQRDataUrl(assetUrl);

        const base64 = dataUrl.split(",")[1] || "";
        const bytes = Math.ceil((base64.length * 3) / 4);

        if (bytes > ABORT_BYTES) throw new Error("QR image too large.");
        if (bytes > WARN_BYTES) {
          const ok = window.confirm(
            `Generated QR size is ${Math.round(bytes / 1024)} KB. Continue?`
          );
          if (!ok) return;
        }

        payload.qrcode = dataUrl;
        payload.assetUrl = assetUrl;
      } else {
        payload.qrcode = null;
      }

      if (origStatus !== newStatus) {
        const entry: HistoryEntry = {
          changedAt: new Date().toISOString(),
          changedBy: auth.currentUser?.email || "",
          from: origStatus,
          to: newStatus,
          reason: form.statusReason || "",
          maintainedBy:
            origStatus === "Under Maintenance" && newStatus === "Functional"
              ? form.maintainedBy
              : "",
        };
        await updateDoc(assetRef, { ...payload, assetHistory: arrayUnion(entry) });
      } else {
        await updateDoc(assetRef, payload);
      }

      toast.success("Asset updated successfully!");
      onSaved?.(form);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentUserFullName = (): string => {
    const uid = auth.currentUser?.uid;
    if (uid && uidToNameMap[uid]) {
      return uidToNameMap[uid];
    }
    return auth.currentUser?.email || 'Unknown User';
  };

  const handleDelete = async () => {
    if (!form?.docId) {
      toast.error("Missing asset ID.");
      console.error("Delete failed: No docId found in form");
      return;
    }
    
    const warningMessage = 
      `⚠️ WARNING: You will be held accountable for the deletion of this asset.\n\n` +
      `Asset: "${form.assetName || 'Unknown'}" (Serial: ${form.serialNo || 'N/A'})\n` +
      `Category: ${form.category || 'Unknown'}\n\n` +
      `Are you absolutely sure you want to delete this asset? This action cannot be undone.`;

    if (!window.confirm(warningMessage)) return;

    setDeleting(true);
    try {
      console.log("Starting delete process for asset:", form.docId);
      
      const assetRef = doc(db, "IT_Assets", form.docId);
      
      const deletedBy = getCurrentUserFullName();
      const deletedByEmail = auth.currentUser?.email || '';
      const deletedAt = new Date().toISOString();

      console.log("Creating audit record...", {
        deletedBy,
        deletedByEmail,
        assetName: form.assetName
      });

      // Create audit record with all asset data
      const auditRecord = {
        assetId: form.assetId || '',
        assetName: form.assetName || '',
        assetUrl: form.assetUrl || '',
        category: form.category || '',
        subType: form.subType || '',
        licenseType: form.licenseType || '',
        personnel: form.personnel || '',
        purchaseDate: form.purchaseDate || '',
        renewdate: form.renewdate || '',
        serialNo: form.serialNo || '',
        status: form.status || '',
        qrcode: form.qrcode || null,
        generateQR: form.generateQR || false,
        image: form.image || '',
        createdBy: form.createdBy || '',
        createdAt: form.createdAt || null,
        updatedBy: form.updatedBy || '',
        updatedAt: form.updatedAt || null,
        assetHistory: form.assetHistory || [],
        deletedAt,
        deletedBy,
        deletedByEmail,
        deletionReason: 'User-initiated deletion from Edit Modal',
        originalId: form.docId,
      };

      // Save to Deleted_Assets first
      const deletedDocRef = await addDoc(collection(db, "Deleted_Assets"), auditRecord);
      console.log("Audit record created:", deletedDocRef.id);
      
      // Then delete from IT_Assets
      await deleteDoc(assetRef);
      console.log("Asset deleted from IT_Assets:", form.docId);
      
      toast.success("Asset deleted and archived successfully.");
      onDeleted?.(form.docId);
      onClose();
    } catch (err: any) {
      console.error("❌ Delete failed:", err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      let errorMessage = "Failed to delete asset.";
      if (err.code === 'permission-denied') {
        errorMessage = "Permission denied. You don't have access to delete this asset.";
      } else if (err.code === 'not-found') {
        errorMessage = "Asset not found. It may have already been deleted.";
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !form) return null;

  return (
    <div className="edit-modal-backdrop" onClick={onClose}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-modal-header">
          <div className="header-content">
            <div className="header-icon">
              <i className="fas fa-edit"></i>
            </div>
            <div className="header-text">
              <h2>Edit Asset</h2>
              <span className="asset-id-badge">ID: {form.assetId || form.docId}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="edit-modal-body">
          <div className="form-grid">
            {/* Left Column - Form Fields */}
            <div className="form-column">
              <div className="form-section">
                <h3 className="section-title">
                  <i className="fas fa-info-circle"></i> Basic Information
                </h3>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-tag"></i> Asset Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.assetName || ""}
                    onChange={(e) => onChange("assetName", e.target.value)}
                    placeholder="Enter asset name"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-folder"></i> Category
                    </label>
                    <select
                      className="form-select"
                      value={form.category || ""}
                      onChange={(e) => onChange("category", e.target.value)}
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter((c) => c !== "Consumables")
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Conditional Sub-Type Field */}
                  {form.category === 'Asset' && (
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-box"></i> Asset Type
                      </label>
                      <select
                        className="form-select"
                        value={form.subType || ""}
                        onChange={(e) => onChange("subType", e.target.value)}
                      >
                        <option value="">-- Select Asset Type --</option>
                        {ASSET_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.category === 'License' && (
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-certificate"></i> License Type
                      </label>
                      <select
                        className="form-select"
                        value={form.subType || ""}
                        onChange={(e) => onChange("subType", e.target.value)}
                      >
                        <option value="">-- Select License Type --</option>
                        {LICENSE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.category !== 'Asset' && form.category !== 'License' && (
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-barcode"></i> Serial Number
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.serialNo || ""}
                        onChange={(e) => onChange("serialNo", e.target.value)}
                        placeholder="Serial number"
                      />
                    </div>
                  )}
                </div>

                {(form.category === 'Asset' || form.category === 'License') && (
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-barcode"></i> Serial Number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.serialNo || ""}
                      onChange={(e) => onChange("serialNo", e.target.value)}
                      placeholder="Serial number"
                    />
                  </div>
                )}

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-key"></i> Operational Period
                    </label>
                    <select
                      className="form-select"
                      value={form.licenseType || ""}
                      onChange={(e) => onChange("licenseType", e.target.value)}
                    >
                      <option value="">Select Operational Period</option>
                      <option value="Perpetual">Perpetual</option>
                      <option value="Subscription">Subscription</option>
                      <option value="Trial">Trial</option>
                      <option value="OEM">OEM</option>
                      <option value="Open Source">Open Source</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-user"></i> Assigned To
                    </label>
                    <select
                      className="form-select"
                      value={form.personnel || ""}
                      onChange={(e) => onChange("personnel", e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {itUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                          {u.position ? ` (${u.position})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">
                  <i className="fas fa-calendar-alt"></i> Dates & Status
                </h3>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-shopping-cart"></i> Purchase Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.purchaseDate ? String(form.purchaseDate).slice(0, 10) : ""}
                      onChange={(e) => onChange("purchaseDate", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-sync-alt"></i> Renewal Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.renewdate ? String(form.renewdate).slice(0, 10) : ""}
                      onChange={(e) => onChange("renewdate", e.target.value)}
                      disabled={NON_EXPIRING.has(form.licenseType || "")}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-heartbeat"></i> Status
                  </label>
                  <select
                    className="form-select"
                    value={form.status || ""}
                    onChange={(e) => onChange("status", e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Functional">✓ Functional</option>
                    <option value="Under Maintenance">⚙️ Under Maintenance</option>
                    <option value="Defective">⚠️ Defective</option>
                    <option value="Unserviceable">✗ Unserviceable</option>
                  </select>
                </div>

                {asset?.status !== form.status && (
                  <div className="form-group status-change-alert">
                    <label className="form-label">
                      <i className="fas fa-comment-alt"></i> Reason for Status Change <span className="required">*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      value={form.statusReason || ""}
                      onChange={(e) => onChange("statusReason", e.target.value)}
                      placeholder="Explain why the status was changed..."
                      rows={3}
                    />
                  </div>
                )}

                {asset?.status === "Under Maintenance" && form.status === "Functional" && (
                  <div className="form-group maintenance-alert">
                    <label className="form-label">
                      <i className="fas fa-wrench"></i> Maintained By <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.maintainedBy || ""}
                      onChange={(e) => onChange("maintainedBy", e.target.value)}
                      placeholder="Person/Team who performed maintenance"
                    />
                  </div>
                )}
              </div>

              <div className="form-section qr-section">
                <div className="qr-toggle">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!form.generateQR}
                      onChange={(e) => onChange("generateQR", e.target.checked)}
                    />
                    <span className="checkbox-text">
                      <i className="fas fa-qrcode"></i> Generate QR Code for this asset
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - QR/Image Preview */}
            <div className="qr-column">
              <div className="qr-preview-card">
                <div className="preview-header">
                  <h3 className="qr-preview-title">
                    <i className={previewMode === "qr" ? "fas fa-qrcode" : "fas fa-image"}></i>
                    {previewMode === "qr" ? "QR Code Preview" : "Asset Image Preview"}
                  </h3>
                  <div className="preview-toggle-buttons">
                    <button
                      type="button"
                      className={`toggle-btn ${previewMode === "qr" ? "active" : ""}`}
                      onClick={() => setPreviewMode("qr")}
                    >
                      <i className="fas fa-qrcode"></i>
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${previewMode === "image" ? "active" : ""}`}
                      onClick={() => setPreviewMode("image")}
                    >
                      <i className="fas fa-image"></i>
                    </button>
                  </div>
                </div>

                {previewMode === "qr" && (
                  <>
                    <div className="qr-preview-container" ref={qrPreviewRef}></div>
                    <div className="qr-preview-info">
                      {form.generateQR ? (
                        <p className="info-text generating">
                          <i className="fas fa-sync-alt fa-spin"></i> Live preview - not saved yet
                        </p>
                      ) : form.qrcode ? (
                        <p className="info-text existing">
                          <i className="fas fa-check-circle"></i> Showing saved QR code
                        </p>
                      ) : (
                        <p className="info-text disabled">
                          <i className="fas fa-info-circle"></i> QR generation is disabled
                        </p>
                      )}
                    </div>
                  </>
                )}

                {previewMode === "image" && (
                  <>
                    <div className="image-preview-container">
                      {form.image ? (
                        <div className="image-preview-wrapper">
                          <img src={form.image} alt="Asset" className="asset-preview-image" />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={handleRemoveImage}
                            title="Remove image"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="image-placeholder">
                          <i className="fas fa-image"></i>
                          <p>No image uploaded</p>
                        </div>
                      )}
                    </div>
                    <div className="image-upload-section">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                        id="asset-image-upload"
                      />
                      <label htmlFor="asset-image-upload" className="upload-btn">
                        <i className="fas fa-upload"></i>
                        {form.image ? "Change Image" : "Upload Image"}
                      </label>
                      <p className="upload-hint">Max size: 5MB • PNG, JPG, WEBP</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <button
            className="btn btn-delete"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Deleting...
              </>
            ) : (
              <>
                <i className="fas fa-trash-alt"></i> Delete Asset
              </>
            )}
          </button>
          <div className="footer-right">
            <button
              className="btn btn-cancel"
              onClick={onClose}
              disabled={saving || deleting}
            >
              <i className="fas fa-times"></i> Cancel
            </button>
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={saving || deleting}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;