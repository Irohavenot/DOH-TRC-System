import React, { useEffect, useMemo, useState } from 'react';
import "../../assets/assetmanagement.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { db } from '../../firebase/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import QRModal from './QRModal';

const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);

type FilterKey = 'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired';

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
  qrcode?: string;
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
}

const AssetManagement = () => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showQR, setShowQR] = useState(false);
  const [qrAsset, setQrAsset] = useState<{
    id: string;
    assetId?: string;
    assetName?: string;
    serialNo?: string;
    qrcode?: string;
    assetUrl?: string;
  } | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  // User ID → Full Name mapping
const [emailToNameMap, setEmailToNameMap] = useState<Record<string, string>>({});
const [uidToNameMap, setUidToNameMap] = useState<Record<string, string>>({});

  // 🔥 FETCH USERS FROM IT_Supply_Users (with correct field names)
// 🔥 FETCH USERS AND INDEX BY EMAIL (not UID)
useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "IT_Supply_Users"),
    (snapshot) => {
      const emailMap: Record<string, string> = {};
      const uidMap: Record<string, string> = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const uid = doc.id;

        // --- Build full name with middle initial ---
        const first = data.FirstName || data.firstName || '';
        const middle = data.MiddleInitial || data.middleName || '';
        const last = data.LastName || data.lastName || '';

        let middleInitial = '';
        if (middle) {
          if (middle.length > 1 && !middle.endsWith('.')) {
            middleInitial = middle.charAt(0).toUpperCase() + '.';
          } else {
            middleInitial = middle.trim();
            if (middleInitial.length === 1) {
              middleInitial += '.';
            }
          }
        }

        const fullName = [first, middleInitial, last].filter(Boolean).join(' ') || 'Unknown User';

        // --- Map by UID (for personnel) ---
        uidMap[uid] = fullName;

        // --- Map by Email (for createdBy / updatedBy) ---
        const email1 = data.Email?.trim().toLowerCase();
        const email2 = data.email?.trim().toLowerCase();
        if (email1) emailMap[email1] = fullName;
        if (email2 && email2 !== email1) emailMap[email2] = fullName;
      });

      setUidToNameMap(uidMap);
      setEmailToNameMap(emailMap);
    },
    (err) => {
      console.error("Failed to fetch IT_Supply_Users:", err);
    }
  );
  return () => unsubscribe();
}, []);
  // Fetch raw assets
  const [rawAssets, setRawAssets] = useState<any[]>([]);
  useEffect(() => {
    setLoading(true);
    const qRef = query(collection(db, "IT_Assets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      qRef,
      (snap) => {
        const assets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRawAssets(assets);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching IT_Assets:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Compute badge helper
  const computeBadge = (licenseType?: string, expirationDate?: string) => {
    if (licenseType && NON_EXPIRING.has(licenseType)) {
      return { iconClass: 'icon-blue' as const, timeLeft: 'No Expiration' };
    }
    if (!expirationDate) {
      return { iconClass: 'icon-orange' as const, timeLeft: 'No Expiration Date' };
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const exp = new Date(expirationDate).getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((exp - startOfToday) / MS_PER_DAY);

    if (daysLeft < 0) {
      return { iconClass: 'icon-red' as const, timeLeft: `Expired ${Math.abs(daysLeft)} day(s) ago` };
    }
    if (daysLeft === 0) {
      return { iconClass: 'icon-orange' as const, timeLeft: 'Expires today' };
    }
    if (daysLeft <= 30) {
      return { iconClass: 'icon-orange' as const, timeLeft: `${daysLeft} day(s) left` };
    }
    if (daysLeft <= 90) {
      return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 7)} week(s) left` };
    }
    return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 30)} month(s) left` };
  };

  // 🔥 Transform assets + resolve user names using IT_Supply_Users data
const cards = useMemo(() => {
  return rawAssets.map((d) => {
    // Resolve Assigned To (personnel) by UID
    const personnelName = d.personnel ? uidToNameMap[d.personnel] || d.personnel : undefined;

    // Resolve Created By / Updated By by email
    const resolveByEmail = (email?: string): string | undefined => {
      if (!email) return undefined;
      return emailToNameMap[email.trim().toLowerCase()] || email;
    };

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
      qrcode: d.qrcode,
      generateQR: !!d.generateQR,
      personnel: personnelName,       // ← resolved by UID
      purchaseDate: d.purchaseDate || undefined,
      status: d.status || undefined,
      licenseType: d.licenseType || undefined,
      createdAt: d.createdAt ? new Date(d.createdAt.toDate()).toLocaleString() : undefined,
      createdBy: createdByName,       // ← resolved by email
      updatedAt: d.updatedAt ? new Date(d.updatedAt.toDate()).toLocaleString() : undefined,
      updatedBy: updatedByName,       // ← resolved by email
      renewdate: d.renewdate ? new Date(d.renewdate.toDate()).toLocaleDateString() : undefined,
    };
  });
}, [rawAssets, uidToNameMap, emailToNameMap]);

  // Filtering & counts
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

  // Handlers
  const handleViewMore = (card: Card) => setSelectedCard(card);
  const handleCloseModal = () => {
    setSelectedCard(null);
    setShowMoreDetails(false);
  };
  const handleCardOptionsToggle = (index: number) => {
    setOpenCardOptionsId(prev => (prev === index ? null : index));
  };
  const handleDeleteCard = (index: number) => setOpenCardOptionsId(null);
  const handleEditCard = (index: number) => setOpenCardOptionsId(null);

  const openQR = (card: Card) => {
    const hasQr = !!card.qrcode || !!card.assetUrl || !!card.assetId || !!card.generateQR;
    if (!hasQr) return;
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

  return (
    <div className="content-here">
      {/* Modal */}
      {selectedCard && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal view-more-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Asset Details</h2>
              {(selectedCard.generateQR || selectedCard.qrcode || selectedCard.assetUrl || selectedCard.assetId) && (
                <button
                  className="view-qr-fab"
                  onClick={(e) => { e.stopPropagation(); openQR(selectedCard); }}
                  title="View QR"
                >
                  <i className="fas fa-qrcode" />
                  <span>View QR</span>
                </button>
              )}
            </div>

            <div className="modal-image">
              {selectedCard.image ? (
                <img src={selectedCard.image} alt="Asset" />
              ) : (
                <img src="printer.jpg" alt="Asset" />
              )}
            </div>

            <div className="modal-details">
              <h2>Asset Details</h2>
              <table className="modal-table">
                <tbody>
                  <tr><td><strong>Asset Name:</strong></td><td>{selectedCard.title}</td></tr>
                  <tr><td><strong>Category:</strong></td><td>{selectedCard.team}</td></tr>
                  <tr><td><strong>Serial Number:</strong></td><td>{selectedCard.serial}</td></tr>
                  <tr><td><strong>License Status:</strong></td><td>{selectedCard.timeLeft}</td></tr>
                  {selectedCard.licenseType && (
                    <tr><td><strong>License Type:</strong></td><td>{selectedCard.licenseType}</td></tr>
                  )}
                </tbody>
              </table>

              {(
                selectedCard.personnel ||
                selectedCard.purchaseDate ||
                selectedCard.status ||
                selectedCard.createdAt ||
                selectedCard.createdBy ||
                selectedCard.updatedAt ||
                selectedCard.updatedBy ||
                selectedCard.renewdate
              ) && (
                <>
                  <div className={`extra-details-wrapper ${showMoreDetails ? 'visible' : 'hidden'}`}>
                    <div className="extra-details-divider"></div>
                    <table className="modal-table extra-details">
                      <tbody>
                        {selectedCard.personnel && (
                          <tr><td><strong>Assigned To:</strong></td><td>{selectedCard.personnel}</td></tr>
                        )}
                        {selectedCard.purchaseDate && (
                          <tr><td><strong>Purchase Date:</strong></td><td>{selectedCard.purchaseDate}</td></tr>
                        )}
                        {selectedCard.status && (
                          <tr><td><strong>Status:</strong></td><td>{selectedCard.status}</td></tr>
                        )}
                        {selectedCard.renewdate && (
                          <tr><td><strong>Renewal Date:</strong></td><td>{selectedCard.renewdate}</td></tr>
                        )}
                        {selectedCard.createdAt && (
                          <tr><td><strong>Created At:</strong></td><td>{selectedCard.createdAt}</td></tr>
                        )}
                        {selectedCard.createdBy && (
                          <tr><td><strong>Created By:</strong></td><td>{selectedCard.createdBy}</td></tr>
                        )}
                        {selectedCard.updatedAt && (
                          <tr><td><strong>Updated At:</strong></td><td>{selectedCard.updatedAt}</td></tr>
                        )}
                        {selectedCard.updatedBy && (
                          <tr><td><strong>Updated By:</strong></td><td>{selectedCard.updatedBy}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="show-more-section">
                    <button className="show-more-btn" onClick={() => setShowMoreDetails(prev => !prev)}>
                      {showMoreDetails ? (
                        <>
                          <i className="fas fa-chevron-up"></i> Show Less Details
                        </>
                      ) : (
                        <>
                          <i className="fas fa-chevron-down"></i> Show More Details
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              <div className="buttons-container">
                <button className="close-btn" onClick={handleCloseModal}>Close</button>
                <button className="edits-button">Edit</button>
              </div>
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
                  <button className="view-more-btn" onClick={() => handleViewMore(card)}>
                    View More
                  </button>
                </div>
                <div className="card-options">
                  <button className="options-btn" onClick={() => handleCardOptionsToggle(index)}>
                    ⋮
                  </button>
                  {openCardOptionsId === index && (
                    <div className="card-options-menu">
                      <button className="edit-btn" onClick={() => handleEditCard(index)}>
                        <i className="fas fa-edit"></i> Edit Asset
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteCard(index)}>
                        <i className="fas fa-trash-alt"></i> Delete Asset
                      </button>
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

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        asset={qrAsset}
      />
    </div>
  );
};

export default AssetManagement;