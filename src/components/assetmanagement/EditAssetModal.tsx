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
import "../../assets/EditAssetModal.css"; // Import custom CSS

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
  const [categories, setCategories] = useState<string[]>([]);
  const qrPreviewRef = useRef<HTMLDivElement | null>(null);

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
      const list: ITUser[] = snap.docs.map((d) => {
        const data: any = d.data();
        const first = data.FirstName || data.firstName || "";
        const middle = data.MiddleInitial || data.middleName || "";
        const last = data.LastName || data.lastName || "";
        const fullName = [first, middle, last].filter(Boolean).join(" ");
        const position =
          data.Position ||
          data.Role ||
          data.Position_Name ||
          data.Department ||
          "";
        return { id: d.id, fullName, position };
      });
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setItUsers(list);
    });
    return () => unsub();
  }, []);

  // Render QR Preview
  useEffect(() => {
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
            text: JSON.stringify({ assetId, assetUrl }),
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
  }, [form]);

  const onChange = (key: keyof AssetDoc, value: any) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const makeQRDataUrl = async (value: string): Promise<string> => {
    const canvas = document.createElement("canvas");
    QrCreator.render(
      {
        text: value,
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
        licenseType: form.licenseType || "",
        personnel: form.personnel || "",
        purchaseDate: form.purchaseDate || "",
        renewdate: form.renewdate || "",
        serialNo: form.serialNo || "",
        status: form.status || "",
        assetId: form.assetId || "",
        assetUrl: form.assetUrl || "",
        generateQR: !!form.generateQR,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "",
      };

      if (form.generateQR) {
        const assetId = form.assetId || form.docId;
        const assetUrl =
          form.assetUrl ||
          `${window.location.origin}/dashboard/${encodeURIComponent(assetId)}`;
        const qrString = JSON.stringify({ assetId, assetUrl });
        const dataUrl = await makeQRDataUrl(qrString);

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

  const handleDelete = async () => {
    if (!form?.docId) return toast.error("Missing asset ID.");
    if (
      !window.confirm(
        `⚠️ Delete asset?\n\n"${form.assetName}" (Serial: ${form.serialNo})\nThis will move it to Deleted_Assets.`
      )
    )
      return;

    setDeleting(true);
    try {
      const ref = doc(db, "IT_Assets", form.docId);
      const archive = {
        ...form,
        deletedAt: new Date().toISOString(),
        deletedBy: auth.currentUser?.email || "",
        originalId: form.docId,
      };
      await addDoc(collection(db, "Deleted_Assets"), archive);
      await deleteDoc(ref);
      toast.success("Asset archived and deleted.");
      onDeleted?.(form.docId);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete asset.");
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
          <button className="close-icon-btn" onClick={onClose} title="Close">
            <i className="fas fa-times"></i>
          </button>
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
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      <i className="fas fa-key"></i> License Type
                    </label>
                    <select
                      className="form-select"
                      value={form.licenseType || ""}
                      onChange={(e) => onChange("licenseType", e.target.value)}
                    >
                      <option value="">Select License Type</option>
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

            {/* Right Column - QR Preview */}
            <div className="qr-column">
              <div className="qr-preview-card">
                <h3 className="qr-preview-title">
                  <i className="fas fa-qrcode"></i> QR Code Preview
                </h3>
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