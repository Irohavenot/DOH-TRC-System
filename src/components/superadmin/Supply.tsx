import React, { useState, useEffect, useMemo } from 'react';
import "../../superadmincss/supply.css";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import AssetDetailsModal from '../assetmanagement/AssetDetailsModal';
import HistoryModal from '../assetmanagement/HistoryModal';
import EditAssetModal from '../assetmanagement/EditAssetModal';
import ReportAssetModal from '../assetmanagement/ReportAssetModal';
import QRModal from '../assetmanagement/QRModal';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);

interface HistoryEntry {
  changedAt?: any;
  changedBy?: string;
  from?: string;
  to?: string;
  reason?: string;
  maintainedBy?: string;
}

interface Asset {
  id: string;
  assetName: string;
  category: string;
  status: string;
  serialNo: string;
  purchaseDate?: string;
  renewdate?: string;
  licenseType?: string;
  subType?: string;
  personnel?: string;
  assetUrl?: string;
  qrcode?: string | null;
  generateQR?: boolean;
  image?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
  assetHistory?: HistoryEntry[];
  hasReports?: boolean;
  reportCount?: number;
}

interface Category {
  id: string;
  name: string;
  createdAt?: any;
  createdBy?: string;
}

interface Status {
  id: string;
  name: string;
  createdAt?: any;
  createdBy?: string;
}

type ViewMode = 'assets' | 'categories' | 'statuses';

const SupplyUnit: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [reportingAsset, setReportingAsset] = useState<{ id: string; docId: string; name: string } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<{ id: string; name: string; history: any[] } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [currentUserDocId, setCurrentUserDocId] = useState<string | null>(null);
  const [emailToNameMap, setEmailToNameMap] = useState<Record<string, string>>({});
  const [uidToNameMap, setUidToNameMap] = useState<Record<string, string>>({});
  const [reportedAssets, setReportedAssets] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(false);
  const [qrAsset, setQrAsset] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const openQR = (asset: any) => {
    setQrAsset(asset);
    setShowQR(true);
  };

  const handleEdit = (idx: number) => {
    const asset = filteredAssets[idx];
    if (!asset) return;
    setEditingAsset({
      docId: asset.id,
      assetId: asset.id,
      assetName: asset.assetName,
      assetUrl: asset.assetUrl,
      category: asset.category,
      subType: asset.subType,
      licenseType: asset.licenseType,
      personnel: asset.personnel,
      purchaseDate: asset.purchaseDate,
      renewdate: asset.renewdate,
      serialNo: asset.serialNo,
      status: asset.status,
      qrcode: asset.qrcode,
      generateQR: asset.generateQR,
      image: asset.image,
      createdBy: asset.createdBy,
      createdAt: asset.createdAt,
      updatedBy: asset.updatedBy,
      updatedAt: asset.updatedAt,
      assetHistory: asset.assetHistory,
    });
    setEditModalOpen(true);
  };

  // Fetch current user's document ID from IT_Supply_Users
  useEffect(() => {
    const fetchCurrentUserDocIdByEmail = async () => {
      const currentEmail = auth.currentUser?.email;
      if (!currentEmail) {
        console.log("No authenticated user email found");
        setCurrentUserDocId(null);
        return;
      }
      try {
        const usersRef = collection(db, "IT_Supply_Users");
        const q = query(usersRef, where("Email", "==", currentEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          setCurrentUserDocId(userDoc.id);
        } else {
          setCurrentUserDocId(null);
        }
      } catch (error) {
        console.error("Error fetching user doc by email:", error);
        setCurrentUserDocId(null);
      }
    };
    fetchCurrentUserDocIdByEmail();
  }, []);

  // Fetch users for name mapping
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "IT_Supply_Users"),
      (snap) => {
        const emap: Record<string, string> = {};
        const umap: Record<string, string> = {};
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
          const e1 = data.Email?.trim().toLowerCase();
          const e2 = data.email?.trim().toLowerCase();
          if (e1) emap[e1] = fullName;
          if (e2 && e2 !== e1) emap[e2] = fullName;
        });
        setEmailToNameMap(emap);
        setUidToNameMap(umap);
      },
      (err) => console.error("Failed to fetch IT_Supply_Users:", err)
    );
    return () => unsub();
  }, []);

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
        setAssets(prev => prev.map(asset => ({
          ...asset,
          hasReports: reported.has(asset.id),
          reportCount: reportCounts[asset.id] || 0
        })));
      },
      (err) => console.error("Error fetching reports:", err)
    );
    return () => unsub();
  }, []);

  // Fetch categories from Firestore
  useEffect(() => {
    const q = query(collection(db, "Asset_Categories"), orderBy("Category_Name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Category[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().Category_Name,
          createdAt: d.data().createdAt,
          createdBy: d.data().createdBy,
        }));
        setCategories(list);
        setLoadingCategories(false);
      },
      (err) => {
        console.error("Error fetching categories:", err);
        alert("Failed to load categories.");
        setLoadingCategories(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch statuses from Firestore
  useEffect(() => {
    const q = query(collection(db, "Asset_Status"), orderBy("Status_Name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Status[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().Status_Name,
          createdAt: d.data().createdAt,
          createdBy: d.data().createdBy,
        }));
        setStatuses(list);
        setLoadingStatuses(false);
      },
      (err) => {
        console.error("Error fetching statuses:", err);
        alert("Failed to load statuses.");
        setLoadingStatuses(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch assets from Firestore
  useEffect(() => {
    setLoadingAssets(true);
    const qRef = query(collection(db, "IT_Assets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const assetsData = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Asset));
        setAssets(assetsData);
        setLoadingAssets(false);
      },
      (err) => {
        console.error("Error fetching IT_Assets:", err);
        setLoadingAssets(false);
      }
    );
    return () => unsub();
  }, []);

  // Add new category
  const addNewCategory = async (name: string) => {
    if (!name.trim()) {
      alert("Category name cannot be empty.");
      return false;
    }
    if (categories.some((cat) => cat.name === name.trim())) {
      alert("Category already exists.");
      return false;
    }
    if (!currentUserDocId) {
      alert("User information not available.");
      return false;
    }
    try {
      await addDoc(collection(db, "Asset_Categories"), {
        Category_Name: name.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUserDocId,
      });
      return true;
    } catch (err) {
      console.error("Failed to add category:", err);
      alert("Failed to add category.");
      return false;
    }
  };

  // Edit category
  const editCategory = async (id: string, newName: string) => {
    if (!newName.trim()) {
      alert("New name cannot be empty.");
      return false;
    }
    if (categories.some((cat) => cat.name === newName.trim() && cat.id !== id)) {
      alert("A category with that name already exists.");
      return false;
    }
    try {
      const docRef = doc(db, "Asset_Categories", id);
      await updateDoc(docRef, { Category_Name: newName.trim() });
      return true;
    } catch (err) {
      console.error("Failed to edit category:", err);
      alert("Failed to update category.");
      return false;
    }
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this category?`)) {
      return false;
    }
    try {
      const docRef = doc(db, "Asset_Categories", id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("Failed to delete category.");
      return false;
    }
  };

  // Add new status
  const addNewStatus = async (name: string) => {
    if (!name.trim()) {
      alert("Status name cannot be empty.");
      return false;
    }
    if (statuses.some((stat) => stat.name === name.trim())) {
      alert("Status already exists.");
      return false;
    }
    if (!currentUserDocId) {
      alert("User information not available.");
      return false;
    }
    try {
      await addDoc(collection(db, "Asset_Status"), {
        Status_Name: name.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUserDocId,
      });
      return true;
    } catch (err) {
      console.error("Failed to add status:", err);
      alert("Failed to add status.");
      return false;
    }
  };

  // Edit status
  const editStatus = async (id: string, newName: string) => {
    if (!newName.trim()) {
      alert("New name cannot be empty.");
      return false;
    }
    if (statuses.some((stat) => stat.name === newName.trim() && stat.id !== id)) {
      alert("A status with that name already exists.");
      return false;
    }
    try {
      const docRef = doc(db, "Asset_Status", id);
      await updateDoc(docRef, { Status_Name: newName.trim() });
      return true;
    } catch (err) {
      console.error("Failed to edit status:", err);
      alert("Failed to update status.");
      return false;
    }
  };

  // Delete status
  const deleteStatus = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this status?`)) {
      return false;
    }
    try {
      const docRef = doc(db, "Asset_Status", id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Failed to delete status:", err);
      alert("Failed to delete status.");
      return false;
    }
  };

  const computeBadge = (licenseType?: string, renewdate?: string) => {
    if (licenseType && NON_EXPIRING.has(licenseType)) return { iconClass: 'icon-blue' as const, timeLeft: 'No Expiration' };
    if (!renewdate) return { iconClass: 'icon-orange' as const, timeLeft: 'No Expiration Date' };
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const exp = new Date(renewdate).getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((exp - startOfToday) / MS_PER_DAY);
    if (daysLeft < 0) return { iconClass: 'icon-red' as const, timeLeft: `Expired ${Math.abs(daysLeft)} day(s) ago` };
    if (daysLeft === 0) return { iconClass: 'icon-orange' as const, timeLeft: 'Expires today' };
    if (daysLeft <= 30) return { iconClass: 'icon-orange' as const, timeLeft: `${daysLeft} day(s) left` };
    if (daysLeft <= 90) return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 7)} week(s) left` };
    return { iconClass: 'icon-green' as const, timeLeft: `${Math.ceil(daysLeft / 30)} month(s) left` };
  };

  const filteredAssets = useMemo(() => {
    let result = [...assets];
    if (selectedCategory) {
      result = result.filter(asset => asset.category === selectedCategory);
    }
    if (selectedStatus) {
      result = result.filter(asset => asset.status === selectedStatus);
    }
    if (selectedMonth || selectedYear) {
      result = result.filter(asset => {
        if (!asset.purchaseDate) return false;
        const date = new Date(asset.purchaseDate);
        const assetMonth = months[date.getMonth()];
        const assetYear = date.getFullYear().toString();
        const monthMatch = !selectedMonth || assetMonth === selectedMonth;
        const yearMatch = !selectedYear || assetYear === selectedYear;
        return monthMatch && yearMatch;
      });
    }
    return result;
  }, [assets, selectedCategory, selectedStatus, selectedMonth, selectedYear]);

  const getMappedAsset = (asset: Asset) => {
    const personnelId = asset.personnel || '';
    const personnelName = uidToNameMap[personnelId] || personnelId || 'N/A';
    const createdBy = asset.createdBy ? (emailToNameMap[asset.createdBy.toLowerCase()] || uidToNameMap[asset.createdBy] || asset.createdBy) : 'N/A';
    const updatedBy = asset.updatedBy ? (emailToNameMap[asset.updatedBy.toLowerCase()] || uidToNameMap[asset.updatedBy] || asset.updatedBy) : 'N/A';
    return {
      id: asset.id,
      title: asset.assetName,
      team: asset.category,
      timeLeft: computeBadge(asset.licenseType, asset.renewdate).timeLeft,
      serial: asset.serialNo,
      image: asset.image,
      assetId: asset.id,
      assetUrl: asset.assetUrl,
      qrcode: asset.qrcode,
      personnel: personnelName,
      personnelId: personnelId,
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A',
      status: asset.status,
      licenseType: asset.licenseType,
      subType: asset.subType,
      createdAt: asset.createdAt ? new Date(asset.createdAt.toDate()).toLocaleString() : 'N/A',
      createdBy: createdBy,
      updatedAt: asset.updatedAt ? new Date(asset.updatedAt.toDate()).toLocaleString() : 'N/A',
      updatedBy: updatedBy,
      renewdate: asset.renewdate ? new Date(asset.renewdate).toLocaleDateString() : 'N/A',
      assetHistory: asset.assetHistory,
      hasReports: asset.hasReports,
      reportCount: asset.reportCount,
    };
  };

  return (
    <div className="supply-admin-container">
      <div className="supply-admin-header">
        <h2 className="supply-admin-title">Supply Unit Management</h2>
        <div className="supply-admin-nav-buttons">
          <button
            onClick={() => setViewMode('assets')}
            className={`supply-admin-nav-btn ${viewMode === 'assets' ? 'supply-admin-nav-btn-active' : ''}`}
          >
            <i className="fas fa-box"></i> View Assets
          </button>
          <button
            onClick={() => setViewMode('categories')}
            className={`supply-admin-nav-btn ${viewMode === 'categories' ? 'supply-admin-nav-btn-active' : ''}`}
          >
            <i className="fas fa-tags"></i> Manage Categories
          </button>
          <button
            onClick={() => setViewMode('statuses')}
            className={`supply-admin-nav-btn ${viewMode === 'statuses' ? 'supply-admin-nav-btn-active' : ''}`}
          >
            <i className="fas fa-list-check"></i> Manage Statuses
          </button>
        </div>
      </div>

      {viewMode === 'assets' && (
        <>
          {/* Filters */}
          <div className="supply-admin-filters">
            <div className="supply-admin-filter-group">
              <label className="supply-admin-label">Category:</label>
              <select
                className="supply-admin-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={loadingCategories}
              >
                <option value="">-- All Categories --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="supply-admin-filter-group">
              <label className="supply-admin-label">Status:</label>
              <select
                className="supply-admin-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={loadingStatuses}
              >
                <option value="">-- All Statuses --</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.name}>{status.name}</option>
                ))}
              </select>
            </div>
            <div className="supply-admin-filter-group">
              <label className="supply-admin-label">Month:</label>
              <select
                className="supply-admin-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">-- All Months --</option>
                {months.map((month, index) => (
                  <option key={index} value={month}>{month}</option>
                ))}
              </select>
            </div>
            <div className="supply-admin-filter-group">
              <label className="supply-admin-label">Year:</label>
              <select
                className="supply-admin-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">-- All Years --</option>
                {years.map((year, index) => (
                  <option key={index} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtered Assets Display */}
          <div className="supply-admin-section">
            <div className="supply-admin-section-header">
              <h3 className="supply-admin-section-title">
                <i className="fas fa-filter"></i> Filtered Assets
                <span className="supply-admin-badge">{filteredAssets.length}</span>
              </h3>
            </div>
            {loadingAssets ? (
              <div className="supply-admin-loading">
                <div className="supply-admin-spinner"></div>
                <p>Loading assets...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="supply-admin-empty">
                <i className="fas fa-inbox"></i>
                <p>No assets match the selected filters.</p>
              </div>
            ) : (
              <div className="supply-admin-table-wrapper">
                <table className="supply-admin-table">
                  <thead>
                    <tr>
                      <th>Asset Name</th>
                      <th>Created At</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Purchase Date</th>
                      <th>Personnel</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset, index) => {
                      const personnelName = asset.personnel ? uidToNameMap[asset.personnel] || asset.personnel : 'N/A';
                      const createdByName = asset.createdBy ? (emailToNameMap[asset.createdBy.toLowerCase()] || uidToNameMap[asset.createdBy] || asset.createdBy) : 'N/A';
                      return (
                        <tr key={asset.id}>
                          <td>
                            <div className="supply-admin-asset-name">
                              {asset.hasReports && (
                                <span className="supply-admin-report-badge" title={`${asset.reportCount} report(s)`}>
                                  <i className="fas fa-exclamation-triangle"></i>
                                </span>
                              )}
                              {asset.assetName || 'N/A'}
                            </div>
                          </td>
                          <td>{asset.createdAt ? new Date(asset.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                          <td><span className="supply-admin-category-badge">{asset.category || 'N/A'}</span></td>
                          <td>{asset.subType || 'N/A'}</td>
                          <td><span className="supply-admin-status-badge">{asset.status || 'N/A'}</span></td>
                          <td>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}</td>
                          <td>{personnelName}</td>
                          <td>{createdByName}</td>
                          <td>
                            <button
                              className="supply-admin-action-btn supply-admin-view-btn"
                              onClick={() => setSelectedAsset(getMappedAsset(asset))}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === 'categories' && (
        <div className="supply-admin-section">
          <div className="supply-admin-section-header">
            <h3 className="supply-admin-section-title">
              <i className="fas fa-tags"></i> All Categories
              <span className="supply-admin-badge">{categories.length}</span>
            </h3>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="supply-admin-add-btn"
            >
              <i className="fas fa-plus"></i> Add Category
            </button>
          </div>
          
          {loadingCategories ? (
            <div className="supply-admin-loading">
              <div className="supply-admin-spinner"></div>
              <p>Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="supply-admin-empty">
              <i className="fas fa-inbox"></i>
              <p>No categories found.</p>
            </div>
          ) : (
            <div className="supply-admin-table-wrapper">
              <table className="supply-admin-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td><strong>{cat.name}</strong></td>
                      <td>{uidToNameMap[cat.createdBy || ''] || 'Unknown'}</td>
                      <td>{cat.createdAt ? new Date(cat.createdAt.toDate()).toLocaleString() : 'N/A'}</td>
                      <td>
                        <div className="supply-admin-action-group">
                          <button
                            className="supply-admin-action-btn supply-admin-edit-btn"
                            onClick={() => {
                              const newName = prompt("Edit category name:", cat.name);
                              if (newName) editCategory(cat.id, newName);
                            }}
                            title="Edit Category"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="supply-admin-action-btn supply-admin-delete-btn"
                            onClick={() => deleteCategory(cat.id)}
                            title="Delete Category"
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === 'statuses' && (
        <div className="supply-admin-section">
          <div className="supply-admin-section-header">
            <h3 className="supply-admin-section-title">
              <i className="fas fa-list-check"></i> All Statuses
              <span className="supply-admin-badge">{statuses.length}</span>
            </h3>
            <button
              onClick={() => setShowStatusModal(true)}
              className="supply-admin-add-btn"
            >
              <i className="fas fa-plus"></i> Add Status
            </button>
          </div>
          
          {loadingStatuses ? (
            <div className="supply-admin-loading">
              <div className="supply-admin-spinner"></div>
              <p>Loading statuses...</p>
            </div>
          ) : statuses.length === 0 ? (
            <div className="supply-admin-empty">
              <i className="fas fa-inbox"></i>
              <p>No statuses found.</p>
            </div>
          ) : (
            <div className="supply-admin-table-wrapper">
              <table className="supply-admin-table">
                <thead>
                  <tr>
                    <th>Status Name</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((stat) => (
                    <tr key={stat.id}>
                      <td><strong>{stat.name}</strong></td>
                      <td>{uidToNameMap[stat.createdBy || ''] || 'Unknown'}</td>
                      <td>{stat.createdAt ? new Date(stat.createdAt.toDate()).toLocaleString() : 'N/A'}</td>
                      <td>
                        <div className="supply-admin-action-group">
                          <button
                            className="supply-admin-action-btn supply-admin-edit-btn"
                            onClick={() => {
                              const newName = prompt("Edit status name:", stat.name);
                              if (newName) editStatus(stat.id, newName);
                            }}
                            title="Edit Status"
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            className="supply-admin-action-btn supply-admin-delete-btn"
                            onClick={() => deleteStatus(stat.id)}
                            title="Delete Status"
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="supply-admin-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="supply-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="supply-admin-modal-header">
              <h3><i className="fas fa-tag"></i> Add New Category</h3>
              <button 
                className="supply-admin-modal-close" 
                onClick={() => setShowCategoryModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="supply-admin-modal-body">
              <input
                type="text"
                className="supply-admin-input"
                placeholder="Enter category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addNewCategory(newCategory).then(success => {
                      if (success) {
                        setNewCategory("");
                        setShowCategoryModal(false);
                      }
                    });
                  }
                }}
              />
            </div>
            <div className="supply-admin-modal-footer">
              <button
                className="supply-admin-modal-btn supply-admin-modal-btn-primary"
                onClick={async () => {
                  if (await addNewCategory(newCategory)) {
                    setNewCategory("");
                    setShowCategoryModal(false);
                  }
                }}
              >
                <i className="fas fa-plus"></i> Add Category
              </button>
              <button
                className="supply-admin-modal-btn supply-admin-modal-btn-secondary"
                onClick={() => setShowCategoryModal(false)}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Status Modal */}
      {showStatusModal && (
        <div className="supply-admin-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="supply-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="supply-admin-modal-header">
              <h3><i className="fas fa-circle-check"></i> Add New Status</h3>
              <button 
                className="supply-admin-modal-close" 
                onClick={() => setShowStatusModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="supply-admin-modal-body">
              <input
                type="text"
                className="supply-admin-input"
                placeholder="Enter status name"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addNewStatus(newStatus).then(success => {
                      if (success) {
                        setNewStatus("");
                        setShowStatusModal(false);
                      }
                    });
                  }
                }}
              />
            </div>
            <div className="supply-admin-modal-footer">
              <button
                className="supply-admin-modal-btn supply-admin-modal-btn-primary"
                onClick={async () => {
                  if (await addNewStatus(newStatus)) {
                    setNewStatus("");
                    setShowStatusModal(false);
                  }
                }}
              >
                <i className="fas fa-plus"></i> Add Status
              </button>
              <button
                className="supply-admin-modal-btn supply-admin-modal-btn-secondary"
                onClick={() => setShowStatusModal(false)}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AssetDetailsModal
        isOpen={!!selectedAsset}
        onClose={() => {
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
        onViewQR={openQR}
        onEdit={() => {
          const idx = filteredAssets.findIndex(c => c.id === selectedAsset?.id);
          if (idx >= 0) handleEdit(idx);
        }}
        onReport={() => {
          if (selectedAsset) {
            setReportingAsset({
              id: selectedAsset.id,
              docId: selectedAsset.id,
              name: selectedAsset.title,
            });
            setReportModalOpen(true);
          }
        }}
        onViewHistory={(history, assetName, assetId) => {
          setHistoryAsset({ id: assetId, name: assetName, history });
          setShowHistoryModal(true);
        }}
        currentUserDocId={null}
        isAdminView={true}
      />

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
          setSelectedAsset(null);
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

export default SupplyUnit;