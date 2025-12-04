import React, { useEffect, useMemo, useState } from 'react';
import "../../assets/assetmanagement.css";
import Fuse from "fuse.js";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { db, auth } from '../../firebase/firebase';
import AssetDetailsModal from './AssetDetailsModal';
import {
  collection,
  query as fsQuery,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc,
  where
} from 'firebase/firestore';
import QRModal from './QRModal';
import { toast } from 'react-toastify';
import HistoryModal from './HistoryModal';
import EditAssetModal from './EditAssetModal';
import ReportAssetModal from './ReportAssetModal';
import BulkQRPrint from './BulkQRPrint'; 
import { useSearch } from "../../context/SearchContext";

const NON_EXPIRING = new Set(['Perpetual', 'OEM', 'Open Source']);
const currentUserUID = auth.currentUser?.uid;

type FilterKey = 'all' | 'permanent' | 'normal' | 'aboutToExpire' | 'expired';
type CategoryFilterKey = 'all' | 'Asset' | 'License' | 'Accessory' | 'Component';

interface HistoryEntry {
  changedAt?: any;
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
   propertyNo?: string;
  personnelId?: string;
  purchaseDate?: string;
  status?: string;
  licenseType?: string;
  subType?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  renewdate?: string;
  assetHistory?: HistoryEntry[];
  hasReports?: boolean;
  reportCount?: number;
    _matches?: any[];
}

const AssetManagement: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterKey>('all');
  const [showMyAssets, setShowMyAssets] = useState(false);
  const [showReported, setShowReported] = useState(false);
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
  const [reportedAssets, setReportedAssets] = useState<Set<string>>(new Set());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<{ id: string; name: string; history: HistoryEntry[] } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingAsset, setReportingAsset] = useState<{ id: string; docId: string; name: string } | null>(null);
  const [currentUserDocId, setCurrentUserDocId] = useState<string | null>(null);
  const [showBulkQR, setShowBulkQR] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [assetStatusFilter, setAssetStatusFilter] = useState("all");
  const { query, debouncedQuery } = useSearch();




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
        const q = fsQuery(usersRef, where("Email", "==", currentEmail));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          setCurrentUserDocId(userDoc.id);
          console.log("Matched userDocId via email:", userDoc.id, "for email:", currentEmail);
        } else {
          console.warn("No IT_Supply_Users document matches email:", currentEmail);
          setCurrentUserDocId(null);
        }
      } catch (error) {
        console.error("Error fetching user doc by email:", error);
        setCurrentUserDocId(null);
      }
    };

    fetchCurrentUserDocIdByEmail();
  }, []);


//Fetch reported assets
useEffect(() => {
  const reportsRef = collection(db, "Reported_Issues");
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
      
      // Update rawAssets to include report information
      setRawAssets(prev => prev.map(asset => ({
        ...asset,
        hasReports: reported.has(asset.id),
        reportCount: reportCounts[asset.id] || 0
      })));
    },
    (err) => console.error("Error fetching reports:", err)
  );
  return () => unsub();
}, []); 

  // Fetch assets
  useEffect(() => {
    setLoading(true);
    const qRef = fsQuery(collection(db, "IT_Assets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const assets = snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data(),
          hasReports: reportedAssets.has(d.id)
        }));
        setRawAssets(assets);
        setLoading(false);
      },
      (err) => { console.error("Error fetching IT_Assets:", err); setLoading(false); }
    );
    return () => unsub();
  }, [reportedAssets]);

  // Fetch users
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

  // Fetch categories
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

  // Fetch statuses
  useEffect(() => {
  (async () => {
    try {
      const snapshot = await getDocs(collection(db, "Asset_Status"));
      const list: string[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.Status_Name) list.push(data.Status_Name);
      });
      list.sort();
      setStatuses(list);
    } catch (e) {
      console.error("Error fetching statuses:", e);
    }
  })();
}, []);

  // Debug: Check assets personnel fields
  useEffect(() => {
    const checkAssets = async () => {
      const snapshot = await getDocs(collection(db, "IT_Assets"));
      snapshot.forEach(doc => {
        console.log("Asset:", doc.id, "Personnel:", doc.data().personnel);
      });
    };
    checkAssets();
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

// In your AssetManagement.tsx, find the cards useMemo and update it:

const cards = useMemo(() => rawAssets.map((d: any) => {
  console.log("Asset personnel:", d.id, d.personnel);

        let personnelName: string | undefined = undefined;

      // If asset has assigned personnel
      if (d.personnel) {
        if (uidToNameMap[d.personnel]) {
          // user exists in users list → normal
          personnelName = uidToNameMap[d.personnel];
        } else {
          // user was deleted or disabled → fallback
          personnelName = "(Unassigned / User Removed)";
        }
      }

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
    personnelId: d.personnel,
    propertyNo: d.propertyNo || undefined,  // ✅ ADD THIS LINE
    purchaseDate: d.purchaseDate || undefined,
    status: d.status || undefined,
    licenseType: d.licenseType || undefined,
    subType: d.subType || undefined,
    createdAt: d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleString() : (d.createdAt || undefined),
    createdBy: createdByName,
    updatedAt: d.updatedAt?.toDate ? new Date(d.updatedAt.toDate()).toLocaleString() : (d.updatedAt || undefined),
    updatedBy: updatedByName,
    renewdate: d.renewdate?.toDate ? new Date(d.renewdate.toDate()).toLocaleDateString() : (d.renewdate || undefined),
    assetHistory: d.assetHistory || [],
    hasReports: d.hasReports || false,
    reportCount: d.reportCount || 0,
  } as Card;
}), [rawAssets, uidToNameMap, emailToNameMap]);
const fuse = useMemo(() => {
  return new Fuse(cards, {
    keys: [
      { name: "title", weight: 0.45 },
      { name: "serial", weight: 0.25 },
      { name: "personnel", weight: 0.15 },
      { name: "team", weight: 0.10 },
      { name: "status", weight: 0.05 },
    ],
    threshold: 0.4,          // typo tolerance (lower = stricter)
    includeMatches: true,    // needed for highlighting
    minMatchCharLength: 2,
  });
}, [cards]);
function highlightText(text: string, matches?: any[]) {
  if (!matches || matches.length === 0) return text;

  // Collect and merge overlapping indices for cleaner highlights
  const allIndices: [number, number][] = [];
  
  matches.forEach(m => {
    if (m.indices) {
      m.indices.forEach(([start, end]: [number, number]) => {
        allIndices.push([start, end]);
      });
    }
  });

  if (allIndices.length === 0) return text;

  // Sort by start position
  allIndices.sort((a, b) => a[0] - b[0]);

  // Merge overlapping or adjacent ranges
  const merged: [number, number][] = [];
  let current = allIndices[0];

  for (let i = 1; i < allIndices.length; i++) {
    const [curStart, curEnd] = current;
    const [nextStart, nextEnd] = allIndices[i];

    // Merge if overlapping or adjacent (within 1 char)
    if (nextStart <= curEnd + 1) {
      current = [curStart, Math.max(curEnd, nextEnd)];
    } else {
      merged.push(current);
      current = allIndices[i];
    }
  }
  merged.push(current);

  // Build highlighted string
  let result = "";
  let lastIndex = 0;

  merged.forEach(([start, end]) => {
    result += text.substring(lastIndex, start);
    result += `<span class="highlight-match">${text.substring(start, end + 1)}</span>`;
    lastIndex = end + 1;
  });

  result += text.substring(lastIndex);
  return result;
}

const filteredCards = useMemo(() => {
  let result = [...cards];

  // 1. 🔍 SEARCH FIRST
  if (debouncedQuery.trim() !== "") {
    const results = fuse.search(debouncedQuery).map(r => ({
      ...r.item,
      _matches: r.matches ? [...r.matches] : undefined
    }));
    result = results;
  }

  // 2. 📂 CATEGORY FILTER
  if (categoryFilter !== "all") {
    result = result.filter((card) => card.team === categoryFilter);
  }

  // 3. 🔖 STATUS BADGE FILTER (permanent / normal / expired / etc)
  if (statusFilter !== "all") {
    result = result.filter((card) => {
      switch (statusFilter) {
        case "permanent":
          return card.iconClass === "icon-blue";
        case "normal":
          return card.iconClass === "icon-green";
        case "aboutToExpire":
          return card.iconClass === "icon-orange";
        case "expired":
          return card.iconClass === "icon-red";
        default:
          return true;
      }
    });
  }

  // 4. 🏷 Asset Status Filter (Functional / Defective / etc)
  if (assetStatusFilter !== "all") {
    result = result.filter((card) => card.status === assetStatusFilter);
  }

  // 5. 👤 My Assets
  if (showMyAssets && currentUserDocId) {
    result = result.filter((card) => card.personnelId === currentUserDocId);
  }

  // 6. ⚠ Show Reported Only - FIX: Check hasReports property
  if (showReported) {
    result = result.filter((card) => card.hasReports === true);
  }

  return result;
}, [
  cards,
  debouncedQuery,
  fuse, // Add fuse as dependency
  categoryFilter,
  statusFilter,
  assetStatusFilter,
  showMyAssets,
  showReported,
  currentUserDocId,
]);



const counts = useMemo(() => {
  let permanent = 0, normal = 0, aboutToExpire = 0, expired = 0, myAssets = 0, reported = 0;
  
  for (const c of cards) {
    if (c.iconClass === 'icon-blue') permanent++;
    else if (c.iconClass === 'icon-green') normal++;
    else if (c.iconClass === 'icon-orange') aboutToExpire++;
    else if (c.iconClass === 'icon-red') expired++;
    
    if (currentUserDocId && c.personnelId === currentUserDocId) myAssets++;
    if (c.hasReports) reported++;
  }
  return { permanent, normal, aboutToExpire, expired, myAssets, reported };
}, [cards, currentUserDocId]); // Remove 'query' dependency


  const handleCardOptionsToggle = (index: number) => setOpenCardOptionsId(prev => (prev === index ? null : index));

  const handleEditCard = (index: number) => {
    const card = filteredCards[index];
    if (!card) return;
    
    const rawAsset = rawAssets.find(a => a.id === card.id);
    if (!rawAsset) return;

    setEditingAsset({
      docId: rawAsset.id,
      assetId: rawAsset.assetId,
      assetName: rawAsset.assetName,
      assetUrl: rawAsset.assetUrl,
      category: rawAsset.category,
      subType: rawAsset.subType,
      licenseType: rawAsset.licenseType,
      personnel: rawAsset.personnel,
      purchaseDate: rawAsset.purchaseDate,
      renewdate: rawAsset.renewdate,
      serialNo: rawAsset.serialNo,
      status: rawAsset.status,
      qrcode: rawAsset.qrcode,
      generateQR: rawAsset.generateQR,
      image: rawAsset.image,
      createdBy: rawAsset.createdBy,
      createdAt: rawAsset.createdAt,
      updatedBy: rawAsset.updatedBy,
      updatedAt: rawAsset.updatedAt,
      assetHistory: rawAsset.assetHistory,
    });
    
    setEditModalOpen(true);
    setOpenCardOptionsId(null);
  };

  const getCurrentUserFullName = (): string => {
    if (currentUserDocId && uidToNameMap[currentUserDocId]) {
      return uidToNameMap[currentUserDocId];
    }
    return auth.currentUser?.email || 'Unknown User';
  };

  const handleDeleteCard = async (index: number) => {
    const card = filteredCards[index];
    if (!card) {
      toast.error("Card not found.");
      console.error("Delete failed: Card not found at index", index);
      return;
    }

    const warningMessage = 
      `⚠️ WARNING: You will be held accountable for the deletion of this asset.\n\n` +
      `Asset: "${card.title}" (Serial: ${card.serial})\n` +
      `Category: ${card.team}\n\n` +
      `Are you absolutely sure you want to delete this asset? This action cannot be undone.`;

    if (!window.confirm(warningMessage)) return;

    try {
      console.log("Starting delete process for asset:", card.id);
      
      const assetRef = doc(db, "IT_Assets", card.id);
      
      const deletedBy = getCurrentUserFullName();
      const deletedByEmail = auth.currentUser?.email || '';
      const deletedAt = new Date().toISOString();

      console.log("Creating audit record...", {
        deletedBy,
        deletedByEmail,
        assetName: card.title
      });

      const auditRecord = {
        assetId: card.assetId || '',
        assetName: card.title || '',
        assetUrl: card.assetUrl || '',
        category: card.team || '',
        subType: card.subType || '',
        licenseType: card.licenseType || '',
        personnel: card.personnelId || '',
        personnelName: card.personnel || '',
        purchaseDate: card.purchaseDate || '',
        renewdate: card.renewdate || '',
        serialNo: card.serial || '',
        status: card.status || '',
        qrcode: card.qrcode || null,
        generateQR: card.generateQR || false,
        image: card.image || '',
        createdBy: card.createdBy || '',
        createdAt: card.createdAt || '',
        updatedBy: card.updatedBy || '',
        updatedAt: card.updatedAt || '',
        assetHistory: card.assetHistory || [],
        hasReports: card.hasReports || false,
        reportCount: card.reportCount || 0,
        deletedAt,
        deletedBy,
        deletedByEmail,
        deletionReason: 'User-initiated deletion from Asset Management',
        originalId: card.id,
        
      };

      const deletedDocRef = await addDoc(collection(db, "Deleted_Assets"), auditRecord);
      console.log("Audit record created:", deletedDocRef.id);
      
      await deleteDoc(assetRef);
      console.log("Asset deleted from IT_Assets:", card.id);
      
      toast.success('Asset deleted and archived successfully');
      setOpenCardOptionsId(null);
    } catch (err: any) {
      console.error('❌ Delete failed:', err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      let errorMessage = "Failed to delete asset.";
      if (err.code === 'permission-denied') {
        errorMessage = "Permission denied. You don't have access to delete this asset.";
      } else if (err.code === 'not-found') {
        errorMessage = "Asset not found. It may have already been deleted.";
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      toast.error(errorMessage);
    }
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

  const clearAllFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setShowMyAssets(false);
    setShowReported(false);
  };

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || showMyAssets || showReported;

  const shouldShowSubType = (category?: string) => {
    if (!category) return false;
    const cat = category.toLowerCase();
    return cat === 'asset' || cat === 'license';
  };

  const getSubTypeLabel = (category?: string) => {
    if (!category) return 'Type';
    const cat = category.toLowerCase();
    if (cat === 'asset') return 'Asset Type';
    if (cat === 'license') return 'License Type';
    return 'Type';
  };

  return (
    <div className="content-here">
      <AssetDetailsModal  
        isOpen={!!selectedCard}
        onClose={() => {
          setSelectedCard(null);
          setShowMoreDetails(false);
        }}
        asset={selectedCard}
        onEdit={() => {
          const idx = filteredCards.findIndex(c => c.id === selectedCard?.id);
          if (idx >= 0) handleEditCard(idx);
        }}
        onReport={() => {
          if (selectedCard) {
            setReportingAsset({
              id: selectedCard.assetId || selectedCard.id,
              docId: selectedCard.id,
              name: selectedCard.title,
            });
            setReportModalOpen(true);
          }
        }}
        onViewHistory={(history, assetName, assetId) => {
          setHistoryAsset({ id: assetId, name: assetName, history });
          setShowHistoryModal(true);
        }}
        currentUserDocId={currentUserDocId}
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
          setSelectedCard(null);
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
       <BulkQRPrint 
        isOpen={showBulkQR}
        onClose={() => setShowBulkQR(false)}
      />

    <div className='assetmanagement-container'>
        <div className="asset-header-with-action">
          <h1>Asset Management</h1>
          <button 
            className="bulk-qr-trigger-btn"
            onClick={() => setShowBulkQR(true)}
          >
            <i className="fas fa-print" />
            Print Multiple QRs
          </button>
        </div>
        <div className="filter-section">
          <div className="quick-filters">
            <div className="filter-section-label">
              <i className="fas fa-filter" />
              <span>Quick Filters</span>
            </div>
            <div className="filter-tabs">
              <div className="category-filter-wrapper">
                <select 
                  className="category-filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilterKey)}
                >
                  <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}

                </select>
              </div>
              <div className="category-filter-wrapper">
              <select 
                className="category-filter-select"
                value={assetStatusFilter}
                onChange={(e) => setAssetStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statuses.map((stat) => (
                  <option key={stat} value={stat}>{stat}</option>
                ))}
              </select>

            </div>


              <button 
                className={`multi-select ${showMyAssets ? 'active' : ''}`}
                onClick={() => setShowMyAssets(!showMyAssets)}
              >
                <i className="fas fa-user" />
                My Assets
                <span>{counts.myAssets}</span>
              </button>

              <button 
                className={`multi-select reported ${showReported ? 'active' : ''}`}
                onClick={() => setShowReported(!showReported)}
              >
                <i className="fas fa-exclamation-triangle" />
                Reported Issues
                <span>{counts.reported}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="filter-section-label">
              <i className="fas fa-clock" />
              <span>Status</span>
            </div>
            <div className="filter-tabs">
              <button 
                className={`status-filter status-all ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Assets
                <span>{cards.length}</span>
              </button>
              <button 
                className={`status-filter status-permanent ${statusFilter === 'permanent' ? 'active' : ''}`}
                onClick={() => setStatusFilter('permanent')}
              >
                Permanent
                <span>{counts.permanent}</span>
              </button>
              <button 
                className={`status-filter status-normal ${statusFilter === 'normal' ? 'active' : ''}`}
                onClick={() => setStatusFilter('normal')}
              >
                Normal
                <span>{counts.normal}</span>
              </button>
              <button 
                className={`status-filter status-expire ${statusFilter === 'aboutToExpire' ? 'active' : ''}`}
                onClick={() => setStatusFilter('aboutToExpire')}
              >
                Expiring Soon
                <span>{counts.aboutToExpire}</span>
              </button>
              <button 
                className={`status-filter status-expired ${statusFilter === 'expired' ? 'active' : ''}`}
                onClick={() => setStatusFilter('expired')}
              >
                Expired
                <span>{counts.expired}</span>
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="active-filters-summary">
              <i className="fas fa-info-circle" />
              <span>
                Showing <strong>{filteredCards.length}</strong> of <strong>{cards.length}</strong> assets
              </span>
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Clear All
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox" />
            <p>No assets found</p>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredCards.map((card, index) => {
              console.log("Rendering card:", card.title);
              return (
                <div className="card" key={card.id}>
                  <div className="card-badges">
                    {card.personnelId === currentUserDocId && (
                      <span className="card-badge my-asset">Mine</span>
                    )}
                    {card.hasReports && (
                      <span className="card-badge reported">
                        <i className="fas fa-exclamation-circle" />
                        {card.reportCount}
                      </span>
                    )}
                  </div>

                  <div className="card-top">
                    <div className="card-top-left">
                      <div className={`card-icon ${card.iconClass}`}>
                        <i className={`fas ${card.team.toLowerCase().includes('hardware') ? 'fa-laptop' : 'fa-code'}`} />
                      </div>
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
                  
                                <h2
                className="card-title"
                dangerouslySetInnerHTML={{
                  __html: highlightText(card.title, card._matches),
                }}
              ></h2>



                  
                  <div className="card-meta">
                    <div className="card-meta-item">
                      <i className="fas fa-layer-group" />
                      {card.team}
                    </div>
                    <div className="card-meta-item">
                      <i className="fas fa-barcode" />
                      {card.serial}
                    </div>
                    {card.personnel && (
                      <div className="card-meta-item">
                        <i className="fas fa-user" />
                        {card.personnel}
                      </div>
                    )}
                  </div>
                  
                  <div className="card-time-badge">
                    {card.timeLeft}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={historyAsset?.history || []}
        assetName={historyAsset?.name || 'Asset'}
      />
    </div>
  );
};

export default AssetManagement;