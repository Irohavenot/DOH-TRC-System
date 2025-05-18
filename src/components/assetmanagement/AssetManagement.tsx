import React, { useState } from 'react';
import "../../assets/assetmanagement.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

const AssetManagement = () => {
  type ExpiryFilter = 'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired';
  type TypeFilter = 'all' | 'desktop' | 'printer' | 'server' | 'furniture' | 'consumable' | 'other';

  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  interface Card {
    title: string;
    team: string;
    timeLeft: string;
    progress: number;
    iconClass: string;
    type: TypeFilter;
  }

const [cards, setCards] = useState<Card[]>([

  { title: "Solar Panel Controller", team: "Energy Team", timeLeft: "No Expiration", progress: 20, iconClass: "icon-blue", type: 'other' },
  { title: "Server Rack - Steel Frame", team: "Facilities", timeLeft: "No Expiration", progress: 15, iconClass: "icon-blue", type: 'furniture' },
  { title: "UI Build Server", team: "DevOps", timeLeft: "2 Years Left", progress: 80, iconClass: "icon-green", type: 'server' },
  { title: "Canon Printer Ink Subscription", team: "Procurement", timeLeft: "2 Months Left", progress: 90, iconClass: "icon-orange", type: 'consumable' },
  { title: "HP LaserJet Pro", team: "IT Support", timeLeft: "1 Month Left", progress: 88, iconClass: "icon-orange", type: 'printer' },
  { title: "Ergonomic Chair", team: "Admin", timeLeft: "3 Weeks Left", progress: 60, iconClass: "icon-orange", type: 'furniture' },
  { title: "Lenovo ThinkPad T14", team: "Field Staff", timeLeft: "Expired", progress: 0, iconClass: "icon-red", type: 'desktop' },
  { title: "Arduino Dev Kit", team: "R&D", timeLeft: "Expired", progress: 5, iconClass: "icon-red", type: 'other' },
  { title: "Dell XPS 13", team: "Executive Team", timeLeft: "1 Year Left", progress: 70, iconClass: "icon-green", type: 'desktop' },
  { title: "Office 365 License", team: "IT Department", timeLeft: "2 Days Left", progress: 5, iconClass: "icon-orange", type: 'consumable' },
]);


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
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);

  const handleViewMore = (card: Card) => setSelectedCard(card);
  const handleCloseModal = () => setSelectedCard(null);
  const handleCardOptionsToggle = (index: number) => {
    setOpenCardOptionsId(prev => (prev === index ? null : index));
  };
  const handleDeleteCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
    setOpenCardOptionsId(null);
  };
  const handleEditCard = (index: number) => {
    console.log(`Editing card at index ${index}`);
    setOpenCardOptionsId(null);
  };

  return (
    <div className="content-here">
      {selectedCard && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Content */}
          </div>
        </div>
      )}

      <h1>Asset Management</h1>

      {/* Dropdown Filters */}
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

      <div className="cards-grid">
        {filteredCards.map((card, index) => (
          <div className="card" key={index}>
            <div className="card-top">
              <div className="card-top-left">
                <div className={`card-icon ${card.iconClass}`}></div>
                <button className="view-more-btn" onClick={() => handleViewMore(card)}>View More</button>
              </div>
              <div className="card-options">
                <button className="options-btn" onClick={() => handleCardOptionsToggle(index)}>⋮</button>
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
              <span>Serial Number: {card.progress}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetManagement;
