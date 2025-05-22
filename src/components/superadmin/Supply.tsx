import React, { useState } from 'react';
import "../../superadmincss/supply.css";

const categories = [
  'Desktops', 'Laptops', 'Printer', 'Server', 'Other Devices',
  'Accessories', 'Components', 'Consumables',
  'Property Plant & Equipment', 'Semi-Expendable Property',
  'Insured Property', 'Defective Property', 'Unserviceable Property',
];

const statuses = ['Functional', 'Defective', 'Unserviceable'];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const sampleData = [
  {
    id: 1,
    name: 'Dell Desktop',
    category: 'Desktops',
    status: 'Functional',
    month: 'January',
    year: 2025,
    history: [
      {
        date: '2024-08-15',
        issue: 'Hard drive failure',
        repairType: 'In-house',
        itPersonnel: 'Juan Dela Cruz',
      },
    ],
  },
  {
    id: 2,
    name: 'HP Laptop',
    category: 'Laptops',
    status: 'Defective',
    month: 'February',
    year: 2024,
    history: [
      {
        date: '2023-11-20',
        issue: 'Battery not charging',
        repairType: 'Outsource',
        itPersonnel: 'Ana Santos',
      },
    ],
  },
  {
    id: 3,
    name: 'Canon Printer',
    category: 'Printer',
    status: 'Unserviceable',
    month: 'March',
    year: 2023,
    history: [],
  },
  {
    id: 4,
    name: 'Asus Server',
    category: 'Server',
    status: 'Functional',
    month: 'January',
    year: 2025,
    history: [],
  },
  {
    id: 5,
    name: 'Keyboard',
    category: 'Accessories',
    status: 'Functional',
    month: 'May',
    year: 2024,
    history: [
      {
        date: '2024-03-10',
        issue: 'Keys not working',
        repairType: 'In-house',
        itPersonnel: 'Mark Reyes',
      },
    ],
  },
];

const SupplyUnit: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<any[]>([]);

  const filteredData = sampleData.filter(item => {
    return (
      (selectedCategory === '' || item.category === selectedCategory) &&
      (selectedStatus === '' || item.status === selectedStatus) &&
      (selectedMonth === '' || item.month === selectedMonth) &&
      (selectedYear === '' || item.year.toString() === selectedYear)
    );
  });

  const handleItemClick = (item: any) => {
    setSelectedItemHistory(item.history || []);
    setShowModal(true);
  };

  const generateTitle = () => {
    if (
      selectedCategory === '' &&
      selectedStatus === '' &&
      selectedMonth === '' &&
      selectedYear === ''
    ) {
      return `All Items (${filteredData.length})`;
    }

    const parts = [];
    if (selectedCategory) parts.push(selectedCategory);
    if (selectedStatus) parts.push(selectedStatus);
    if (selectedMonth) parts.push(selectedMonth);
    if (selectedYear) parts.push(selectedYear);

    return `Filtered Results: ${parts.join(' - ')} (${filteredData.length})`;
  };

  return (
    <div className="supply-unit-container">
      <h2>Supply Unit Asset Data</h2>

      <div className="filters">
        <div className="dropdown">
          <label>Category:</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">-- Select Category --</option>
            {categories.map((cat, index) => (
              <option key={index} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Status:</label>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">-- Select Status --</option>
            {statuses.map((status, index) => (
              <option key={index} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Month:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="">-- Select Month --</option>
            {months.map((month, index) => (
              <option key={index} value={month}>{month}</option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">-- Select Year --</option>
            {years.map((year, index) => (
              <option key={index} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="supply-table">
        <h3>{generateTitle()}</h3>
        {filteredData.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Month</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr key={item.id}>
                  <td className="clickable" onClick={() => handleItemClick(item)}>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.status}</td>
                  <td>{item.month}</td>
                  <td>{item.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data matched the selected filters.</p>
        )}
      </div>

      {/* Modal for Item History */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-contents">
            <h3>Item Repair History</h3>
            <button className="cls-btn" onClick={() => setShowModal(false)}>Close</button>
            {selectedItemHistory.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Issue</th>
                    <th>Repair Type</th>
                    <th>IT Personnel</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItemHistory.map((history, index) => (
                    <tr key={index}>
                      <td>{history.date}</td>
                      <td>{history.issue}</td>
                      <td>{history.repairType}</td>
                      <td>{history.itPersonnel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No repair history available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyUnit;
