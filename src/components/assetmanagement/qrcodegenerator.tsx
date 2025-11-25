// /mnt/data/qrcodegenerator.tsx
import { useEffect, useRef, useState } from 'react';
import QrCreator from 'qr-creator';
import "../../assets/qrcodegenerator.css";
import { useLocation } from "react-router-dom";
import { db, auth } from '../../firebase/firebase';
import { addDoc, collection, getDocs, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import QRModal from './QRModal'; // ✅ Import QRModal component

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
  const [qrAsset, setQrAsset] = useState<any>(null);      // ✅ Asset data for QRModal
  const [itUsers, setItUsers] = useState<User[]>([]);

  const [pendingReset, setPendingReset] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const prefix = `${yyyy}-${mm}-${dd}-`;

  interface Category {
    id: string;
    name: string;
    types?: string[];
  }
  interface Status {
    id: string;
    name: string;
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

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
    assetId: '',        // generated after add (preview only)
    propertyNo: '',     // user-input field (replaces previous Asset ID field)
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
    remarks: '',
  });

  const resetForm = () => {
    setAssetDetails(prev => ({
      assetId: '',
      propertyNo: '',
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
      remarks: '',
    }));
    setImagePreview(null);
    setQrAsset(null);
  };

  // ---- helpers ----
  const generateAssetId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ASSET-${timestamp}-${randomStr}`;
  };

  const makeQRDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve) => {
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
      resolve((canvas as HTMLCanvasElement).toDataURL("image/png"));
    });
  };

  //Category fetch
  useEffect(() => {
    setLoadingCategories(true);
    const q = query(collection(db, "Asset_Categories"), orderBy("Category_Name", "asc"));
    getDocs(q).then(snap => {
      const list = snap.docs.map(d => ({
        id: d.id,
        name: d.data().Category_Name,
        types: d.data().types || [],
      }));
      setCategories(list);
      setLoadingCategories(false);
    }).catch(err => {
      console.error("Error fetching categories:", err);
      showToast("Failed to load categories.", 'error');
      setLoadingCategories(false);
    });
  }, []);

  //Status fetch
  useEffect(() => {
    setLoadingStatuses(true);
    const q = query(collection(db, "Asset_Status"), orderBy("Status_Name", "asc"));
    getDocs(q).then(snap => {
      const list = snap.docs.map(d => ({
        id: d.id,
        name: d.data().Status_Name,
      }));
      setStatuses(list);
      setLoadingStatuses(false);
    }).catch(err => {
      console.error("Error fetching statuses:", err);
      showToast("Failed to load statuses.", 'error');
      setLoadingStatuses(false);
    });
  }, []);

  const selectedCategoryObj = categories.find(
    c => c.name === assetDetails.category
  );

  const hasTypes = selectedCategoryObj?.types && selectedCategoryObj.types.length > 0;

  // Check if selected category is "License"
  const isLicenseCategory = assetDetails.category === 'License';

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
    // Only require subType if the selected category has types
    if (hasTypes && !assetDetails.subType) {
      showToast('Please select a Type for this category.', 'error'); return false;
    }
    if (!assetDetails.status) {
      showToast('Please select a Status.', 'error'); return false;
    }
    if (!assetDetails.licenseType) {
      showToast('Please select an Operational Period.', 'error'); return false;
    }
    if (!assetDetails.personnel) {
      showToast('Please assign a Personnel.', 'error'); return false;
    }
    if (!NON_EXPIRING.has(assetDetails.licenseType) && !assetDetails.expirationDate) {
      showToast('Expiration Date is required for Limited Period.', 'error'); return false;
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    if (name === 'category') {
      setAssetDetails((prev) => ({
        ...prev,
        category: value,
        subType: '', // reset subType when category changes
        licenseType: '', // reset licenseType when category changes
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
      const assetUrl = buildAssetUrl(assetId);

      // QR: only if opted in
      let qrcode = "";
      if (assetDetails.generateQR) {
        qrcode = await makeQRDataUrl(assetUrl);
        
        // ✅ Prepare asset data for QRModal
        setQrAsset({
          id: assetId,
          assetId: assetId,
          assetName: assetDetails.assetName,
          serialNo: assetDetails.serialNo,
          propertyNo: assetDetails.propertyNo,
          purchaseDate: assetDetails.purchaseDate,
          qrcode: qrcode,
          assetUrl: assetUrl,
        });
        
        setShowModal(true);
      }

      // renewdate: timestamp or null
      const renewdate =
        assetDetails.expirationDate ? new Date(assetDetails.expirationDate) : null;

      // Prepare Firestore payload
      const payload = {
        assetId,
        propertyNo: assetDetails.propertyNo || "",
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
        remarks: assetDetails.remarks || "",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "",
      };

      await addDoc(collection(db, "IT_Assets"), payload);
      showToast('Asset added successfully.', 'success');

      // reflect generated assetId in the read-only preview (optional)
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

  const isExpirationDisabled = NON_EXPIRING.has(assetDetails.licenseType);

  // Get operational period options based on selected category
  const getOperationalPeriodOptions = () => {
    if (isLicenseCategory) {
      return [
        { value: 'Subscription', label: 'Subscription' },
        { value: 'Trial', label: 'Trial' },
        { value: 'OEM', label: 'OEM' },
        { value: 'Open Source', label: 'Open Source' },
      ];
    } else {
      return [
        { value: 'Perpetual', label: 'Permanent' },
        { value: 'Limited Period', label: 'Limited Period' },
      ];
    }
  };

  return (
    <div className='qrgenerator-container'>
      <div className="add-asset-function">
        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type || 'info'}`}>
            {toast.message}
          </div>
        )}

        <div className="asset-form">
          <div className="asset-form-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>
              Add New {assetDetails.category || "Asset"} <br />
            </h3>

            {/* Asset ID preview after submit */}
            {assetDetails.assetId && (
              <div className="asset-id-preview" style={{ marginLeft: 'auto', padding: '8px 12px', background: '#eef3f7', borderRadius: 6, fontSize: 14, borderLeft: '3px solid #2a516e' }}>
                <strong>Asset ID:</strong>&nbsp;{assetDetails.assetId}
              </div>
            )}
          </div>

          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Uploaded" />
            </div>
          )}

          <div className="form-grid">
            {/* Property Number (User-inputted) */}
            <div className="form-field">
              <label htmlFor="propertyNo">Property No.</label>
              <input
                  type="text"
                  id="propertyNo"
                  name="propertyNo"
                  value={assetDetails.propertyNo}
                  placeholder={prefix + "your entry here"}
                  onChange={(e) => {
                    let value = e.target.value;

                    // Always force prefix at the beginning
                    if (!value.startsWith(prefix)) {
                      value = prefix + value.replace(prefix, "");
                    }

                    // Update the state
                    setAssetDetails(prev => ({ ...prev, propertyNo: value }));
                  }}
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
                disabled={loadingCategories}
              >
                <option value="">-- Select Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>

            </div>

            {/* Conditional Type Field - Shows if category has types */}
            {hasTypes && (
              <div className="form-field">
                <label htmlFor="subType">
                  Type <span className="required">*</span>
                </label>
                <select
                  id="subType"
                  name="subType"
                  value={assetDetails.subType}
                  onChange={handleInputChange}
                >
                  <option value="">-- Select Type --</option>
                  {selectedCategoryObj?.types?.map((type) => (
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
                disabled={loadingStatuses}
              >
                <option value="" disabled>
                  -- Select Status --
                </option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
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

            {/* Operational Period / License Duration */}
            <div className="form-field">
              <label htmlFor="licenseType">
                Operational Period <span className="required">*</span>
              </label>
              <select
                id="licenseType"
                name="licenseType"
                value={assetDetails.licenseType || ""}
                onChange={handleInputChange}
                disabled={!assetDetails.category}
              >
                <option value="" disabled>
                  -- Select Operational Period --
                </option>
                {getOperationalPeriodOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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

            {/* Remarks (Optional) - full width */}
            <div className="form-field form-field-full">
              <label htmlFor="remarks">Remarks (Optional)</label>
              <textarea
                id="remarks"
                name="remarks"
                placeholder="Additional details or notes"
                rows={3}
                onChange={handleInputChange}
                value={assetDetails.remarks || ""}
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
            <div className="confirm-modal">
              <h3>Confirm Add Asset?</h3>

              <div className="confirm-preview">
                {imagePreview && (
                  <div className="confirm-image">
                    <img src={imagePreview} alt="Asset preview" />
                  </div>
                )}

                <table className="confirm-table">
                  <tbody>
                    <tr><th>Property No.</th><td>{assetDetails.propertyNo || '—'}</td></tr>
                    <tr><th>Asset Name</th><td>{assetDetails.assetName || '—'}</td></tr>
                    <tr><th>Category</th><td>{assetDetails.category || '—'}</td></tr>
                    {hasTypes && assetDetails.subType && (
                      <tr><th>Type</th><td>{assetDetails.subType}</td></tr>
                    )}
                    <tr><th>Status</th><td>{assetDetails.status || '—'}</td></tr>
                    <tr>
                      <th>Personnel</th>
                      <td>{itUsers.find(u => u.id === assetDetails.personnel)?.fullName || '—'}</td>
                    </tr>
                    <tr><th>Purchase Date</th><td>{assetDetails.purchaseDate || '—'}</td></tr>
                    <tr><th>Serial No.</th><td>{assetDetails.serialNo || '—'}</td></tr>
                    <tr><th>Operational Period</th><td>{assetDetails.licenseType === 'Perpetual' ? 'Permanent' : assetDetails.licenseType || '—'}</td></tr>
                    <tr>
                      <th>Expiration Date</th>
                      <td>
                        {NON_EXPIRING.has(assetDetails.licenseType)
                          ? 'Not applicable'
                          : (assetDetails.expirationDate || '—')}
                      </td>
                    </tr>
                    <tr><th>Remarks</th><td>{assetDetails.remarks || '—'}</td></tr>
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

        {/* ✅ Use QRModal component just like in AssetManagement */}
        <QRModal 
          isOpen={showModal} 
          onClose={() => {
            setShowModal(false);
            if (pendingReset) {
              resetForm();
              setPendingReset(false);
            }
          }} 
          asset={qrAsset} 
        />
      </div>
     </div>
  );
};

export default QRCodeGenerator;