import { useEffect, useRef, useState } from 'react';
import QrCreator from 'qr-creator';
import jsPDF from 'jspdf';
import "../../assets/qrcodegenerator.css";
import { useLocation } from "react-router-dom";
import { db, auth } from '../../firebase/firebase';
import { addDoc, collection, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']); // disables expiration

// ───────────────────────────────────────────────────────────────────────────────
// NEW: URL helpers so QR works on localhost, LAN IP/host, and production
// .env examples:
//   VITE_PUBLIC_BASE_URL=https://your-app.example.com
//   VITE_QR_HASH_MODE=true   // set this if you use HashRouter (adds "/#")
// ───────────────────────────────────────────────────────────────────────────────
function getPublicBase(): string {
  const envBase = import.meta.env.VITE_PUBLIC_BASE_URL?.toString().trim();
  if (envBase) {
    try {
      const u = new URL(envBase);
      // keep origin + optional subpath (no trailing slash)
      return (u.origin + u.pathname).replace(/\/+$/, '');
    } catch {
      // if it's not a full URL, just trim trailing slash
      return envBase.replace(/\/+$/, '');
    }
  }
  return window.location.origin; // e.g., http://localhost:5173 or http://192.168.x.x:5173
}

function buildAssetUrl(assetId: string): string {
  const base = getPublicBase();
  const useHash = import.meta.env.VITE_QR_HASH_MODE === 'true';
  const path = `/dashboard/${encodeURIComponent(assetId)}`;
  return useHash ? `${base}/#${path}` : `${base}${path}`;
}
// ───────────────────────────────────────────────────────────────────────────────

const QRCodeGenerator = () => {
  const location = useLocation();
  const categoryFromState = location.state?.category || "";

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);      // QR modal
  const [showConfirm, setShowConfirm] = useState(false);  // Confirm modal
  const [qrValue, setQrValue] = useState('');
  const [itUsers, setItUsers] = useState<User[]>([]);
  const qrRef = useRef<HTMLDivElement>(null);

  const [pendingReset, setPendingReset] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // simple toast state
  const [toast, setToast] = useState<{ message: string; type?: 'error'|'success'|'info'} | null>(null);
  const showToast = (message: string, type: 'error'|'success'|'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  interface User {
    id: string;
    FirstName: string;
    MiddleInitial?: string;
    LastName: string;
    Department?: string;
    fullName?: string;
  }

  const [assetDetails, setAssetDetails] = useState({
    assetId: '',
    assetName: '',
    category: categoryFromState,
    subType: '',               // Specific type based on category
    status: '',
    personnel: '',             // store user id (string) or ""
    purchaseDate: '',          // "YYYY-MM-DD" or ""
    serialNo: '',
    licenseType: '',
    expirationDate: '',        // "YYYY-MM-DD" or ""
    generateQR: true,
  });

  const resetForm = () => {
    setAssetDetails(prev => ({
      assetId: '',
      assetName: '',
      category: prev.category, // keep last category (change to "" if you prefer)
      subType: '',
      status: '',
      personnel: '',
      purchaseDate: '',
      serialNo: '',
      licenseType: '',
      expirationDate: '',
      generateQR: true,
    }));
    setImagePreview(null);
    setQrValue('');
    if (qrRef.current) qrRef.current.innerHTML = '';
  };

  // ---- helpers ----
  const generateAssetId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ASSET-${timestamp}-${randomStr}`;
  };

  const renderQRTo = (value: string, container: HTMLElement) => {
    container.innerHTML = '';
    QrCreator.render(
      {
        text: value,
        radius: 0.45,
        ecLevel: 'H',
        fill: '#162a37',
        background: null,
        size: 250,
      },
      container
    );
  };

  const makeQRDataUrl = (value: string): Promise<string> => {
    return new Promise((resolve) => {
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
      resolve((canvas as HTMLCanvasElement).toDataURL("image/png"));
    });
  };

  // ---- effects ----
  useEffect(() => {
    // IT Supply Users
    (async () => {
      try {
        const q = query(
          collection(db, "IT_Supply_Users"),
          where("Department", "==", "Supply Unit")
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            fullName: `${data.FirstName} ${data.MiddleInitial ? data.MiddleInitial + "." : ""} ${data.LastName}`,
          };
        });
        setItUsers(users);
      } catch (e) {
        console.error("Error fetching IT Supply users:", e);
        showToast("Failed to load personnel list.", 'error');
      }
    })();
  }, []);

  // Disable/clear expiration if license becomes non-expiring
  useEffect(() => {
    if (NON_EXPIRING.has(assetDetails.licenseType) && assetDetails.expirationDate) {
      setAssetDetails((prev) => ({ ...prev, expirationDate: '' }));
    }
  }, [assetDetails.licenseType]);

  // ---- validation ----
  const validate = (): boolean => {
    if (!assetDetails.assetName.trim()) {
      showToast('Asset Name is required.', 'error'); return false;
    }
    if (!assetDetails.category) {
      showToast('Please select a Category.', 'error'); return false;
    }
    if (assetDetails.category === 'Asset' && !assetDetails.subType) {
      showToast('Please select an Asset Type.', 'error'); return false;
    }
    if (assetDetails.category === 'License' && !assetDetails.subType) {
      showToast('Please select a License Type.', 'error'); return false;
    }
    if (!assetDetails.status) {
      showToast('Please select a Status.', 'error'); return false;
    }
    if (!assetDetails.licenseType) {
      showToast('Please select a License Duration.', 'error'); return false;
    }
    if (!assetDetails.personnel) {
      showToast('Please assign a Personnel.', 'error'); return false;
    }
    if (!NON_EXPIRING.has(assetDetails.licenseType) && !assetDetails.expirationDate) {
      showToast('Expiration Date is required for Subscription/Trial.', 'error'); return false;
    }
    return true;
  };

  // ---- confirm modal control ----
  const openConfirm = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };
  const closeConfirm = () => setShowConfirm(false);

  // ---- handlers ----
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    if (name === 'category') {
      setAssetDetails((prev) => ({
        ...prev,
        category: value,
        subType: '', // reset subType when category changes
      }));
      return;
    }

    if (name === 'licenseType') {
      setAssetDetails((prev) => ({
        ...prev,
        licenseType: value,
        expirationDate: NON_EXPIRING.has(value) ? '' : prev.expirationDate,
      }));
      return;
    }

    if (type === 'checkbox') {
      setAssetDetails((prev) => ({ ...prev, [name]: checked }));
    } else {
      setAssetDetails((prev) => ({ ...prev, [name]: value }));
    }
  };

  // skipValidation: used when called from Confirm Add
  const handleAddAsset = async (skipValidation = false) => {
    if (isSubmitting) return;
    try {
      if (!skipValidation && !validate()) return;

      setIsSubmitting(true);

      // Generate ID and URL
      const assetId = generateAssetId();

      // ───────────────────────────────────────────────────────────────────
      // NEW: build the asset URL that works on localhost / LAN / prod
      const assetUrl = buildAssetUrl(assetId);
      // ───────────────────────────────────────────────────────────────────

      // QR: only if opted in
      let qrcode = "";
      if (assetDetails.generateQR) {
        qrcode = await makeQRDataUrl(assetUrl);
        setQrValue(assetUrl);
        setShowModal(true);
        setTimeout(() => {
          if (qrRef.current) renderQRTo(assetUrl, qrRef.current);
        }, 0);
      }

      // renewdate: timestamp or null
      const renewdate =
        assetDetails.expirationDate ? new Date(assetDetails.expirationDate) : null;

      // Prepare Firestore payload
      const payload = {
        assetId,
        assetName: assetDetails.assetName || "",
        assetUrl,
        category: assetDetails.category || "",
        subType: assetDetails.subType || "",
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || "",
        expirationDate: assetDetails.expirationDate || "",
        generateQR: !!assetDetails.generateQR,
        image: imagePreview || "",
        licenseType: assetDetails.licenseType || "",
        personnel: assetDetails.personnel || "",
        purchaseDate: assetDetails.purchaseDate || "",
        qrcode,                 // Base64 string or ""
        renewdate,              // Date or null (Firestore stores as Timestamp)
        serialNo: assetDetails.serialNo || "",
        status: assetDetails.status || "",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "",
      };

      await addDoc(collection(db, "IT_Assets"), payload);
      showToast('Asset added successfully.', 'success');

      // reflect generated assetId in the read-only field (optional)
      setAssetDetails((prev) => ({ ...prev, assetId }));

      // decide when to reset
      if (assetDetails.generateQR) {
        setPendingReset(true);  // wait until QR modal closes
      } else {
        resetForm();
      }
    } catch (err: any) {
      console.error("❌ Error adding asset:", err.message);
      showToast(`Error adding asset: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- print / download ----
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      const qrDataUrl = canvas?.toDataURL() || '';

      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR</title>
            <style>
              body { text-align: center; font-family: sans-serif; padding: 2rem; }
              .qr-wrapper { text-align: center; border: 1px solid #ddd; padding: 1rem; border-radius: 8px; }
              .qr-container { margin: 1rem auto; }
              .details-container {
                display: flex; justify-content: space-between;
                width: 250px; margin: 1rem auto 0; font-size: 14px; font-weight: bold;
              }
              .details-container p { margin: 0; width: 49%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            </style>
          </head>
          <body>
            <div class="qr-wrapper">
              <div class="qr-container">
                <img src="${qrDataUrl}" alt="QR Code" />
              </div>
              <div class="details-container">
                <p><strong>Asset:</strong> ${assetDetails.assetName || 'Asset'}</p>
                <p><strong>Serial:</strong> ${assetDetails.serialNo || 'N/A'}</p>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const canvas = qrRef.current?.querySelector('canvas');
    const qrDataUrl = canvas?.toDataURL() || '';

    const dohLogoUrl = '/dohlogo1.png';
    doc.addImage(dohLogoUrl, 'PNG', 90, 10, 30, 30);
    doc.setFontSize(10);
    doc.text('Department of Health', 105, 45, { align: 'center' });

    const qrWidth = 40;
    const qrHeight = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const qrX = (pageWidth - qrWidth) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, 50, qrWidth, qrHeight);

    const detailsY = 50 + qrHeight + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const assetText = `Asset: ${assetDetails.assetName || 'Asset'}`;
    const serialText = `Serial: ${assetDetails.serialNo || 'N/A'}`;
    const assetTextWidth = doc.getTextWidth(assetText);
    const serialTextWidth = doc.getTextWidth(serialText);
    const totalWidth = assetTextWidth + serialTextWidth + 10;
    const startX = (pageWidth - totalWidth) / 2;

    doc.text(assetText, startX, detailsY);
    doc.text(serialText, startX + assetTextWidth + 10, detailsY);

    doc.save('asset-qr-code.pdf');
  };

  const isExpirationDisabled = NON_EXPIRING.has(assetDetails.licenseType);

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

  return (
    <div className="add-asset-function">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type || 'info'}`}>
          {toast.message}
        </div>
      )}

      <div className="asset-form">
        <h3>
          Add New {assetDetails.category || "Asset"} <br />
        </h3>

        {imagePreview && (
          <div className="image-preview">
            <img src={imagePreview} alt="Uploaded" />
          </div>
        )}

        <div className="form-grid">
          {/* Asset ID (auto-generated after adding) */}
          <div className="form-field">
            <label htmlFor="assetId">Asset ID</label>
            <input
              type="text"
              id="assetId"
              name="assetId"
              placeholder="(Auto Generated)"
              value={assetDetails.assetId || ""}
              readOnly
              className="cursor-not-allowed bg-gray-100"
            />
          </div>

          {/* Asset Name */}
          <div className="form-field">
            <label htmlFor="assetName">
              Asset Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="assetName"
              name="assetName"
              placeholder="Enter asset name"
              onChange={handleInputChange}
              value={assetDetails.assetName}
            />
          </div>

          {/* Category */}
          <div className="form-field">
            <label htmlFor="category">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={assetDetails.category}
              onChange={handleInputChange}
            >
              <option value="">-- Select Category --</option>
              <option value="Asset">Asset</option>
              <option value="License">License</option>
              <option value="Accessory">Accessory</option>
              <option value="Component">Component</option>
            </select>
          </div>

          {/* Conditional Sub-Type Field */}
          {assetDetails.category === 'Asset' && (
            <div className="form-field">
              <label htmlFor="subType">
                Asset Type <span className="required">*</span>
              </label>
              <select
                id="subType"
                name="subType"
                value={assetDetails.subType}
                onChange={handleInputChange}
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

          {assetDetails.category === 'License' && (
            <div className="form-field">
              <label htmlFor="subType">
                License Type <span className="required">*</span>
              </label>
              <select
                id="subType"
                name="subType"
                value={assetDetails.subType}
                onChange={handleInputChange}
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

          {/* Status */}
          <div className="form-field">
            <label htmlFor="status">
              Status <span className="required">*</span>
            </label>
            <select
              id="status"
              name="status"
              onChange={handleInputChange}
              value={assetDetails.status}
            >
              <option value="" disabled>
                -- Select Status --
              </option>
              <option value="Functional">Functional</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Defective">Defective</option>
              <option value="Unserviceable">Unserviceable</option>
            </select>
          </div>

          {/* Assigned Personnel */}
          <div className="form-field">
            <label htmlFor="personnel">
              Assigned Personnel <span className="required">*</span>
            </label>
            <select
              id="personnel"
              name="personnel"
              value={assetDetails.personnel}
              onChange={handleInputChange}
            >
              <option value="">-- Select Personnel --</option>
              {itUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div className="form-field">
            <label htmlFor="purchaseDate">Purchase Date</label>
            <input
              type="date"
              id="purchaseDate"
              name="purchaseDate"
              onChange={handleInputChange}
              value={assetDetails.purchaseDate}
            />
          </div>

          {/* Serial Number */}
          <div className="form-field">
            <label htmlFor="serialNo">Serial No.</label>
            <input
              type="text"
              id="serialNo"
              name="serialNo"
              placeholder="Enter serial number"
              onChange={handleInputChange}
              value={assetDetails.serialNo}
            />
          </div>

          {/* License Duration */}
          <div className="form-field">
            <label htmlFor="licenseType">
              License Duration <span className="required">*</span>
            </label>
            <select
              id="licenseType"
              name="licenseType"
              value={assetDetails.licenseType || ""}
              onChange={handleInputChange}
            >
              <option value="" disabled>
                -- Select Duration --
              </option>
              <option value="Perpetual">Perpetual</option>
              <option value="Subscription">Subscription</option>
              <option value="Trial">Trial</option>
              <option value="OEM">OEM</option>
              <option value="Open Source">Open Source</option>
            </select>
          </div>

          {/* Expiration Date (disabled for non-expiring types) */}
          <div className="form-field">
            <label htmlFor="expirationDate">
              Expiration Date
              {!isExpirationDisabled && <span className="required">*</span>}
            </label>
            <input
              type="date"
              id="expirationDate"
              name="expirationDate"
              onChange={handleInputChange}
              value={assetDetails.expirationDate}
              disabled={isExpirationDisabled}
              placeholder={isExpirationDisabled ? 'Not applicable' : ''}
              className={isExpirationDisabled ? 'disabled' : ''}
            />
          </div>

          {/* Upload Image */}
          <div className="form-field">
            <label htmlFor="assetImage">Upload Image</label>
            <input
              type="file"
              id="assetImage"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setImagePreview(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
        </div>

        {/* Action Bar: centered Add + QR, Clear on right */}
        <div className="action-bar">
          <label htmlFor="generateQR" className="checkbox-inline">
            <input
              type="checkbox"
              id="generateQR"
              name="generateQR"
              checked={assetDetails.generateQR || false}
              onChange={handleInputChange}
            />
            <span>Generate QR Code</span>
          </label>
          <div className="action-center">
            <button
              className="add-btn"
              onClick={openConfirm}
              disabled={isSubmitting}
              aria-label="Add Asset"
            >
              {isSubmitting ? 'Adding…' : 'Add Asset'}
            </button>
          </div>

          <button
            type="button"
            className="clear-btn"
            onClick={resetForm}
            disabled={isSubmitting}
            aria-label="Clear fields"
            title="Clear all fields"
          >
            Clear Fields
          </button>
        </div>
      </div>

      {/* Confirm Add Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <h3>Confirm Add Asset?</h3>

            <div className="confirm-preview">
              {imagePreview && (
                <div className="confirm-image">
                  <img src={imagePreview} alt="Asset preview" />
                </div>
              )}

              <table className="confirm-table">
                <tbody>
                  <tr><th>Asset Name</th><td>{assetDetails.assetName || '—'}</td></tr>
                  <tr><th>Category</th><td>{assetDetails.category || '—'}</td></tr>
                  {assetDetails.category === 'Asset' && assetDetails.subType && (
                    <tr><th>Asset Type</th><td>{assetDetails.subType}</td></tr>
                  )}
                  {assetDetails.category === 'License' && assetDetails.subType && (
                    <tr><th>License Type</th><td>{assetDetails.subType}</td></tr>
                  )}
                  <tr><th>Status</th><td>{assetDetails.status || '—'}</td></tr>
                  <tr>
                    <th>Personnel</th>
                    <td>{itUsers.find(u => u.id === assetDetails.personnel)?.fullName || '—'}</td>
                  </tr>
                  <tr><th>Purchase Date</th><td>{assetDetails.purchaseDate || '—'}</td></tr>
                  <tr><th>Serial No.</th><td>{assetDetails.serialNo || '—'}</td></tr>
                  <tr><th>License Duration</th><td>{assetDetails.licenseType || '—'}</td></tr>
                  <tr>
                    <th>Expiration Date</th>
                    <td>
                      {NON_EXPIRING.has(assetDetails.licenseType)
                        ? 'Not applicable'
                        : (assetDetails.expirationDate || '—')}
                    </td>
                  </tr>
                  <tr><th>Generate QR</th><td>{assetDetails.generateQR ? 'Yes' : 'No'}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={closeConfirm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="confirm-add"
                onClick={async () => {
                  closeConfirm();
                  await handleAddAsset(true); // skipValidation because we already validated
                }}
                disabled={isSubmitting}
              >
                Confirm Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Generated QR Code</h3>
            <div ref={qrRef} className="qr-display" />
            <div className="button-group">
              <button onClick={handlePrint} className="print-btn">Print</button>
              <button onClick={handleDownload} className="download-btn">Download</button>
              <button
                onClick={() => {
                  setShowModal(false);
                  if (pendingReset) {
                    resetForm();
                    setPendingReset(false);
                  }
                }}
                className="close-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeGenerator;