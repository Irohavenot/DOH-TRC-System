import React, { useEffect, useState } from 'react';
import '../../assets/AssetDetailsModal.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../../assets/assetmanagement.css';

interface HistoryEntry {
  changedAt?: any;
  changedBy?: string;
  from?: string;
  to?: string;
  reason?: string;
  maintainedBy?: string;
}

interface AssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    title: string;
    team: string;
    timeLeft: string;
    serial: string;
    image?: string;
    assetId?: string;
    assetUrl?: string;
    qrcode?: string | null;
    personnel?: string;
    personnelId?: string;       // <-- used for matching UID
    purchaseDate?: string;
    status?: string;
    licenseType?: string;
    subType?: string;
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
    renewdate?: string;
    assetHistory?: HistoryEntry[];
    hasReports?: boolean;
    reportCount?: number;
  } | null;
  onViewQR?: (asset: any) => void;
  onEdit?: () => void;
  onReport?: () => void;
  onViewHistory?: (history: HistoryEntry[], assetName: string, assetId: string) => void;
  currentUserDocId?: string | null;
}

const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({
  isOpen,
  onClose,
  asset,
  onViewQR,
  onEdit,
  onReport,
  onViewHistory,
  currentUserDocId,   // <-- YOU FORGOT TO DESTRUCTURE THIS EARLIER
}) => {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 🔥 FIXED: now this will evaluate correctly
  const isAssignedPersonnel = !!(
    asset?.personnelId &&
    currentUserDocId &&
    asset.personnelId === currentUserDocId
  );


  useEffect(() => {
    setImageError(false);
  }, [asset]);

  if (!isOpen || !asset) return null;

  const shouldShowSubType = (category?: string) => {
    if (!category) return false;
    const cat = category.toLowerCase();
    return cat === 'asset' || cat === 'license';
  };

  const getSubTypeLabel = (category?: string) => {
    if (!category) return 'Type';
    const cat = category.toLowerCase();
    if (cat === 'asset') return 'Asset Type';
    if (cat === 'license') return 'License Type';
    return 'Type';
  };

  const handleViewQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewQR && asset.qrcode) {
      onViewQR({
        id: asset.id,
        assetId: asset.assetId,
        assetName: asset.title,
        serialNo: asset.serial,
        qrcode: asset.qrcode,
        assetUrl: asset.assetUrl,
      });
    }
  };

  const handleViewHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewHistory && asset.assetHistory) {
      onViewHistory(asset.assetHistory, asset.title, asset.id);
    }
  };

  const handleClose = () => {
    setShowMoreDetails(false);
    onClose();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="viewmore-backdrop" onClick={handleClose}>
      <div className="viewmore-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewmore-header">
          <h2>Asset Details</h2>
          {asset.qrcode && onViewQR && (
            <button className="viewmore-qr-fab" onClick={handleViewQR} title="View QR">
              <i className="fas fa-qrcode" /> <span>View QR</span>
            </button>
          )}
        </div>

        <div className="viewmore-image-container">
          <div className="viewmore-image">
            {!imageError && asset.image ? (
              <img
                src={asset.image}
                alt={asset.title}
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className="viewmore-image-placeholder">
                <i className="fas fa-image"></i>
                <span>No Image Available</span>
              </div>
            )}
          </div>
        </div>

        <div className="viewmore-details">
          <h2>Asset Information</h2>
          <table className="viewmore-table">
            <tbody>
              <tr>
                <td><strong>Asset Name:</strong></td>
                <td>{asset.title}</td>
              </tr>
              <tr>
                <td><strong>Category:</strong></td>
                <td>{asset.team}</td>
              </tr>
              
              {shouldShowSubType(asset.team) && asset.subType && (
                <tr>
                  <td><strong>{getSubTypeLabel(asset.team)}:</strong></td>
                  <td>{asset.subType}</td>
                </tr>
              )}
              
              <tr>
                <td><strong>Serial Number:</strong></td>
                <td>{asset.serial}</td>
              </tr>
              <tr>
                <td><strong>License Status:</strong></td>
                <td>{asset.timeLeft}</td>
              </tr>
              
              {asset.licenseType && (
                <tr>
                  <td><strong>Operational Period:</strong></td>
                  <td>{asset.licenseType}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={`viewmore-extra-details-wrapper ${showMoreDetails ? 'visible' : 'hidden'}`}>
            <div className="viewmore-extra-details-divider" />
            <table className="viewmore-table viewmore-extra-details">
              <tbody>
                {asset.personnel && (
                  <tr>
                    <td><strong>Assigned To:</strong></td>
                    <td>{asset.personnel}</td>
                  </tr>
                )}
                {asset.purchaseDate && (
                  <tr>
                    <td><strong>Purchase Date:</strong></td>
                    <td>{asset.purchaseDate}</td>
                  </tr>
                )}
                {asset.status && (
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td>{asset.status}</td>
                  </tr>
                )}
                {asset.renewdate && (
                  <tr>
                    <td><strong>Renewal Date:</strong></td>
                    <td>{asset.renewdate}</td>
                  </tr>
                )}
                {asset.createdAt && (
                  <tr>
                    <td><strong>Created At:</strong></td>
                    <td>{asset.createdAt}</td>
                  </tr>
                )}
                {asset.createdBy && (
                  <tr>
                    <td><strong>Created By:</strong></td>
                    <td>{asset.createdBy}</td>
                  </tr>
                )}
                {asset.updatedAt && (
                  <tr>
                    <td><strong>Updated At:</strong></td>
                    <td>{asset.updatedAt}</td>
                  </tr>
                )}
                {asset.updatedBy && (
                  <tr>
                    <td><strong>Updated By:</strong></td>
                    <td>{asset.updatedBy}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {asset.assetHistory && asset.assetHistory.length > 0 && onViewHistory && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button className="viewmore-show-btn" onClick={handleViewHistory}>
                  <i className="fas fa-history" /> View Full History ({asset.assetHistory.length})
                </button>
              </div>
            )}
          </div>

          <div className="viewmore-show-section">
            <button className="viewmore-show-btn" onClick={() => setShowMoreDetails(prev => !prev)}>
              {showMoreDetails ? (
                <>
                  <i className="fas fa-chevron-up" /> Show Less Details
                </>
              ) : (
                <>
                  <i className="fas fa-chevron-down" /> Show More Details
                </>
              )}
            </button>
          </div>

            <div className="viewmore-buttons-container">
            <button className="viewmore-close-btn" onClick={handleClose}>
              Close
            </button>

            {/* show Edit ONLY when current user matches the IT_Supply_Users doc id assigned to the asset */}
            {isAssignedPersonnel && onEdit && (
              <button className="viewmore-action-button" onClick={onEdit}>
                Edit
              </button>
            )}

            {/* show Report ONLY when the current user is NOT the assigned personnel */}
            {!isAssignedPersonnel && onReport && (
              <button className="viewmore-action-button viewmore-report-btn" onClick={onReport}>
                <i className="fas fa-exclamation-triangle" /> Report Issue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailsModal;