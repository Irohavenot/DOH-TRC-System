// src/components/assetmanagement/DeletedAssets.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import '../../assets/assetmanagement.css';

interface DeletedAsset {
  id: string;
  title: string;
  team: string;
  serial: string;
  deletedAt: string;
  deletedBy: string;
  deletedByEmail: string;
  assetId?: string;
  personnel?: string;
  purchaseDate?: string;
  status?: string;
  licenseType?: string;
  createdAt?: string;
  createdBy?: string;
  renewdate?: string;
  // ... any other fields you want to display
}

const DeletedAssets: React.FC = () => {
  const [deletedAssets, setDeletedAssets] = useState<DeletedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "Deleted_Assets"), orderBy("deletedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const assets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DeletedAsset));
      setDeletedAssets(assets);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching deleted assets:", error);
      toast.error("Failed to load deleted assets");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handlePermanentDelete = async (id: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}" from archives? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "Deleted_Assets", id));
      toast.success("Asset permanently deleted");
    } catch (error) {
      console.error("Permanent delete failed:", error);
      toast.error("Failed to permanently delete asset");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="content-here">
      <h1>Deleted Assets Archive</h1>
      <p className="dashboard-subtext">
        These assets have been deleted from the active inventory but are kept for audit purposes.
      </p>

      {loading ? (
        <p>Loading deleted assets...</p>
      ) : deletedAssets.length === 0 ? (
        <p>No deleted assets found.</p>
      ) : (
        <div className="cards-grid">
          {deletedAssets.map((asset) => (
            <div key={asset.id} className="card" style={{ borderLeft: '4px solid #dc3545' }}>
              <div className="card-top">
                <div className="card-top-left">
                  <div className="card-icon icon-red"></div>
                  <span style={{ fontWeight: 'bold', color: '#dc3545' }}>DELETED</span>
                </div>
              </div>
              <h2>{asset.title}</h2>
              <p><strong>Serial:</strong> {asset.serial}</p>
              <p><strong>Category:</strong> {asset.team}</p>
              <p><strong>Status:</strong> {asset.status}</p>
              <p><strong>Deleted By:</strong> {asset.deletedBy}</p>
              <p><strong>Deleted At:</strong> {formatDate(asset.deletedAt)}</p>
              
              <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
                <button 
                  className="view-more-btn" 
                  style={{ backgroundColor: '#dc3545' }}
                  onClick={() => handlePermanentDelete(asset.id, asset.title)}
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeletedAssets;