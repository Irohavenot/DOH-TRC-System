// /mnt/data/qrcodegenerator.tsx
import { useEffect, useRef, useState } from 'react';
import QrCreator from 'qr-creator';
import "../../assets/qrcodegenerator.css";
import { useLocation } from "react-router-dom";
import { db, auth } from '../../firebase/firebase';
import { addDoc, collection, getDocs, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import QRModal from './QRModal';

const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);

function getPublicBase(): string {
  const envBase = import.meta.env.VITE_PUBLIC_BASE_URL?.toString().trim();
  if (envBase) {
    try {
      const u = new URL(envBase);
      return (u.origin + u.pathname).replace(/\/+$/, '');
    } catch {
      return envBase.replace(/\/+$/, '');
    }
  }
  return window.location.origin;
}

function buildAssetUrl(assetId: string): string {
  const base = getPublicBase();
  const useHash = import.meta.env.VITE_QR_HASH_MODE === 'true';
  const path = `/dashboard/${encodeURIComponent(assetId)}`;
  return useHash ? `${base}/#${path}` : `${base}${path}`;
}

const QRCodeGenerator = () => {
  const location = useLocation();
  const categoryFromState = location.state?.category || "";

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [qrAsset, setQrAsset] = useState<any>(null);
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
    propertyNo: '',
    assetName: '',
    category: categoryFromState,
    subType: '',
    status: '',
    personnel: '',
    purchaseDate: '',
    serialNo: '',
    licenseType: '',
    expirationDate: '',
    generateQR: true,
    remarks: '',
  });

  const resetForm = () => {
    setAssetDetails(prev => ({
      assetId: '',
      propertyNo: '',
      assetName: '',
      category: prev.category,
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
  const isLicenseCategory = assetDetails.category === 'License';

  useEffect(() => {
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

  useEffect(() => {
    if (NON_EXPIRING.has(assetDetails.licenseType) && assetDetails.expirationDate) {
      setAssetDetails((prev) => ({ ...prev, expirationDate: '' }));
    }
  }, [assetDetails.licenseType]);

  const validate = (): boolean => {
    if (!assetDetails.assetName.trim()) {
      showToast('Asset Name is required.', 'error'); return false;
    }
    if (!assetDetails.category) {
      showToast('Please select a Category.', 'error'); return false;
    }
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
      const fieldName = isLicenseCategory ? 'Expiration Date' : 'End of Service';
      showToast(`${fieldName} is required for Limited Period.`, 'error'); 
      return false;
    }
    return true;
  };

  const openConfirm = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };
  const closeConfirm = () => setShowConfirm(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as any;

    if (name === 'category') {
      setAssetDetails((prev) => ({
        ...prev,
        category: value,
        subType: '',
        licenseType: '',
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

  const handleAddAsset = async (skipValidation = false) => {
    if (isSubmitting) return;
    try {
      if (!skipValidation && !validate()) return;

      setIsSubmitting(true);

      const assetId = generateAssetId();
      const assetUrl = buildAssetUrl(assetId);

      let qrcode = "";
      if (assetDetails.generateQR) {
        qrcode = await makeQRDataUrl(assetUrl);
        
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

      const renewdate =
        assetDetails.expirationDate ? new Date(assetDetails.expirationDate) : null;

      const assignedPersonnel = itUsers.find(u => u.id === assetDetails.personnel);

      const payload = {
        assetId,
        propertyNo: assetDetails.propertyNo || "",
        assetName: assetDetails.assetName || "",
        assetUrl,
        category: assetDetails.category || "",
        subType: assetDetails.subType || "",
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || "",
        personnelNameSnapshot: assignedPersonnel?.fullName || "",
        expirationDate: assetDetails.expirationDate || "",
        generateQR: !!assetDetails.generateQR,
        image: imagePreview || "",
        licenseType: assetDetails.licenseType || "",
        personnel: assetDetails.personnel || "",
        purchaseDate: assetDetails.purchaseDate || "",
        qrcode,
        renewdate,
        serialNo: assetDetails.serialNo || "",
        status: assetDetails.status || "",
        remarks: assetDetails.remarks || "",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "",
      };

      await addDoc(collection(db, "IT_Assets"), payload);
      showToast('Asset added successfully.', 'success');

      setAssetDetails((prev) => ({ ...prev, assetId }));

      if (assetDetails.generateQR) {
        setPendingReset(true);
      } else {
        resetForm();
      }
    } catch (err: any) {
      console.error("Error adding asset:", err.message);
      showToast(`Error adding asset: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpirationDisabled = NON_EXPIRING.has(assetDetails.licenseType);

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
    <div className='qrgen-container'>
      <div className="qrgen-wrapper">
        {toast && (
          <div className={`qrgen-toast ${toast.type || 'info'}`}>
            {toast.message}
          </div>
        )}

        <div className="qrgen-form">
          <div className="qrgen-header">
            <div className="qrgen-title-section">
              <h2 className="qrgen-title">Add New {assetDetails.category || "Asset"}</h2>
              <p className="qrgen-subtitle">Fill in the details to register a new asset</p>
            </div>

            {assetDetails.assetId && (
              <div className="qrgen-asset-id-badge">
                <span className="qrgen-badge-label">Asset ID</span>
                <span className="qrgen-badge-value">{assetDetails.assetId}</span>
              </div>
            )}
          </div>

          {imagePreview && (
            <div className="qrgen-image-preview">
              <img src={imagePreview} alt="Uploaded" />
            </div>
          )}

          <div className="qrgen-form-grid">
            <div className="qrgen-form-field">
              <label htmlFor="propertyNo" className="qrgen-label">Property No.</label>
              <input
                type="text"
                id="propertyNo"
                name="propertyNo"
                className="qrgen-input"
                value={assetDetails.propertyNo}
                placeholder={prefix + "your entry here"}
                onChange={(e) => {
                  let value = e.target.value;
                  if (!value.startsWith(prefix)) {
                    value = prefix + value.replace(prefix, "");
                  }
                  setAssetDetails(prev => ({ ...prev, propertyNo: value }));
                }}
              />
            </div>

            <div className="qrgen-form-field">
              <label htmlFor="assetName" className="qrgen-label">
                Asset Name <span className="qrgen-required">*</span>
              </label>
              <input
                type="text"
                id="assetName"
                name="assetName"
                className="qrgen-input"
                placeholder="Enter asset name"
                onChange={handleInputChange}
                value={assetDetails.assetName}
              />
            </div>

            <div className="qrgen-form-field">
              <label htmlFor="category" className="qrgen-label">
                Category <span className="qrgen-required">*</span>
              </label>
              <select
                id="category"
                name="category"
                className="qrgen-select"
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

            {hasTypes && (
              <div className="qrgen-form-field">
                <label htmlFor="subType" className="qrgen-label">
                  Type <span className="qrgen-required">*</span>
                </label>
                <select
                  id="subType"
                  name="subType"
                  className="qrgen-select"
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

            <div className="qrgen-form-field">
              <label htmlFor="status" className="qrgen-label">
                Status <span className="qrgen-required">*</span>
              </label>
              <select
                id="status"
                name="status"
                className="qrgen-select"
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

            <div className="qrgen-form-field">
              <label htmlFor="personnel" className="qrgen-label">
                Assigned Personnel <span className="qrgen-required">*</span>
              </label>
              <select
                id="personnel"
                name="personnel"
                className="qrgen-select"
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

            <div className="qrgen-form-field">
              <label htmlFor="purchaseDate" className="qrgen-label">Purchase Date</label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                className="qrgen-input"
                onChange={handleInputChange}
                value={assetDetails.purchaseDate}
              />
            </div>

            <div className="qrgen-form-field">
              <label htmlFor="serialNo" className="qrgen-label">Serial No.</label>
              <input
                type="text"
                id="serialNo"
                name="serialNo"
                className="qrgen-input"
                placeholder="Enter serial number"
                onChange={handleInputChange}
                value={assetDetails.serialNo}
              />
            </div>

            <div className="qrgen-form-field">
              <label htmlFor="licenseType" className="qrgen-label">
                Operational Period <span className="qrgen-required">*</span>
              </label>
              <select
                id="licenseType"
                name="licenseType"
                className="qrgen-select"
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

            <div className="qrgen-form-field">
              <label htmlFor="expirationDate" className="qrgen-label">
                {isLicenseCategory ? 'Expiration Date' : 'End of Service'}
                {!isExpirationDisabled && <span className="qrgen-required">*</span>}
              </label>
              <input
                type="date"
                id="expirationDate"
                name="expirationDate"
                className={`qrgen-input ${isExpirationDisabled ? 'qrgen-disabled' : ''}`}
                onChange={handleInputChange}
                value={assetDetails.expirationDate}
                disabled={isExpirationDisabled}
                placeholder={isExpirationDisabled ? 'Not applicable' : ''}
              />
            </div>

            <div className="qrgen-form-field">
              <label htmlFor="assetImage" className="qrgen-label">Upload Image</label>
              <input
                type="file"
                id="assetImage"
                className="qrgen-file-input"
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

            <div className="qrgen-form-field qrgen-form-field-full">
              <label htmlFor="remarks" className="qrgen-label">Remarks (Optional)</label>
              <textarea
                id="remarks"
                name="remarks"
                className="qrgen-textarea"
                placeholder="Additional details or notes"
                rows={3}
                onChange={handleInputChange}
                value={assetDetails.remarks || ""}
              />
            </div>
          </div>

          <div className="qrgen-action-bar">
            <label htmlFor="generateQR" className="qrgen-checkbox-label">
              <input
                type="checkbox"
                id="generateQR"
                name="generateQR"
                className="qrgen-checkbox"
                checked={assetDetails.generateQR || false}
                onChange={handleInputChange}
              />
              <span className="qrgen-checkbox-text">Generate QR Code</span>
            </label>
            
            <div className="qrgen-button-group">
              <button
                className="qrgen-btn qrgen-btn-primary"
                onClick={openConfirm}
                disabled={isSubmitting}
                aria-label="Add Asset"
              >
                {isSubmitting ? (
                  <>
                    <span className="qrgen-spinner"></span>
                    Adding…
                  </>
                ) : (
                  'Add Asset'
                )}
              </button>

              <button
                type="button"
                className="qrgen-btn qrgen-btn-secondary"
                onClick={resetForm}
                disabled={isSubmitting}
                aria-label="Clear fields"
                title="Clear all fields"
              >
                Clear Fields
              </button>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="qrgen-modal-overlay">
            <div className="qrgen-confirm-modal">
              <div className="qrgen-confirm-header">
                <h3 className="qrgen-confirm-title">Confirm Add Asset</h3>
                <p className="qrgen-confirm-subtitle">Please review the details before adding</p>
              </div>

              <div className="qrgen-confirm-content">
                {imagePreview && (
                  <div className="qrgen-confirm-image">
                    <img src={imagePreview} alt="Asset preview" />
                  </div>
                )}

                <div className="qrgen-confirm-details">
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Property No.</span>
                    <span className="qrgen-detail-value">{assetDetails.propertyNo || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Asset Name</span>
                    <span className="qrgen-detail-value">{assetDetails.assetName || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Category</span>
                    <span className="qrgen-detail-value">{assetDetails.category || '—'}</span>
                  </div>
                  {hasTypes && assetDetails.subType && (
                    <div className="qrgen-detail-row">
                      <span className="qrgen-detail-label">Type</span>
                      <span className="qrgen-detail-value">{assetDetails.subType}</span>
                    </div>
                  )}
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Status</span>
                    <span className="qrgen-detail-value">{assetDetails.status || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Personnel</span>
                    <span className="qrgen-detail-value">{itUsers.find(u => u.id === assetDetails.personnel)?.fullName || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Purchase Date</span>
                    <span className="qrgen-detail-value">{assetDetails.purchaseDate || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Serial No.</span>
                    <span className="qrgen-detail-value">{assetDetails.serialNo || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Operational Period</span>
                    <span className="qrgen-detail-value">{assetDetails.licenseType === 'Perpetual' ? 'Permanent' : assetDetails.licenseType || '—'}</span>
                  </div>
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">{isLicenseCategory ? 'Expiration Date' : 'End of Service'}</span>
                    <span className="qrgen-detail-value">
                      {NON_EXPIRING.has(assetDetails.licenseType)
                        ? 'Not applicable'
                        : (assetDetails.expirationDate || '—')}
                    </span>
                  </div>
                  {assetDetails.remarks && (
                    <div className="qrgen-detail-row qrgen-detail-row-full">
                      <span className="qrgen-detail-label">Remarks</span>
                      <span className="qrgen-detail-value">{assetDetails.remarks}</span>
                    </div>
                  )}
                  <div className="qrgen-detail-row">
                    <span className="qrgen-detail-label">Generate QR</span>
                    <span className="qrgen-detail-value">
                      <span className={`qrgen-badge ${assetDetails.generateQR ? 'qrgen-badge-success' : 'qrgen-badge-neutral'}`}>
                        {assetDetails.generateQR ? 'Yes' : 'No'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="qrgen-confirm-actions">
                <button
                  className="qrgen-btn qrgen-btn-secondary"
                  onClick={closeConfirm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="qrgen-btn qrgen-btn-primary"
                  onClick={async () => {
                    closeConfirm();
                    await handleAddAsset(true);
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="qrgen-spinner"></span>
                      Adding…
                    </>
                  ) : (
                    'Confirm Add'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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