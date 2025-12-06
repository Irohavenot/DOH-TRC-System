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
  query,
  orderBy,
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
  subType?: string;
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

const ASSET_TYPES = [
  "Furniture and Fixture",
  "Desktop",
  "Laptop",
  "Printer",
  "Server",
  "Machinery/Equipment",
  "Infrastructure",
  "Vehicles/Transport",
];

const LICENSE_TYPES = [
  "Software License",
  "Business License",
  "Government License",
  "General License",
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
  const [statuses, setStatuses] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"qr" | "image">("qr");
  const qrPreviewRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Renewal/Extension states
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalMonths, setRenewalMonths] = useState<number>(12);
  const [renewalReason, setRenewalReason] = useState("");

  // Initialize form when modal opens
  useEffect(() => {
    setForm(asset ? { ...asset } : null);
  }, [asset]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "Asset_Categories"),
            orderBy("Category_Name", "asc")
          )
        );
        const list: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          if (data.Category_Name) list.push(data.Category_Name);
        });
        setCategories(list);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "Asset_Status"), orderBy("Status_Name", "asc"))
        );
        const list: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          if (data.Status_Name) list.push(data.Status_Name);
        });
        setStatuses(list);
      } catch (err) {
        console.error("Error fetching statuses:", err);
      }
    };
    fetchStatuses();
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

        let middleInitial = "";
        if (middle) {
          if (middle.length > 1 && !middle.endsWith(".")) {
            middleInitial = middle.charAt(0).toUpperCase() + ".";
          } else {
            middleInitial = middle.trim();
            if (middleInitial.length === 1) middleInitial += ".";
          }
        }

        const fullName =
          [first, middleInitial, last].filter(Boolean).join(" ") ||
          "Unknown User";
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
            text: assetUrl,
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
    if (key === "category") {
      setForm((prev) =>
        prev ? { ...prev, category: value, subType: "" } : prev
      );
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

    const maxSize = 5 * 1024 * 1024;
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
        text: url,
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

  // Handle Renewal/Extension
  const handleRenewLicense = () => {
    if (!form?.renewdate) {
      toast.error("Current expiration/service date not set.");
      return;
    }
    setRenewalReason("");
    setRenewalMonths(12);
    setShowRenewalModal(true);
  };

  const confirmRenewal = async () => {
    if (!renewalReason.trim()) {
      toast.error("Please provide a reason for renewal/extension.");
      return;
    }

    if (!form?.renewdate || !form.docId) return;

    try {
      const currentDate = new Date(form.renewdate);
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + renewalMonths);

      const isLicense = form.category?.toLowerCase() === "license";
      const actionLabel = isLicense ? "renewed" : "service extended";

      const historyEntry: HistoryEntry = {
        changedAt: new Date().toISOString(),
        changedBy: auth.currentUser?.email || "Unknown",
        from: form.renewdate,
        to: newDate.toISOString().split("T")[0],
        reason: `${isLicense ? "License" : "Service"} ${actionLabel}: ${renewalReason.trim()}`,
        maintainedBy: auth.currentUser?.email || "",
      };

      const assetRef = doc(db, "IT_Assets", form.docId);
      await updateDoc(assetRef, {
        renewdate: newDate,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "",
        assetHistory: arrayUnion(historyEntry),
      });

      setForm((prev) =>
        prev ? { ...prev, renewdate: newDate.toISOString().split("T")[0] } : prev
      );
      setShowRenewalModal(false);
      toast.success(
        `${isLicense ? "License renewed" : "Service extended"} successfully!`
      );
    } catch (err: any) {
      console.error("Renewal error:", err);
      toast.error("Failed to renew/extend. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!form?.docId) return toast.error("Missing asset ID.");
    const origStatus = asset?.status || "";
    const newStatus = form.status || "";

    if (
      origStatus !== newStatus &&
      (!form.statusReason || !form.statusReason.trim())
    )
      return toast.error("Please provide a reason for status change.");
    if (
      origStatus === "Under Maintenance" &&
      newStatus === "Functional" &&
      !form.maintainedBy
    )
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
    return auth.currentUser?.email || "Unknown User";
  };

  const handleDelete = async () => {
    if (!form?.docId) {
      toast.error("Missing asset ID.");
      return;
    }

    const warningMessage =
      `⚠️ WARNING: You will be held accountable for the deletion of this asset.\n\n` +
      `Asset: "${form.assetName || "Unknown"}" (Serial: ${
        form.serialNo || "N/A"
      })\n` +
      `Category: ${form.category || "Unknown"}\n\n` +
      `Are you absolutely sure you want to delete this asset? This action cannot be undone.`;

    if (!window.confirm(warningMessage)) return;

    setDeleting(true);
    try {
      const assetRef = doc(db, "IT_Assets", form.docId);

      const deletedBy = getCurrentUserFullName();
      const deletedByEmail = auth.currentUser?.email || "";
      const deletedAt = new Date().toISOString();

      const auditRecord = {
        assetId: form.assetId || "",
        assetName: form.assetName || "",
        assetUrl: form.assetUrl || "",
        category: form.category || "",
        subType: form.subType || "",
        licenseType: form.licenseType || "",
        personnel: form.personnel || "",
        purchaseDate: form.purchaseDate || "",
        renewdate: form.renewdate || "",
        serialNo: form.serialNo || "",
        status: form.status || "",
        qrcode: form.qrcode || null,
        generateQR: form.generateQR || false,
        image: form.image || "",
        createdBy: form.createdBy || "",
        createdAt: form.createdAt || null,
        updatedBy: form.updatedBy || "",
        updatedAt: form.updatedAt || null,
        assetHistory: form.assetHistory || [],
        deletedAt,
        deletedBy,
        deletedByEmail,
        deletionReason: "User-initiated deletion from Edit Modal",
        originalId: form.docId,
      };

      await addDoc(collection(db, "Deleted_Assets"), auditRecord);
      await deleteDoc(assetRef);

      toast.success("Asset deleted and archived successfully.");
      onDeleted?.(form.docId);
      onClose();
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Failed to delete asset.");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !form) return null;

  const isLicenseCategory = form.category?.toLowerCase() === "license";
  const getExpirationLabel = () =>
    isLicenseCategory ? "Expiration Date" : "End of Service";
  const canRenew =
    form.renewdate && !NON_EXPIRING.has(form.licenseType || "");

  return (
    <>
      <div className="edit-modal-backdrop" onClick={onClose}>
        <div
          className="edit-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="edit-modal-header">
            <div className="header-content">
              <div className="header-icon">
                <i className="fas fa-edit"></i>
              </div>
              <div className="header-text">
                <h2>Edit Asset</h2>
                <span className="asset-id-badge">
                  ID: {form.assetId || form.docId}
                </span>
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

                    {form.category === "Asset" && (
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

                    {form.category === "License" && (
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

                    {form.category !== "Asset" &&
                      form.category !== "License" && (
                        <div className="form-group">
                          <label className="form-label">
                            <i className="fas fa-barcode"></i> Serial Number
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={form.serialNo || ""}
                            onChange={(e) =>
                              onChange("serialNo", e.target.value)
                            }
                            placeholder="Serial number"
                          />
                        </div>
                      )}
                  </div>

                  {(form.category === "Asset" ||
                    form.category === "License") && (
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
                        onChange={(e) =>
                          onChange("licenseType", e.target.value)
                        }
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
                        value={
                          form.purchaseDate
                            ? String(form.purchaseDate).slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          onChange("purchaseDate", e.target.value)
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-sync-alt"></i>{" "}
                        {getExpirationLabel()}
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="date"
                          className="form-input"
                          value={
                            form.renewdate
                              ? String(form.renewdate).slice(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            onChange("renewdate", e.target.value)
                          }
                          disabled={NON_EXPIRING.has(
                            form.licenseType || ""
                          )}
                          style={{ flex: 1 }}
                        />
                        {canRenew && (
                          <button
                            type="button"
                            className="renewal-btn"
                            onClick={handleRenewLicense}
                            title={
                              isLicenseCategory
                                ? "Renew License"
                                : "Extend Service"
                            }
                          >
                            <i className="fas fa-redo-alt"></i>
                          </button>
                        )}
                      </div>
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
                      {statuses.map((stat) => (
                        <option key={stat} value={stat}>
                          {stat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {asset?.status !== form.status && (
                    <div className="form-group status-change-alert">
                      <label className="form-label">
                        <i className="fas fa-comment-alt"></i> Reason for
                        Status Change <span className="required">*</span>
                      </label>
                      <textarea
                        className="form-textarea"
                        value={form.statusReason || ""}
                        onChange={(e) =>
                          onChange("statusReason", e.target.value)
                        }
                        placeholder="Explain why the status was changed..."
                        rows={3}
                      />
                    </div>
                  )}

                  {asset?.status === "Under Maintenance" &&
                    form.status === "Functional" && (
                      <div className="form-group maintenance-alert">
                        <label className="form-label">
                          <i className="fas fa-wrench"></i> Maintained By{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={form.maintainedBy || ""}
                          onChange={(e) =>
                            onChange("maintainedBy", e.target.value)
                          }
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
                        onChange={(e) =>
                          onChange("generateQR", e.target.checked)
                        }
                      />
                      <span className="checkbox-text">
                        <i className="fas fa-qrcode"></i> Generate QR Code for
                        this asset
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
                      <i
                        className={
                          previewMode === "qr"
                            ? "fas fa-qrcode"
                            : "fas fa-image"
                        }
                      ></i>
                      {previewMode === "qr"
                        ? "QR Code Preview"
                        : "Asset Image Preview"}
                    </h3>
                    <div className="preview-toggle-buttons">
                      <button
                        type="button"
                        className={`toggle-btn ${
                          previewMode === "qr" ? "active" : ""
                        }`}
                        onClick={() => setPreviewMode("qr")}
                      >
                        <i className="fas fa-qrcode"></i>
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${
                          previewMode === "image" ? "active" : ""
                        }`}
                        onClick={() => setPreviewMode("image")}
                      >
                        <i className="fas fa-image"></i>
                      </button>
                    </div>
                  </div>

                  {previewMode === "qr" && (
                    <>
                      <div
                        className="qr-preview-container"
                        ref={qrPreviewRef}
                      ></div>
                      <div className="qr-preview-info">
                        {form.generateQR ? (
                          form.qrcode ? (
                            <p className="info-text existing">
                              <i className="fas fa-check-circle"></i> Showing
                              saved QR code
                            </p>
                          ) : (
                            <p className="info-text generating">
                              <i className="fas fa-sync-alt fa-spin"></i> Live
                              preview - not saved yet
                            </p>
                          )
                        ) : (
                          <p className="info-text disabled">
                            <i className="fas fa-info-circle"></i> QR generation
                            is disabled
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
                            <img
                              src={form.image}
                              alt="Asset"
                              className="asset-preview-image"
                            />
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
                        <label
                          htmlFor="asset-image-upload"
                          className="upload-btn"
                        >
                          <i className="fas fa-upload"></i>
                          {form.image ? "Change Image" : "Upload Image"}
                        </label>
                        <p className="upload-hint">
                          Max size: 5MB • PNG, JPG, WEBP
                        </p>
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

      {/* Renewal/Extension Modal */}
      {showRenewalModal && (
        <div
          className="renewal-modal-backdrop"
          onClick={() => setShowRenewalModal(false)}
        >
          <div
            className="renewal-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="renewal-modal-header">
              <h3>
                <i className="fas fa-redo-alt"></i>
                {isLicenseCategory ? " Renew License" : " Extend Service"}
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowRenewalModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="renewal-modal-body">
              <div className="renewal-info">
                <p>
                  <strong>Current {getExpirationLabel()}:</strong>{" "}
                  {form.renewdate
                    ? new Date(form.renewdate).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Asset:</strong> {form.assetName}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-calendar-plus"></i> Extension Period
                  (months)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={renewalMonths}
                  onChange={(e) =>
                    setRenewalMonths(parseInt(e.target.value) || 12)
                  }
                  min="1"
                  max="120"
                />
                <p className="renewal-preview">
                  New {getExpirationLabel()}:{" "}
                  {form.renewdate
                    ? new Date(
                        new Date(form.renewdate).setMonth(
                          new Date(form.renewdate).getMonth() + renewalMonths
                        )
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-comment-alt"></i> Reason for{" "}
                  {isLicenseCategory ? "Renewal" : "Extension"}{" "}
                  <span className="required">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  value={renewalReason}
                  onChange={(e) => setRenewalReason(e.target.value)}
                  placeholder={`Explain why the ${
                    isLicenseCategory
                      ? "license is being renewed"
                      : "service is being extended"
                  }...`}
                  rows={3}
                />
              </div>
            </div>
            <div className="renewal-modal-footer">
              <button
                className="btn btn-cancel"
                onClick={() => setShowRenewalModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-save"
                onClick={confirmRenewal}
                disabled={!renewalReason.trim()}
              >
                <i className="fas fa-check"></i>{" "}
                Confirm {isLicenseCategory ? "Renewal" : "Extension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditAssetModal;
