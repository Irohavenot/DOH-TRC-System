// AssetManagement.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import "../../assets/assetmanagement.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { db, auth } from '../../firebase/firebase';
// Add this import
import { useCurrentUserFullName } from '../../hooks/useCurrentUserFullName';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  arrayUnion,
  addDoc
} from 'firebase/firestore';
import QRModal from './QRModal';
import { toast } from 'react-toastify';
import QrCreator from 'qr-creator';
import HistoryModal from './HistoryModal';

const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);

type FilterKey = 'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired';

interface HistoryEntry {
  changedAt?: any; // firestore.Timestamp
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
  purchaseDate?: string;
  status?: string;
  licenseType?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  renewdate?: string;
  assetHistory?: HistoryEntry[];
}

function getPublicBase(): string {
  const envBase = (import.meta as any).env?.VITE_PUBLIC_BASE_URL?.toString()?.trim();
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
function buildAssetUrl(assetId: string) {
  const base = getPublicBase();
  const useHash = (import.meta as any).env?.VITE_QR_HASH_MODE === 'true';
  const path = `/dashboard/${encodeURIComponent(assetId)}`;
  return useHash ? `${base}/#${path}` : `${base}${path}`;
}

const AssetManagement: React.FC = () => {
  const [filter, setFilter] = useState<FilterKey>('all');
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<{ id: string; name: string; history: HistoryEntry[] } | null>(null);

  useEffect(() => {
    setLoading(true);
    const qRef = query(collection(db, "IT_Assets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const assets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRawAssets(assets);
        setLoading(false);
      },
      (err) => { console.error("Error fetching IT_Assets:", err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // users
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

  // categories
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
      purchaseDate: d.purchaseDate || undefined,
      status: d.status || undefined,
      licenseType: d.licenseType || undefined,
      createdAt: d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleString() : (d.createdAt || undefined),
      createdBy: createdByName,
      updatedAt: d.updatedAt?.toDate ? new Date(d.updatedAt.toDate()).toLocaleString() : (d.updatedAt || undefined),
      updatedBy: updatedByName,
      renewdate: d.renewdate?.toDate ? new Date(d.renewdate.toDate()).toLocaleDateString() : (d.renewdate || undefined),
      assetHistory: d.assetHistory || [],
    } as Card;
  }), [rawAssets, uidToNameMap, emailToNameMap]);

  const filteredCards = useMemo(() => {
    if (filter === 'all') return cards;
    return cards.filter((card) => {
      switch (filter) {
        case 'permanent': return card.iconClass === 'icon-blue';
        case 'normal': return card.iconClass === 'icon-green';
        case 'aboutToExpire': return card.iconClass === 'icon-orange';
        case 'expired': return card.iconClass === 'icon-red';
        default: return true;
      }
    });
  }, [cards, filter]);

  const counts = useMemo(() => {
    let permanent = 0, normal = 0, aboutToExpire = 0, expired = 0;
    for (const c of cards) {
      if (c.iconClass === 'icon-blue') permanent++;
      else if (c.iconClass === 'icon-green') normal++;
      else if (c.iconClass === 'icon-orange') aboutToExpire++;
      else if (c.iconClass === 'icon-red') expired++;
    }
    return { permanent, normal, aboutToExpire, expired };
  }, [cards]);

  // Edit/Delete/QR preview + history
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const qrPreviewRef = useRef<HTMLDivElement | null>(null);

  const handleCardOptionsToggle = (index: number) => setOpenCardOptionsId(prev => (prev === index ? null : index));

  const handleEditCard = (index: number) => {
    const card = filteredCards[index];
    if (!card) return;
    setEditingId(card.id);
    setEditForm({
      assetName: card.title || '',
      serialNo: card.serial || '',
      category: card.team || categories[0] || '',
      licenseType: card.licenseType || '',
      personnel: card.personnel || '',
      purchaseDate: card.purchaseDate || '',
      renewdate: card.renewdate || '',
      status: card.status || '',
      originalStatus: card.status || '',
      assetId: card.assetId || '',
      assetUrl: card.assetUrl || '',
      generateQR: !!card.qrcode || !!card.generateQR || false,
      existingQrcode: card.qrcode ?? null,
      statusReason: '',
      maintainedBy: '',
    });
    setEditModalOpen(true);
    setOpenCardOptionsId(null);
  };
  const getCurrentUserFullName = (): string => {
  const uid = auth.currentUser?.uid;
  if (uid && uidToNameMap[uid]) {
    return uidToNameMap[uid];
  }
  // Fallback to email if name not found
  return auth.currentUser?.email || 'Unknown User';
};
const handleDeleteCard = async (index: number) => {
  const card = filteredCards[index];
  if (!card) return;

  // Show strong warning
  const warningMessage = 
    `⚠️ WARNING: You will be held accountable for the deletion of this asset.\n\n` +
    `Asset: "${card.title}" (Serial: ${card.serial})\n` +
    `Category: ${card.team}\n\n` +
    `Are you absolutely sure you want to delete this asset? This action cannot be undone.`;

  if (!window.confirm(warningMessage)) return;

  try {
    const assetRef = doc(db, "IT_Assets", card.id);
    
    // Get current user info
    const deletedBy = getCurrentUserFullName();
    const deletedByEmail = auth.currentUser?.email || '';
    const deletedAt = new Date().toISOString();

    // Create audit record
    const auditRecord = {
      ...card, // Preserve all original data
      deletedAt,
      deletedBy,
      deletedByEmail,
      deletionReason: 'User-initiated deletion', // You can make this a prompt if needed
      originalId: card.id, // Keep reference to original ID
    };

    // Save to Deleted_Assets collection
    await addDoc(collection(db, "Deleted_Assets"), auditRecord);
    
    // Now delete from active assets
    await deleteDoc(assetRef);
    
    toast.success('Asset deleted and archived successfully');
    setOpenCardOptionsId(null);
  } catch (err) {
    console.error('Delete failed', err);
    toast.error('Failed to delete asset. Please try again.');
  }
};

  const renderQRTo = (value: string, container: HTMLElement | null) => {
    if (!container) return;
    container.innerHTML = '';
    QrCreator.render({
      text: value,
      radius: 0.45,
      ecLevel: 'H',
      fill: '#162a37',
      background: null,
      size: 250,
    }, container as any);
  };

  const makeQRDataUrl = async (value: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        QrCreator.render({
          text: value,
          radius: 0.45,
          ecLevel: 'H',
          fill: '#162a37',
          background: null,
          size: 250,
        }, canvas as any);
        const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    });
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

  const [historyOpenFor, setHistoryOpenFor] = useState<string | null>(null); // id of card whose history panel is open

  // Save edits — includes status change history append
  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);

    try {
      // client-side validation for status changes
      const orig = editForm.originalStatus || '';
      const nowStatus = editForm.status || '';
      if (orig !== nowStatus) {
        if (!editForm.statusReason || String(editForm.statusReason).trim().length === 0) {
          toast.error('Please provide a reason for the status change.');
          setSaving(false);
          return;
        }
        if (orig === 'Under Maintenance' && nowStatus === 'Functional') {
          if (!editForm.maintainedBy || String(editForm.maintainedBy).trim().length === 0) {
            toast.error('Please specify who performed the maintenance (Maintained by).');
            setSaving(false);
            return;
          }
        }
      }

      const assetRef = doc(db, "IT_Assets", editingId);

      // build payload
      const payload: any = {
        assetName: editForm.assetName || '',
        serialNo: editForm.serialNo || '',
        category: editForm.category || '',
        licenseType: editForm.licenseType || '',
        personnel: editForm.personnel || '',
        purchaseDate: editForm.purchaseDate || '',
        renewdate: editForm.renewdate || '',
        status: editForm.status || '',
        assetId: editForm.assetId || '',
        assetUrl: editForm.assetUrl || '',
        generateQR: !!editForm.generateQR,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || '',
      };

      // QR generation (if requested)
      if (editForm.generateQR) {
        const assetIdToUse = editForm.assetId || editingId;
        const assetUrl = editForm.assetUrl || buildAssetUrl(assetIdToUse);
        const qrString = JSON.stringify({ assetId: assetIdToUse, assetUrl });

        const dataUrl = await makeQRDataUrl(qrString);

        // size guard
        const base64Part = dataUrl.split(',')[1] || '';
        const estimatedBytes = Math.ceil(base64Part.length * 3 / 4);
        const WARN_BYTES = 700 * 1024;
        const ABORT_BYTES = 950 * 1024;

        if (estimatedBytes > ABORT_BYTES) {
          toast.error('QR image too large to save safely. Use a simpler payload.');
          setSaving(false);
          return;
        }
        if (estimatedBytes > WARN_BYTES) {
          const ok = window.confirm(`The generated QR is ~${Math.round(estimatedBytes/1024)} KB. Saving may increase doc size. Continue?`);
          if (!ok) { setSaving(false); return; }
        }

        payload.qrcode = dataUrl;
        payload.assetUrl = assetUrl;
      } else {
        payload.qrcode = null;
      }

      // prepare history entry if status changed — use client timestamp (ISO) instead of serverTimestamp inside arrayUnion
      let historyEntry: HistoryEntry | null = null;
      if (orig !== nowStatus) {
        historyEntry = {
          changedAt: new Date().toISOString(), // client timestamp (string)
          changedBy: auth.currentUser?.email || '',
          from: orig,
          to: nowStatus,
          reason: editForm.statusReason || '',
          maintainedBy: (orig === 'Under Maintenance' && nowStatus === 'Functional') ? (editForm.maintainedBy || '') : '',
        };
      }

      // perform single updateDoc call (include history via arrayUnion if needed)
      if (historyEntry) {
        await updateDoc(assetRef, {
          ...payload,
          assetHistory: arrayUnion(historyEntry),
        });
      } else {
        await updateDoc(assetRef, payload);
      }

      toast.success('Asset updated');
      setEditModalOpen(false);
      setEditForm(null);
      setEditingId(null);
    } catch (err: any) {
      console.error('Failed to save asset (handleSaveEdit):', err);
      const message = err?.message || String(err);
      const code = err?.code ? ` (${err.code})` : '';
      toast.error(`Failed to save changes: ${message}${code}`);
      if (String(message).toLowerCase().includes('exceeded') || String(message).toLowerCase().includes('size')) {
        toast.info('If you were generating a QR image, it may be too large. Try disabling QR or shrinking it.');
      }
    } finally {
      setSaving(false);
    }
  };

  const onEditChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // Live QR preview inside edit modal (existing QR when not generating; live render when generateQR)
  useEffect(() => {
    if (!editForm) return;
    const container = qrPreviewRef.current;
    if (!container) return;

    if (editForm.existingQrcode && !editForm.generateQR) {
      container.innerHTML = `<img src="${editForm.existingQrcode}" style="max-width:220px;width:100%;height:auto;border-radius:6px;" />`;
      return;
    }

    if (editForm.generateQR) {
      const assetIdToUse = editForm.assetId || editingId || '';
      const assetUrl = editForm.assetUrl || buildAssetUrl(assetIdToUse);
      const qrString = JSON.stringify({ assetId: assetIdToUse, assetUrl });
      try {
        renderQRTo(qrString, container);
      } catch (e) {
        console.error('Preview render failed', e);
        container.innerHTML = `<div class="muted">QR preview unavailable</div>`;
      }
    } else {
      container.innerHTML = '';
    }
  }, [editForm, editingId]);

  const formatWhen = (changedAt: any) => {
    if (!changedAt) return 'Unknown time';
    try {
      // Firestore Timestamp object with toDate()
      if (typeof changedAt.toDate === 'function') {
        return changedAt.toDate().toLocaleString();
      }
      // Firestore-like object with toMillis()
      if (typeof changedAt.toMillis === 'function') {
        return new Date(changedAt.toMillis()).toLocaleString();
      }
      // ISO string
      if (typeof changedAt === 'string') {
        const parsed = new Date(changedAt);
        if (!isNaN(parsed.getTime())) return parsed.toLocaleString();
        return String(changedAt);
      }
      // number (ms since epoch)
      if (typeof changedAt === 'number') {
        return new Date(changedAt).toLocaleString();
      }
      return String(changedAt);
    } catch {
      return 'Unknown time';
    }
  };

  // Format history entry for display (timestamp handling)
  const renderHistoryEntries = (history: HistoryEntry[] | undefined) => {
    if (!history || history.length === 0) {
      return <div className="history-empty muted">No history available</div>;
    }

    // Sort descending by time (best-effort — handles strings, numbers, timestamps)
    const sorted = [...history].sort((a, b) => {
      const getMillis = (x: any) => {
        if (!x) return 0;
        if (typeof x.toMillis === 'function') return x.toMillis();
        if (typeof x === 'string') {
          const t = Date.parse(x);
          return isNaN(t) ? 0 : t;
        }
        if (typeof x === 'number') return x;
        return 0;
      };
      return getMillis(b.changedAt) - getMillis(a.changedAt);
    });

    return sorted.map((h, i) => {
      const when = formatWhen(h.changedAt);
      return (
        <div className="history-entry" key={i} role="group" aria-label={`history-entry-${i}`}>
          <div className="history-meta">
            <div className="history-action">{h.from || '—'} → {h.to || '—'}</div>
            <div className="history-when">{when}</div>
            <div className="history-who">{h.changedBy || ''}</div>
          </div>
          <div className="history-body">
            <div className="history-reason"><strong>Reason:</strong> {h.reason || '—'}</div>
            {h.maintainedBy && <div className="history-maintained"><strong>Maintained by:</strong> {h.maintainedBy}</div>}
          </div>
        </div>
      );
    });
  };

  // UI
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

              {/* Extra details including asset history */}
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

                {/* ✅ History button - NO HistoryModal here */}
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
                <button className="edits-button" onClick={() => {
                  const idx = filteredCards.findIndex(c => c.id === selectedCard.id);
                  if (idx >= 0) handleEditCard(idx);
                }}>Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editForm && (
        <div className="modal-backdrop" onClick={() => { setEditModalOpen(false); setEditForm(null); setEditingId(null); }}>
          <div className="modal edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Edit Asset</h2></div>

            <div className="modal-body edit-grid">
              <div className="edit-left">
                <div className="form-row"><label>Asset ID</label>
                  <input value={editForm.assetId} readOnly className="cursor-not-allowed bg-gray-100" />
                </div>

                <div className="form-row"><label>Asset Name</label>
                  <input value={editForm.assetName} onChange={(e) => onEditChange('assetName', e.target.value)} />
                </div>

                <div className="form-row"><label>Category</label>
                  <select value={editForm.category} onChange={(e) => onEditChange('category', e.target.value)}>
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-row"><label>License Type</label>
                  <select value={editForm.licenseType} onChange={(e) => onEditChange('licenseType', e.target.value)}>
                    <option value="">-- Select License Type --</option>
                    <option value="Perpetual">Perpetual</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Trial">Trial</option>
                    <option value="OEM">OEM</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>

                <div className="form-row"><label>Asset URL</label>
                  <input value={editForm.assetUrl} readOnly className="cursor-not-allowed bg-gray-100" />
                </div>

                <div className="form-row"><label>Assigned To</label>
                  <select value={editForm.personnel} onChange={(e) => onEditChange('personnel', e.target.value)}>
                    <option value="">-- Select IT Personnel --</option>
                    {itUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}{u.position ? ` (${u.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row"><label>Purchase Date</label>
                  <input type="date" value={editForm.purchaseDate || ''} onChange={(e) => onEditChange('purchaseDate', e.target.value)} />
                </div>

                <div className="form-row"><label>Serial Number</label>
                  <input value={editForm.serialNo} onChange={(e) => onEditChange('serialNo', e.target.value)} />
                </div>

                <div className="form-row"><label>Status</label>
                  <select value={editForm.status} onChange={(e) => onEditChange('status', e.target.value)}>
                    <option value="">-- Select Status --</option>
                    <option value="Functional">Functional</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Defective">Defective</option>
                    <option value="Unserviceable">Unserviceable</option>
                  </select>
                </div>

                {/* show reason when status changed */}
                {editForm.originalStatus !== undefined && editForm.originalStatus !== editForm.status && (
                  <div className="form-row">
                    <label>Reason for status change</label>
                    <textarea value={editForm.statusReason || ''} onChange={(e) => onEditChange('statusReason', e.target.value)} placeholder="Explain why the status was changed" />
                  </div>
                )}

                {/* maintainedBy only when transition Under Maintenance -> Functional */}
                {editForm.originalStatus === 'Under Maintenance' && editForm.status === 'Functional' && (
                  <div className="form-row">
                    <label>Maintained by</label>
                    <input value={editForm.maintainedBy || ''} onChange={(e) => onEditChange('maintainedBy', e.target.value)} placeholder="Person/Team who performed maintenance" />
                  </div>
                )}

                <div className="form-row">
                  <label>Renewal Date</label>
                  <input
                    type="date"
                    value={editForm.renewdate || ''}
                    onChange={(e) => onEditChange('renewdate', e.target.value)}
                    disabled={NON_EXPIRING.has(editForm.licenseType)}
                    className={NON_EXPIRING.has(editForm.licenseType) ? 'disabled' : ''}
                  />
                </div>

                <div className="form-row checkbox-row">
                  <label><input type="checkbox" checked={!!editForm.generateQR} onChange={(e) => onEditChange('generateQR', e.target.checked)} /> Generate QR for this asset</label>
                </div>
              </div>

              <div className="edit-right">
                <div className="qr-preview-wrapper">
                  <label>QR Preview</label>
                  <div className="qr-preview" ref={qrPreviewRef} />
                  <div className="qr-preview-hint muted">
                    {editForm.generateQR ? 'Live preview of generated QR (not saved yet).' : (editForm.existingQrcode ? 'Showing saved QR (existing).' : 'QR disabled')}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="close-btn" onClick={() => { setEditModalOpen(false); setEditForm(null); setEditingId(null); }}>Cancel</button>
              <button className="edits-button" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      <h1>Asset Management</h1>

      <div className="filter-tabs">
        <button onClick={() => setFilter('all')}>All <span>{cards.length}</span></button>
        <button onClick={() => setFilter('permanent')}>Permanent <span>{counts.permanent}</span></button>
        <button onClick={() => setFilter('normal')}>Normal <span>{counts.normal}</span></button>
        <button onClick={() => setFilter('aboutToExpire')}>About To Expire <span>{counts.aboutToExpire}</span></button>
        <button onClick={() => setFilter('expired')}>Expired <span>{counts.expired}</span></button>
      </div>

      {loading ? (
        <p style={{ padding: '1rem' }}>Loading assets…</p>
      ) : filteredCards.length === 0 ? (
        <p style={{ padding: '1rem' }}>No assets found for this filter.</p>
      ) : (
        <div className="cards-grid">
          {filteredCards.map((card, index) => (
            <div className="card" key={card.id}>
              <div className="card-top">
                <div className="card-top-left">
                  <div className={`card-icon ${card.iconClass}`}></div>
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
              <p>{card.team}</p>
              <p>{card.timeLeft}</p>
              <div className="card-footer">
                <span>Ronzel Go</span>
                <span>Serial Number: {card.serial}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ HistoryModal at root level - CORRECT PLACE */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={historyAsset?.history || []}
        assetName={historyAsset?.name || 'Asset'}
      />

      {/* QRModal at root level */}
      <QRModal isOpen={showQR} onClose={() => setShowQR(false)} asset={qrAsset} />
    </div>
  );
};

export default AssetManagement;