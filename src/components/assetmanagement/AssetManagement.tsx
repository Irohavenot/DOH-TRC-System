import React, { useState } from 'react';
import "../../assets/assetmanagement.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

const AssetManagement = () => {
  
  
  const [filter, setFilter] = useState<'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired'>('all');

  

  
  interface Card {
    title: string;
    team: string;
    timeLeft: string;
    progress: number;
    iconClass: string;
  }
  const [cards, setCards] = useState<Card[]>([
    { title: "Router - Cisco 2901", team: "Medical Components", timeLeft: "No Expiration", progress: 34, iconClass: "icon-blue" },
    { title: "UI Development Server", team: "Core UI", timeLeft: "2 Years Left", progress: 76, iconClass: "icon-green" },
    { title: "MS Office 365 License", team: "Microsoft Office", timeLeft: "2 Days Left", progress: 4, iconClass: "icon-orange" },
    { title: "Norton Security Suite", team: "Anti-Virus", timeLeft: "1 Month Left", progress: 90, iconClass: "icon-orange" },
    { title: "Dell OptiPlex 7090", team: "Computer", timeLeft: "3 Weeks Left", progress: 65, iconClass: "icon-red" },
    { title: "HP LaserJet M404", team: "Printer", timeLeft: "2 Month Left", progress: 96, iconClass: "icon-orange" },
    { title: "Solar Panel Inverter", team: "Solar Electronics", timeLeft: "No Expiration", progress: 24, iconClass: "icon-blue" },
    { title: "Arduino IoT Kit", team: "Electronics", timeLeft: "1 Weeks Left", progress: 70, iconClass: "icon-red" },
  ]);

  const filteredCards = cards.filter((card) => {
    switch (filter) {
      case 'permanent':
        return card.iconClass === 'icon-blue';
      case 'normal':
        return card.iconClass === 'icon-green';
      case 'aboutToExpire':
        return card.iconClass === 'icon-orange';
      case 'expired':
        return card.iconClass === 'icon-red';
      default:
        return true;
    }
  });

 
  

  
  

  

 
  

  
  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [openCardOptionsId, setOpenCardOptionsId] = useState<number | null>(null);

  const handleViewMore = (card: Card) => {
    setSelectedCard(card);
  };
  
  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  
 
  

  const handleCardOptionsToggle = (index: number) => {
    setOpenCardOptionsId(prev => (prev === index ? null : index));
  };

  const handleDeleteCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
    setOpenCardOptionsId(null); // Close the menu after deleting
  };

  const handleEditCard = (index: number) => {
    console.log(`Editing card at index ${index}`);
    // Add your edit logic here (e.g., open a modal to edit the card details)
    setOpenCardOptionsId(null); // Close the menu after clicking edit
  };

  return (

          <div className="content-here"> 
            
             {selectedCard && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-image">
              <img src="printer.jpg" alt="Asset" />
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
                  <tr><td><strong>Asset Name:</strong></td><td>{selectedCard.title}</td></tr>
                  <tr><td><strong>Category:</strong></td><td>Laptop</td></tr>
                  <tr><td><strong>Status:</strong></td><td>Active</td></tr>
                  <tr><td><strong>Assigned Personnel:</strong></td><td>John Doe</td></tr>
                  <tr><td><strong>Purchase Date:</strong></td><td>2023-04-21</td></tr>
                  <tr><td><strong>Serial Number:</strong></td><td>SN123456</td></tr>
                  <tr><td><strong>License Type:</strong></td><td>OEM</td></tr>
                  <tr><td><strong>Expiration Date:</strong></td><td>2025-04-21</td></tr>
                </tbody>
              </table>

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
                  <button onClick={() => setFilter('permanent')}>Permanent <span>2</span></button>
                  <button onClick={() => setFilter('normal')}>Normal <span>1</span></button>
                  <button onClick={() => setFilter('aboutToExpire')}>About To Expire <span>3</span></button>
                  <button onClick={() => setFilter('expired')}>Expired <span>2</span></button>
                </div>

                <div className="cards-grid">
                  {filteredCards.map((card, index) => (
                    <div className="card" key={index}>
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
                        <span>Serial Number: {card.progress}</span>
                      </div>
                    </div>
                  ))}
                </div>
              
            

          
           </div>
     
     
          
        
      
      
  );
};

export default AssetManagement;