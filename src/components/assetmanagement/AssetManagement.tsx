import  { useState } from 'react';
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

  const handleViewMore = (card: Card) => {
  setSelectedCard(card);
  setEditedDetails({
    assetName: card.title,
    category: "Laptop",
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
  const handleCardOptionsToggle = (index: number) => {
    setOpenCardOptionsId(prev => (prev === index ? null : index));
  };
  const handleDeleteCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
    setOpenCardOptionsId(null);
  };
const handleEditCard = (index: number) => {
  const card = cards[index];
  handleViewMore(card);     // This sets selectedCard and default details
  setIsEditing(true);       // Enable editing mode
  setOpenCardOptionsId(null); // Optional: close the options menu
};


  return (
    <div className="content-here">
      {selectedCard && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
 <div className="modal-image">
              <img src="../../printer.jpg" alt="Asset" />
            </div>
            <div className="modal-details">
              <h2>Asset Details</h2>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                    <tr><td><strong>Asset ID:</strong></td><td>12345</td></tr>
                    <tr>
                      <td><strong>Asset Name:</strong></td>
                      <td>
                        {isEditing ? (
                          <input value={editedDetails.assetName} onChange={e => handleInputChange("assetName", e.target.value)} />
                        ) : editedDetails.assetName}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Category:</strong></td>
                      <td>
                        {isEditing ? (
                          <input value={editedDetails.category} onChange={e => handleInputChange("category", e.target.value)} />
                        ) : editedDetails.category}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td>
                        {isEditing ? (
                          <input value={editedDetails.status} onChange={e => handleInputChange("status", e.target.value)} />
                        ) : editedDetails.status}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Assigned Personnel:</strong></td>
                      <td>
                        {isEditing ? (
                          <input value={editedDetails.assignedPersonnel} onChange={e => handleInputChange("assignedPersonnel", e.target.value)} />
                        ) : editedDetails.assignedPersonnel}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Purchase Date:</strong></td>
                      <td>
                        {isEditing ? (
                          <input type="date" value={editedDetails.purchaseDate} onChange={e => handleInputChange("purchaseDate", e.target.value)} />
                        ) : editedDetails.purchaseDate}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Serial Number:</strong></td>
                      <td>
                        {isEditing ? (
                          <input value={editedDetails.serialNumber} onChange={e => handleInputChange("serialNumber", e.target.value)} />
                        ) : editedDetails.serialNumber}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>License Type:</strong></td>
                      <td>
                        {isEditing ? (
                          <input value={editedDetails.licenseType} onChange={e => handleInputChange("licenseType", e.target.value)} />
                        ) : editedDetails.licenseType}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Expiration Date:</strong></td>
                      <td>
                        {isEditing ? (
                          <input type="date" value={editedDetails.expirationDate} onChange={e => handleInputChange("expirationDate", e.target.value)} />
                        ) : editedDetails.expirationDate}
                      </td>
                    </tr>
                  </tbody>

              </table>

              <div className="buttons-container">
                  <button className="close-btn" onClick={handleCloseModal}>
                    <i className="fas fa-xmark"></i> Close
                  </button>
                  {!isEditing ? (
                    <button className="edits-button" onClick={handleEditClick}>
                      <i className="fas fa-edit"></i> Edit
                    </button>
                  ) : (
                    <button className="save-button" onClick={handleSaveClick}>
                      <i className="fas fa-check"></i> Save
                    </button>
                  )}
                  {!isEditing && (
                    <button className="history-btn" onClick={() => handleShowHistory(selectedCard!)}>
                      <i className="fas fa-history"></i> History
                    </button>
                  )}
              </div>
            </div>
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

      {showEditSuccess && (
            <div className="edit-success-popup">
              <i className="fas fa-check-circle"></i> Edit successful!
            </div>
          )}

      <div className="cards-grid">
        {filteredCards.map((card, index) => (
          <div className="card" key={index}>
            <div className="card-top">
              <div className="card-top-left">
                <div className={`card-icon ${card.iconClass}`}></div>
                <button className="view-more-btn" onClick={() => handleViewMore(card)}><i className="fas fa-eye"></i> View More</button>
              </div>
              <div className="card-options">
                <button className="options-btn" onClick={() => handleCardOptionsToggle(index)}>⋮</button>
                {openCardOptionsId === index && (
                  <div className="card-options-menu">
                    <button className="history-btn" onClick={() => handleShowHistory(card)}>
                            <i className="fas fa-history"></i> History</button>
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
                       {showHistoryModal && selectedHistoryAsset && (
      <div className="asset-modal-history">
  <div className="asset-modal-history-content">
    <h2>{selectedHistoryAsset.title} – History</h2>
    <table className="history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Action</th>
          <th>Site of Action</th> 
          <th>Handled By</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>2024-11-01</td>
          <td>Assigned</td>
          <td>In-house</td>
          <td>It-Personnel-Alice Johnson</td>
        </tr>
        <tr>
          <td>2025-01-15</td>
          <td>Repaired</td>
          <td>In-house</td>
          <td>IT Support Personnel – Bob Smith</td>
        </tr>
        <tr>
          <td>2025-02-20</td>
          <td>Maintained</td>
          <td>Outsourced</td>
          <td>QuickFix Tech Solutions</td>
        </tr>
        <tr>
          <td>2025-03-12</td>
          <td>Renewed</td>
          <td>In-house</td>
          <td>IT Admin – Clara Reyes (Microsoft 365)</td>
        </tr>
        <tr>
          <td>2025-04-02</td>
          <td>Reported Issue (Battery)</td>
          <td>In-House</td>
          <td>It-Personnel – James Miller</td>
        </tr>
        <tr>
          <td>2025-05-10</td>
          <td>Repaired</td>
          <td>Outsourced</td>
          <td>BatteryPro Repair Services</td>
        </tr>
      </tbody>
    </table>
    <button onClick={() => setShowHistoryModal(false)}>Close</button>
  </div>
</div>

)}
      </div>
    </div>
  );
};

export default AssetManagement;
