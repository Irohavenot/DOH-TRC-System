import { useEffect, useState } from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase"; // make sure you have firebase.ts exporting db
import "../../assets/assetmanagement.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

const AssetManagement = () => {
  type ExpiryFilter = 'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired';
  type TypeFilter = 'all' | 'desktop' | 'printer' | 'server' | 'furniture' | 'consumable' | 'other';

  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<{ [key: string]: string }>({});
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<Card | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  interface Card {
    id: string;
    title: string;
    team: string;
    timeLeft: string;
    progress: number;
    iconClass: string;
    type: TypeFilter;
  }

  const [cards, setCards] = useState<Card[]>([]);

  // 🔥 Fetch assets from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "IT_Assets"), (snapshot) => {
      const assetData: Card[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.Asset_Name || "Unnamed Asset",
          team: data.Department || "Unknown Department",
          timeLeft: data.Expiration_Status || "No Expiration",
          progress: data.Progress || 0,
          iconClass: getIconClass(data.Expiration_Status),
          type: (data.Category?.toLowerCase() || "other") as TypeFilter,
        };
      });
      setCards(assetData);
    });

    return () => unsubscribe();
  }, []);

  // helper: map Firestore expiration status to colors
  const getIconClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "permanent": return "icon-blue";
      case "normal": return "icon-green";
      case "about to expire": return "icon-orange";
      case "expired": return "icon-red";
      default: return "icon-blue";
    }
  };

  const filteredCards = cards.filter((card) => {
    const matchesExpiry = (() => {
      switch (expiryFilter) {
        case 'permanent': return card.iconClass === 'icon-blue';
        case 'normal': return card.iconClass === 'icon-green';
        case 'aboutToExpire': return card.iconClass === 'icon-orange';
        case 'expired': return card.iconClass === 'icon-red';
        default: return true;
      }
    })();

    const matchesType = typeFilter === 'all' || card.type === typeFilter;

    return matchesExpiry && matchesType;
  });

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<string | null>(null);

  const handleViewMore = (card: Card) => {
    setSelectedCard(card);
    setEditedDetails({
      assetName: card.title,
      category: card.type,
      status: "Active",
      assignedPersonnel: "John Doe",
      purchaseDate: "2023-04-21",
      serialNumber: "SN123456",
      licenseType: "OEM",
      expirationDate: "2025-04-21"
    });
    setIsEditing(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    setShowEditSuccess(true);
    setTimeout(() => setShowEditSuccess(false), 2000);
  };

  const handleShowHistory = (card: Card) => {
    setSelectedHistoryAsset(card);
    setShowHistoryModal(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleCloseModal = () => setSelectedCard(null);
  const handleCardOptionsToggle = (id: string) => {
    setOpenCardOptionsId(prev => (prev === id ? null : id));
  };
  const handleDeleteCard = (id: string) => {
    setCards(prev => prev.filter((c) => c.id !== id));
    setOpenCardOptionsId(null);
  };
  const handleEditCard = (card: Card) => {
    handleViewMore(card);
    setIsEditing(true);
    setOpenCardOptionsId(null);
  };

  return (
    <div className="content-here">
      {/* Same JSX as before — just using Firestore data */}
      <h1>Asset Management</h1>

      <div className="filter-dropdowns">
        <label>
          Filter by Type:
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="all">All</option>
            <option value="desktop">Desktop and Laptops</option>
            <option value="printer">Printers</option>
            <option value="server">Servers</option>
            <option value="furniture">Furnitures and Fixtures</option>
            <option value="consumable">Consumables</option>
            <option value="other">Other Devices</option>
          </select>
        </label>

        <label>
          Filter by Expiry:
          <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)}>
            <option value="all">All</option>
            <option value="permanent">Permanent</option>
            <option value="normal">Normal</option>
            <option value="aboutToExpire">About to Expire</option>
            <option value="expired">Expired</option>
          </select>
        </label>
      </div>

      {showEditSuccess && (
        <div className="edit-success-popup">
          <i className="fas fa-check-circle"></i> Edit successful!
        </div>
      )}

      <div className="cards-grid">
        {filteredCards.map((card) => (
          <div className="card" key={card.id}>
            <div className="card-top">
              <div className="card-top-left">
                <div className={`card-icon ${card.iconClass}`}></div>
                <button className="view-more-buttons" onClick={() => handleViewMore(card)}><i className="fas fa-eye"></i> View More</button>
              </div>
              <div className="card-options">
                <button className="options-btn" onClick={() => handleCardOptionsToggle(card.id)}>⋮</button>
                {openCardOptionsId === card.id && (
                  <div className="card-options-menu">
                    <button className="history-btn" onClick={() => handleShowHistory(card)}>
                      <i className="fas fa-history"></i> History</button>
                    <button className="edit-btn" onClick={() => handleEditCard(card)}>
                      <i className="fas fa-edit"></i> Edit Asset
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteCard(card.id)}>
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
              <span>Serial Number: {card.progress}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetManagement;
