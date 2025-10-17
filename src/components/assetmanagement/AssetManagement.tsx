// Enhanced AssetManagement.tsx with improved UI and multi-select filters
// Replace your existing component with this enhanced version

import React, { useEffect, useMemo, useState } from 'react';
import "../../assets/assetmanagement.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { db, auth } from '../../firebase/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc
} from 'firebase/firestore';
import QRModal from './QRModal';
import { toast } from 'react-toastify';
import HistoryModal from './HistoryModal';
import EditAssetModal from './EditAssetModal';
import ReportAssetModal from './ReportAssetModal';

const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);

type FilterKey = 'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired';

interface HistoryEntry {
  changedAt?: any;
  changedBy?: string;
  from?: string;
  to?: string;
  reason?: string;
  maintainedBy?: string;
}

interface Card {
  id: string;
  title: string;
  team: string;
  timeLeft: string;
  serial: string;
  iconClass: 'icon-blue' | 'icon-green' | 'icon-orange' | 'icon-red';
  image?: string;
  assetId?: string;
  assetUrl?: string;
  qrcode?: string | null;
  generateQR?: boolean;
  personnel?: string;
  personnelId?: string;
  purchaseDate?: string;
  status?: string;
  licenseType?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  renewdate?: string;
  assetHistory?: HistoryEntry[];
  hasReports?: boolean;
  reportCount?: number;
}

const AssetManagement: React.FC = () => {
  // Status filter (single selection)
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  
  // Multi-select filters
  const [showMyAssets, setShowMyAssets] = useState(false);
  const [showReported, setShowReported] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showQR, setShowQR] = useState(false);
  const [qrAsset, setQrAsset] = useState<any>(null);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  const [emailToNameMap, setEmailToNameMap] = useState<Record<string, string>>({});
  const [uidToNameMap, setUidToNameMap] = useState<Record<string, string>>({});
  const [itUsers, setItUsers] = useState<Array<{ id: string; fullName: string; position?: string }>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [rawAssets, setRawAssets] = useState<any[]>([]);
  const [reportedAssets, setReportedAssets] = useState<Set<string>>(new Set());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<{ id: string; name: string; history: HistoryEntry[] } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingAsset, setReportingAsset] = useState<{ id: string; docId: string; name: string } | null>(null);

  // Fetch reported assets
  useEffect(() => {
    const reportsRef = collection(db, "Asset_Reports");
    const unsub = onSnapshot(
      reportsRef,
      (snap) => {
        const reported = new Set<string>();
        const reportCounts: Record<string, number> = {};
        
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const assetDocId = data.assetDocId || data.assetId;
          if (assetDocId) {
            reported.add(assetDocId);
            reportCounts[assetDocId] = (reportCounts[assetDocId] || 0) + 1;
          }
        });
        
        setReportedAssets(reported);
        
        // Update rawAssets with report counts
        setRawAssets(prev => prev.map(asset => ({
          ...asset,
          hasReports: reported.has(asset.id),
          reportCount: reportCounts[asset.id] || 0
        })));
      },
      (err) => console.error("Error fetching reports:", err)
    );
    return () => unsub();
  }, []);

  // Fetch assets
  useEffect(() => {
    setLoading(true);
    const qRef = query(collection(db, "IT_Assets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const assets = snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data(),
          hasReports: reportedAssets.has(d.id)
        }));
        setRawAssets(assets);
        setLoading(false);
      },
      (err) => { console.error("Error fetching IT_Assets:", err); setLoading(false); }
    );
    return () => unsub();
  }, [reportedAssets]);

  // Fetch users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "IT_Supply_Users"),
      (snap) => {
        const emap: Record<string, string> = {};
        const umap: Record<string, string> = {};
        const list: Array<{ id: string; fullName: string; position?: string }> = [];
        snap.docs.forEach((d) => {
          const data: any = d.data();
          const uid = d.id;
          const first = data.FirstName || data.firstName || '';
          const middle = data.MiddleInitial || data.middleName || '';
          const last = data.LastName || data.lastName || '';
          let middleInitial = '';
          if (middle) {
            if (middle.length > 1 && !middle.endsWith('.')) middleInitial = middle.charAt(0).toUpperCase() + '.';
            else { middleInitial = middle.trim(); if (middleInitial.length === 1) middleInitial += '.'; }
          }
          const fullName = [first, middleInitial, last].filter(Boolean).join(' ') || 'Unknown User';
          umap[uid] = fullName;
          const position = data.Position || data.PositionTitle || data.Role || data.Position_Name || data.Department || '';
          list.push({ id: uid, fullName, position: position || undefined });
          const e1 = data.Email?.trim().toLowerCase();
          const e2 = data.email?.trim().toLowerCase();
          if (e1) emap[e1] = fullName;
          if (e2 && e2 !== e1) emap[e2] = fullName;
        });
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setItUsers(list);
        setEmailToNameMap(emap);
        setUidToNameMap(umap);
      },
      (err) => console.error("Failed to fetch IT_Supply_Users:", err)
    );
    return () => unsub();
  }, []);

  // Fetch categories
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "Asset_Categories"));
        const list: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          if (data.Category_Name) list.push(data.Category_Name);
        });
        list.sort();
        setCategories(list);
      } catch (e) {
        console.error("Error fetching categories:", e);
      }
    })();
  }, []);

  const computeBadge = (licenseType?: string, expirationDate?: string) => {
    if (licenseType && NON_EXPIRING.has(licenseType)) return { iconClass: 'icon-blue' as const, timeLeft: 'No Expiration' };
    if (!expirationDate) return { iconClass: 'icon-orange' as const, timeLeft: 'No Expiration Date' };
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const exp = new Date(expirationDate).getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((exp - startOfToday) / MS_PER_DAY);
    if (daysLeft < 0) return { iconClass: 'icon-red' as const, timeLeft: `Expired ${Math.abs(daysLeft)} day(s) ago` };
    if (daysLeft === 0) return { iconClass: 'icon-orange' as const, timeLeft: 'Expires today' };
    if (daysLeft <= 30) return { iconClass: 'icon-orange' as const, timeLeft: `${daysLeft} day(s) left` };
    if (daysLeft <= 90) return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 7)} week(s) left` };
    return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 30)} month(s) left` };
  };

  const cards = useMemo(() => rawAssets.map((d: any) => {
    const personnelName = d.personnel ? uidToNameMap[d.personnel] || d.personnel : undefined;
    const resolveByEmail = (email?: string) => { if (!email) return undefined; return emailToNameMap[email.trim().toLowerCase()] || email; };
    const createdByName = resolveByEmail(d.createdBy);
    const updatedByName = resolveByEmail(d.updatedBy);
    const { iconClass, timeLeft } = computeBadge(d.licenseType, d.expirationDate);
    return {
      id: d.id,
      title: d.assetName || '(No name)',
      team: d.category || 'Uncategorized',
      timeLeft,
      serial: d.serialNo || 'N/A',
      iconClass,
      image: d.image || undefined,
      assetId: d.assetId,
      assetUrl: d.assetUrl,
      qrcode: d.qrcode ?? null,
      generateQR: !!d.generateQR,
      personnel: personnelName,
      personnelId: d.personnel,
      purchaseDate: d.purchaseDate || undefined,
      status: d.status || undefined,
      licenseType: d.licenseType || undefined,
      createdAt: d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleString() : (d.createdAt || undefined),
      createdBy: createdByName,
      updatedAt: d.updatedAt?.toDate ? new Date(d.updatedAt.toDate()).toLocaleString() : (d.updatedAt || undefined),
      updatedBy: updatedByName,
      renewdate: d.renewdate?.toDate ? new Date(d.renewdate.toDate()).toLocaleDateString() : (d.renewdate || undefined),
      assetHistory: d.assetHistory || [],
      hasReports: d.hasReports || false,
      reportCount: d.reportCount || 0,
    } as Card;
  }), [rawAssets, uidToNameMap, emailToNameMap]);

  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Apply status filter (single selection)
    if (statusFilter !== 'all') {
      result = result.filter((card) => {
        switch (statusFilter) {
          case 'permanent': return card.iconClass === 'icon-blue';
          case 'normal': return card.iconClass === 'icon-green';
          case 'aboutToExpire': return card.iconClass === 'icon-orange';
          case 'expired': return card.iconClass === 'icon-red';
          default: return true;
        }
      });
    }

    // Apply "My Assets" filter (multi-select)
    if (showMyAssets) {
      const currentUserId = auth.currentUser?.uid;
      result = result.filter(card => card.personnelId === currentUserId);
    }

    // Apply "Reported" filter (multi-select)
    if (showReported) {
      result = result.filter(card => card.hasReports);
    }

    return result;
  }, [cards, statusFilter, showMyAssets, showReported]);

  const counts = useMemo(() => {
    let permanent = 0, normal = 0, aboutToExpire = 0, expired = 0, myAssets = 0, reported = 0;
    const currentUserId = auth.currentUser?.uid;
    
    for (const c of cards) {
      if (c.iconClass === 'icon-blue') permanent++;
      else if (c.iconClass === 'icon-green') normal++;
      else if (c.iconClass === 'icon-orange') aboutToExpire++;
      else if (c.iconClass === 'icon-red') expired++;
      
      if (c.personnelId === currentUserId) myAssets++;
      if (c.hasReports) reported++;
    }
    return { permanent, normal, aboutToExpire, expired, myAssets, reported };
  }, [cards]);

  const handleCardOptionsToggle = (index: number) => setOpenCardOptionsId(prev => (prev === index ? null : index));

  const handleEditCard = (index: number) => {
    const card = filteredCards[index];
    if (!card) return;
    
    const rawAsset = rawAssets.find(a => a.id === card.id);
    if (!rawAsset) return;

    setEditingAsset({
      docId: rawAsset.id,
      assetId: rawAsset.assetId,
      assetName: rawAsset.assetName,
      assetUrl: rawAsset.assetUrl,
      category: rawAsset.category,
      licenseType: rawAsset.licenseType,
      personnel: rawAsset.personnel,
      purchaseDate: rawAsset.purchaseDate,
      renewdate: rawAsset.renewdate,
      serialNo: rawAsset.serialNo,
      status: rawAsset.status,
      qrcode: rawAsset.qrcode,
      generateQR: rawAsset.generateQR,
      image: rawAsset.image,
      createdBy: rawAsset.createdBy,
      createdAt: rawAsset.createdAt,
      updatedBy: rawAsset.updatedBy,
      updatedAt: rawAsset.updatedAt,
      assetHistory: rawAsset.assetHistory,
    });
    
    setEditModalOpen(true);
    setOpenCardOptionsId(null);
  };

  const getCurrentUserFullName = (): string => {
    const uid = auth.currentUser?.uid;
    if (uid && uidToNameMap[uid]) {
      return uidToNameMap[uid];
    }
    return auth.currentUser?.email || 'Unknown User';
  };

  const handleDeleteCard = async (index: number) => {
    const card = filteredCards[index];
    if (!card) return;

    const warningMessage = 
      `⚠️ WARNING: You will be held accountable for the deletion of this asset.\n\n` +
      `Asset: "${card.title}" (Serial: ${card.serial})\n` +
      `Category: ${card.team}\n\n` +
      `Are you absolutely sure you want to delete this asset? This action cannot be undone.`;

    if (!window.confirm(warningMessage)) return;

    try {
      const assetRef = doc(db, "IT_Assets", card.id);
      
      const deletedBy = getCurrentUserFullName();
      const deletedByEmail = auth.currentUser?.email || '';
      const deletedAt = new Date().toISOString();

      const auditRecord = {
        ...card,
        deletedAt,
        deletedBy,
        deletedByEmail,
        deletionReason: 'User-initiated deletion',
        originalId: card.id,
      };

      await addDoc(collection(db, "Deleted_Assets"), auditRecord);
      await deleteDoc(assetRef);
      
      toast.success('Asset deleted and archived successfully');
      setOpenCardOptionsId(null);
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete asset. Please try again.');
    }
  };

  const openQR = (card: Card) => {
    if (!card.qrcode) return;
    setQrAsset({
      id: card.id,
      assetId: card.assetId,
      assetName: card.title,
      serialNo: card.serial,
      qrcode: card.qrcode,
      assetUrl: card.assetUrl,
    });
    setShowQR(true);
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setShowMyAssets(false);
    setShowReported(false);
  };

  const hasActiveFilters = statusFilter !== 'all' || showMyAssets || showReported;

  return (
    <div className="content-here">
      {/* View More Modal */}
      {selectedCard && (
        <div className="modal-backdrop" onClick={() => { setSelectedCard(null); setShowMoreDetails(false); }}>
          <div className="modal view-more-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Asset Details</h2>
              {selectedCard.qrcode && (
                <button className="view-qr-fab" onClick={(e) => { e.stopPropagation(); openQR(selectedCard); }} title="View QR">
                  <i className="fas fa-qrcode" /> <span>View QR</span>
                </button>
              )}
            </div>

            <div className="modal-image">
              {selectedCard.image ? (<img src={selectedCard.image} alt="Asset" />) : (<img src="printer.jpg" alt="Asset" />)}
            </div>

            <div className="modal-details">
              <h2>Asset Details</h2>
              <table className="modal-table">
                <tbody>
                  <tr><td><strong>Asset Name:</strong></td><td>{selectedCard.title}</td></tr>
                  <tr><td><strong>Category:</strong></td><td>{selectedCard.team}</td></tr>
                  <tr><td><strong>Serial Number:</strong></td><td>{selectedCard.serial}</td></tr>
                  <tr><td><strong>License Status:</strong></td><td>{selectedCard.timeLeft}</td></tr>
                  {selectedCard.licenseType && (<tr><td><strong>License Type:</strong></td><td>{selectedCard.licenseType}</td></tr>)}
                </tbody>
              </table>

              <div className={`extra-details-wrapper ${showMoreDetails ? 'visible' : 'hidden'}`}>
                <div className="extra-details-divider" />
                <table className="modal-table extra-details">
                  <tbody>
                    {selectedCard.personnel && (<tr><td><strong>Assigned To:</strong></td><td>{selectedCard.personnel}</td></tr>)}
                    {selectedCard.purchaseDate && (<tr><td><strong>Purchase Date:</strong></td><td>{selectedCard.purchaseDate}</td></tr>)}
                    {selectedCard.status && (<tr><td><strong>Status:</strong></td><td>{selectedCard.status}</td></tr>)}
                    {selectedCard.renewdate && (<tr><td><strong>Renewal Date:</strong></td><td>{selectedCard.renewdate}</td></tr>)}
                    {selectedCard.createdAt && (<tr><td><strong>Created At:</strong></td><td>{selectedCard.createdAt}</td></tr>)}
                    {selectedCard.createdBy && (<tr><td><strong>Created By:</strong></td><td>{selectedCard.createdBy}</td></tr>)}
                    {selectedCard.updatedAt && (<tr><td><strong>Updated At:</strong></td><td>{selectedCard.updatedAt}</td></tr>)}
                    {selectedCard.updatedBy && (<tr><td><strong>Updated By:</strong></td><td>{selectedCard.updatedBy}</td></tr>)}
                  </tbody>
                </table>

                {selectedCard.assetHistory && selectedCard.assetHistory.length > 0 && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                      className="show-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryAsset({
                          id: selectedCard.id,
                          name: selectedCard.title,
                          history: selectedCard.assetHistory || [],
                        });
                        setShowHistoryModal(true);
                      }}
                    >
                      <i className="fas fa-history" /> View Full History ({selectedCard.assetHistory.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="show-more-section">
                <button className="show-more-btn" onClick={() => setShowMoreDetails(prev => !prev)}>
                  {showMoreDetails ? (<><i className="fas fa-chevron-up" /> Show Less Details</>) : (<><i className="fas fa-chevron-down" /> Show More Details</>)}
                </button>
              </div>

              <div className="buttons-container">
                <button className="close-btn" onClick={() => { setSelectedCard(null); setShowMoreDetails(false); }}>Close</button>
                <button 
                  className="edits-button" 
                  onClick={() => {
                    const idx = filteredCards.findIndex(c => c.id === selectedCard.id);
                    if (idx >= 0) handleEditCard(idx);
                  }}
                >
                  Edit
                </button>
                <button 
                  className="edits-button report-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedCard) {
                      setReportingAsset({
                        id: selectedCard.assetId || selectedCard.id,
                        docId: selectedCard.id,
                        name: selectedCard.title,
                      });
                      setReportModalOpen(true);
                    }
                  }}
                >
                  <i className="fas fa-exclamation-triangle" /> Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EditAssetModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingAsset(null);
        }}
        asset={editingAsset}
        onSaved={() => {
          setEditModalOpen(false);
          setEditingAsset(null);
        }}
        onDeleted={() => {
          setEditModalOpen(false);
          setEditingAsset(null);
          setSelectedCard(null);
        }}
      />

      <ReportAssetModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportingAsset(null);
        }}
        assetId={reportingAsset?.id || ''}
        assetDocId={reportingAsset?.docId || ''}
        assetName={reportingAsset?.name || ''}
      />

      <h1>Asset Management</h1>

      {/* Enhanced Filter Section */}
      <div className="filter-section">
        {/* Multi-Select Filters */}
        <div className="quick-filters">
          <div className="filter-section-label">
            <i className="fas fa-filter" />
            <span>Quick Filters</span>
          </div>
          <div className="filter-tabs">
            <button 
              className={`multi-select ${showMyAssets ? 'active' : ''}`}
              onClick={() => setShowMyAssets(!showMyAssets)}
            >
              <i className="fas fa-user" />
              My Assets
              <span>{counts.myAssets}</span>
            </button>

            <button 
              className={`multi-select reported ${showReported ? 'active' : ''}`}
              onClick={() => setShowReported(!showReported)}
            >
              <i className="fas fa-exclamation-triangle" />
              Reported Issues
              <span>{counts.reported}</span>
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div>
          <div className="filter-section-label">
            <i className="fas fa-clock" />
            <span>Status</span>
          </div>
          <div className="filter-tabs">
            <button 
              className={`status-filter status-all ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Assets
              <span>{cards.length}</span>
            </button>
            <button 
              className={`status-filter status-permanent ${statusFilter === 'permanent' ? 'active' : ''}`}
              onClick={() => setStatusFilter('permanent')}
            >
              Permanent
              <span>{counts.permanent}</span>
            </button>
            <button 
              className={`status-filter status-normal ${statusFilter === 'normal' ? 'active' : ''}`}
              onClick={() => setStatusFilter('normal')}
            >
              Normal
              <span>{counts.normal}</span>
            </button>
            <button 
              className={`status-filter status-expire ${statusFilter === 'aboutToExpire' ? 'active' : ''}`}
              onClick={() => setStatusFilter('aboutToExpire')}
            >
              Expiring Soon
              <span>{counts.aboutToExpire}</span>
            </button>
            <button 
              className={`status-filter status-expired ${statusFilter === 'expired' ? 'active' : ''}`}
              onClick={() => setStatusFilter('expired')}
            >
              Expired
              <span>{counts.expired}</span>
            </button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="active-filters-summary">
            <i className="fas fa-info-circle" />
            <span>
              Showing <strong>{filteredCards.length}</strong> of <strong>{cards.length}</strong> assets
            </span>
            <button className="clear-filters-btn" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox" />
          <p>No assets found</p>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredCards.map((card, index) => (
            <div className="card" key={card.id}>
              {/* Card Badges */}
              <div className="card-badges">
                {card.personnelId === auth.currentUser?.uid && (
                  <span className="card-badge my-asset">Mine</span>
                )}
                {card.hasReports && (
                  <span className="card-badge reported">
                    <i className="fas fa-exclamation-circle" />
                    {card.reportCount}
                  </span>
                )}
              </div>

              <div className="card-top">
                <div className="card-top-left">
                  <div className={`card-icon ${card.iconClass}`}>
                    <i className={`fas ${card.team.toLowerCase().includes('hardware') ? 'fa-laptop' : 'fa-code'}`} />
                  </div>
                  <button className="view-more-btn" onClick={() => setSelectedCard(card)}>View More</button>
                </div>
                <div className="card-options">
                  <button className="options-btn" onClick={() => handleCardOptionsToggle(index)}>⋮</button>
                  {openCardOptionsId === index && (
                    <div className="card-options-menu">
                      <button className="edit-btn" onClick={() => handleEditCard(index)}><i className="fas fa-edit"></i> Edit Asset</button>
                      <button className="delete-btn" onClick={() => handleDeleteCard(index)}><i className="fas fa-trash-alt"></i> Delete Asset</button>
                    </div>
                  )}
                </div>
              </div>
              
              <h2>{card.title}</h2>
              
              <div className="card-meta">
                <div className="card-meta-item">
                  <i className="fas fa-layer-group" />
                  {card.team}
                </div>
                <div className="card-meta-item">
                  <i className="fas fa-barcode" />
                  {card.serial}
                </div>
                {card.personnel && (
                  <div className="card-meta-item">
                    <i className="fas fa-user" />
                    {card.personnel}
                  </div>
                )}
              </div>
              
              <div className="card-time-badge">
                {card.timeLeft}
              </div>
            </div>
          ))}
        </div>
      )}

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={historyAsset?.history || []}
        assetName={historyAsset?.name || 'Asset'}
      />

      <QRModal isOpen={showQR} onClose={() => setShowQR(false)} asset={qrAsset} />
    </div>
  );
};

export default AssetManagement;