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
  title: string;        // assetName
  team: string;         // category
  timeLeft: string;     // computed
  serial: string;       // serialNo (string)
  iconClass: 'icon-blue' | 'icon-green' | 'icon-orange' | 'icon-red';
  image?: string;       // optional image preview (dataURL)
  assetId?: string;      // generated assetId (not Firestore id)
  assetUrl?: string;     // URL encoded into the QR
  qrcode?: string;       // base64 data URL (optional)
  generateQR?: boolean;
}

const AssetManagement = () => {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ---- helpers ----
  const computeBadge = (licenseType?: string, expirationDate?: string) => {
    // Non-expiring licenses
    if (licenseType && NON_EXPIRING.has(licenseType)) {
      return { iconClass: 'icon-blue' as const, timeLeft: 'No Expiration' };
    }

    // If no expirationDate provided, fall back to unknown (treat as About to Expire to be safe)
    if (!expirationDate) {
      return { iconClass: 'icon-orange' as const, timeLeft: 'No Expiration Date' };
    }

    // Compute days left
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
      const weeks = Math.ceil(daysLeft / 7);
      return { iconClass: 'icon-green' as const, timeLeft: `${weeks} week(s) left` };
    }
    const months = Math.ceil(daysLeft / 30);
    return { iconClass: 'icon-green' as const, timeLeft: `${months} month(s) left` };
  };

  // ---- fetch assets ----
// ---- real-time assets ----
useEffect(() => {
  setLoading(true);

  const qRef = query(
    collection(db, "IT_Assets"),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(
    qRef,
    (snap) => {
      const next: Card[] = snap.docs.map((doc) => {
        const d = doc.data() as any;

        // derive badge/timeLeft
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

          if (daysLeft < 0) return { iconClass: 'icon-red' as const, timeLeft: `Expired ${Math.abs(daysLeft)} day(s) ago` };
          if (daysLeft === 0) return { iconClass: 'icon-orange' as const, timeLeft: 'Expires today' };
          if (daysLeft <= 30) return { iconClass: 'icon-orange' as const, timeLeft: `${daysLeft} day(s) left` };
          if (daysLeft <= 90) return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 7)} week(s) left` };
          return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 30)} month(s) left` };
        };

        const { iconClass, timeLeft } = computeBadge(d.licenseType, d.expirationDate);

        return {
          id: doc.id,
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
        };
      });

      setCards(next);
      setLoading(false);
    },
    (err) => {
      console.error("onSnapshot error (IT_Assets):", err);
      setLoading(false);
    }
  );

  // cleanup on unmount
  return () => unsubscribe();
}, []);


  // ---- filtering ----
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

  // dynamic counts
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

  // ---- UI handlers (modal + options - left non-functional as requested) ----
  const handleViewMore = (card: Card) => setSelectedCard(card);
  const handleCloseModal = () => setSelectedCard(null);
  const handleCardOptionsToggle = (index: number) => {
    setOpenCardOptionsId(prev => (prev === index ? null : index));
  };
  const handleDeleteCard = (index: number) => {
    // Non-functional for now (UI only)
    setOpenCardOptionsId(null);
  };
  const handleEditCard = (index: number) => {
    // Non-functional for now (UI only)
    setOpenCardOptionsId(null);
  };

  // NEW
const [showQR, setShowQR] = useState(false);
// We pass a minimal object with the field names your QRModal expects
const [qrAsset, setQrAsset] = useState<{
  id: string;
  assetId?: string;
  assetName?: string;
  serialNo?: string;
  qrcode?: string;
  assetUrl?: string;
} | null>(null);

// NEW
const openQR = (card: Card) => {
  // Only open if we have something to show or generate
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
      {selectedCard && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal view-more-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
        <h2>Asset Details</h2>

              {(selectedCard.generateQR || selectedCard.qrcode || selectedCard.assetUrl || selectedCard.assetId) && (
                <button
                  className="view-qr-fab"
                  onClick={() => openQR(selectedCard)}
                  title="View QR"
                >
                  <i className="fas fa-qrcode" aria-hidden="true" />
                  <span>View QR</span>
                </button>
              )}
            </div>
            <div className="modal-image">
              {/* Show image if available from Firestore */}
              {selectedCard.image ? (
                <img src={selectedCard.image} alt="Asset" />
              ) : (
                <img src="printer.jpg" alt="Asset" />
              )}
            </div>
            <div className="modal-details">
              <h2>Asset Details</h2>
              <table className="modal-table">
                <thead>
                  <tr><th>Attribute</th><th>Details</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Asset Name:</strong></td><td>{selectedCard.title}</td></tr>
                  <tr><td><strong>Category:</strong></td><td>{selectedCard.team}</td></tr>
                  <tr><td><strong>Serial Number:</strong></td><td>{selectedCard.serial}</td></tr>
                  <tr><td><strong>License:</strong></td><td>{selectedCard.timeLeft}</td></tr>
                </tbody>
              </table>
              <div className="buttons-container">
                <button className="close-btn" onClick={handleCloseModal}>Close</button>
                <button className="edits-button" onClick={() => { /* keep non-functional */ }}>Edit</button>
                
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
            <div className="card" key={card.id || index}>
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
      {/* NEW */}
<QRModal
  isOpen={showQR}
  onClose={() => setShowQR(false)}
  asset={qrAsset}
/>

    </div>
  );
};

export default AssetManagement;
