import React, { useState, useEffect } from 'react';
import "../../superadmincss/supply.css";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

const statuses = ['Functional', 'Defective', 'Unserviceable'];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

// Sample data — you can replace this with real Firestore data later
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
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showViewCategoriesModal, setShowViewCategoriesModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // 🔥 Fetch categories from Firestore
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Asset_Categories"));
        const list: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.Category_Name) list.push(data.Category_Name);
        });
        setCategories(list);
      } catch (e) {
        console.error("Error fetching categories:", e);
        alert("Failed to load categories.");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // 🔥 Add new category
  const addNewCategory = async (name: string) => {
    if (!name.trim()) {
      alert("Category name cannot be empty.");
      return false;
    }

    if (categories.includes(name.trim())) {
      alert("Category already exists.");
      return false;
    }

    try {
      await addDoc(collection(db, "Asset_Categories"), {
        Category_Name: name.trim(),
        createdAt: new Date(),
      });

      setCategories(prev => [...prev, name.trim()]);
      return true;
    } catch (err) {
      console.error("Failed to add category:", err);
      alert("Failed to add category.");
      return false;
    }
  };

  // 🔥 Edit category
  const editCategory = async (oldName: string, newName: string) => {
    if (!newName.trim()) {
      alert("New name cannot be empty.");
      return false;
    }

    if (categories.includes(newName.trim())) {
      alert("A category with that name already exists.");
      return false;
    }

    try {
      const q = await getDocs(
        query(collection(db, "Asset_Categories"), where("Category_Name", "==", oldName))
      );

      if (!q.empty) {
        const docRef = doc(db, "Asset_Categories", q.docs[0].id);
        await updateDoc(docRef, { Category_Name: newName.trim() });

        setCategories(prev =>
          prev.map(cat => (cat === oldName ? newName.trim() : cat))
        );
        return true;
      } else {
        alert("Category not found in database.");
        return false;
      }
    } catch (err) {
      console.error("Failed to edit category:", err);
      alert("Failed to update category.");
      return false;
    }
  };

  // 🔥 Delete category
  const deleteCategory = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return false;
    }

    try {
      const q = await getDocs(
        query(collection(db, "Asset_Categories"), where("Category_Name", "==", name))
      );

      if (!q.empty) {
        const docRef = doc(db, "Asset_Categories", q.docs[0].id);
        await deleteDoc(docRef);

        setCategories(prev => prev.filter(cat => cat !== name));
        return true;
      } else {
        alert("Category not found in database.");
        return false;
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("Failed to delete category.");
      return false;
    }
  };

  // 🔥 Handle edit UI
  const handleEditCategory = (cat: string) => {
    const newName = prompt("Edit category name:", cat);
    if (newName && newName.trim() !== "") {
      editCategory(cat, newName);
    }
    setCategoryToDelete(null);
  };

  // 🔥 Filtering logic
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
      <div className="header-with-button">
        <h2>Supply Unit Asset Data</h2>
        <div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="add-category-btn"
          >
            + Add Category
          </button>
          <button
            onClick={() => setShowViewCategoriesModal(true)}
            className="view-category-btn"
          >
            View All Categories
          </button>
        </div>
      </div>

      {/* Modal for Adding Category */}
      {showCategoryModal && (
        <div className="modal-overlays-admin">
          <div className="modal-content-admin">
            <h3>Add New Category</h3>
            <input
              type="text"
              placeholder="Enter new category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNewCategory(newCategory)}
            />
            <div className="modal-buttons-admin">
              <button
                className="add-admin"
                onClick={async () => {
                  if (await addNewCategory(newCategory)) {
                    setNewCategory("");
                    setShowCategoryModal(false);
                  }
                }}
                disabled={!newCategory.trim() || categories.includes(newCategory.trim())}
              >
                Add
              </button>
              <button
                className="cls-btn-admins"
                onClick={() => setShowCategoryModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Viewing All Categories */}
      {showViewCategoriesModal && (
        <div className="modal-overlays-adminss">
          <div className="modal-content-adminss">
            <h3>All Categories</h3>
            <ul className="category-list">
              {categories.map((cat, index) => (
                <li key={index} className="category-item">
                  <span>{cat}</span>
                  <div className="dropdown-wrapper">
                    <div
                      className="dropdown-menu-trigger"
                      onClick={() =>
                        setCategoryToDelete(categoryToDelete === cat ? null : cat)
                      }
                    >
                      ⋮
                    </div>
                    {categoryToDelete === cat && (
                      <div className="dropdown-options">
                        <button
                          className="dropdown-btn edit"
                          onClick={() => handleEditCategory(cat)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="dropdown-btn delete"
                          onClick={() => deleteCategory(cat)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="modal-buttons-admins">
              <button
                className="cls-btn-admins"
                onClick={() => setShowViewCategoriesModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="dropdown">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={loadingCategories}
          >
            <option value="">-- Select Category --</option>
            {loadingCategories ? (
              <option disabled>Loading...</option>
            ) : (
              categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="dropdown">
          <label>Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">-- Select Status --</option>
            {statuses.map((status, index) => (
              <option key={index} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">-- Select Month --</option>
            {months.map((month, index) => (
              <option key={index} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="dropdown">
          <label>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">-- Select Year --</option>
            {years.map((year, index) => (
              <option key={index} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
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
              {filteredData.map((item) => (
                <tr key={item.id}>
                  <td
                    className="clickable"
                    onClick={() => handleItemClick(item)}
                  >
                    {item.name}
                  </td>
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

      {/* Item History Modal */}
      {showModal && (
        <div className="modal-overlays">
          <div className="modal-contented">
            <h3>Item Repair History</h3>
            <button
              className="cls-btn"
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
            {selectedItemHistory.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Issue</th>
                    <th>Site of Action</th>
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