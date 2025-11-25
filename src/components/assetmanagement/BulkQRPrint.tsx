// BulkQRPrint.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import QRCode from 'react-qr-code';
import { toast } from 'react-toastify';
import '../../assets/BulkQRPrint.css';

interface Asset {
  id: string;
  assetId?: string;
  assetName?: string;
  serialNo?: string;
  qrcode?: string;
  assetUrl?: string;
  category?: string;
  generateQR?: boolean;
  propertyNo?: string;
  purchaseDate?: string;
  personnel?: string;
}

interface BulkQRPrintProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkQRPrint: React.FC<BulkQRPrintProps> = ({ isOpen, onClose }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [personnelMap, setPersonnelMap] = useState<Map<string, string>>(new Map());

  const getValidQRValue = (qrcode?: string, assetUrl?: string): string => {
    const MAX_QR_LENGTH = 2000;
    const value = qrcode || assetUrl || 'No URL';
    
    if (value.length > MAX_QR_LENGTH) {
      console.warn('QR code value too long:', value.length, 'characters. Using fallback.');
      return assetUrl && assetUrl.length < MAX_QR_LENGTH 
        ? assetUrl 
        : 'Invalid QR Data';
    }
    
    return value;
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      fetchPersonnel();
    }
  }, [isOpen]);

  const fetchPersonnel = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'IT_Supply_Users'));
      const map = new Map<string, string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        const fullName = `${data.FirstName} ${data.MiddleInitial ? data.MiddleInitial + '.' : ''} ${data.LastName}`.trim();
        map.set(doc.id, fullName);
      });
      setPersonnelMap(map);
    } catch (error) {
      console.error('Error fetching personnel:', error);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'IT_Assets'),
        where('generateQR', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const assetList: Asset[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.qrcode) {
          const qrValue = data.qrcode || data.assetUrl || '';
          if (qrValue.length > 2000) {
            console.warn(`Asset ${data.assetName} has invalid QR code (too long: ${qrValue.length} chars)`);
          }
          
          assetList.push({
            id: doc.id,
            assetId: data.assetId,
            assetName: data.assetName,
            serialNo: data.serialNo,
            qrcode: data.qrcode,
            assetUrl: data.assetUrl,
            category: data.category,
            generateQR: data.generateQR,
            propertyNo: data.propertyNo,
            purchaseDate: data.purchaseDate,
            personnel: data.personnel,
          });
        }
      });
      
      setAssets(assetList);
      if (assetList.length === 0) {
        toast.info('No assets with QR codes found');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.assetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      categoryFilter === 'all' || asset.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleToggleAsset = (id: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssets(newSelected);
  };

  const handlePrint = () => {
    if (selectedAssets.size === 0) {
      toast.warning('Please select at least one asset to print');
      return;
    }

    setTimeout(() => {
      window.print();
    }, 100);
  };

  const categories = [...new Set(assets.map(a => a.category).filter(Boolean))];

  // Get selected assets in order
  const selectedAssetsList = filteredAssets.filter((asset) => selectedAssets.has(asset.id));

  if (!isOpen) return null;

  return (
    <>
      <div className="bulk-qr-overlay" onClick={onClose}>
        <div className="bulk-qr-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bulk-qr-header">
            <h2>
              <i className="fas fa-qrcode" /> Print Multiple QR Codes
            </h2>
            <button className="bulk-qr-close" onClick={onClose}>
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Filters */}
          <div className="bulk-qr-filters">
            <div className="bulk-qr-search">
              <i className="fas fa-search" />
              <input
                type="text"
                placeholder="Search by name, serial, or asset ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="bulk-qr-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              className="bulk-qr-select-all"
              onClick={handleSelectAll}
            >
              {selectedAssets.size === filteredAssets.length ? (
                <>
                  <i className="fas fa-times-circle" /> Deselect All
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle" /> Select All
                </>
              )}
            </button>
          </div>

          {/* Asset List */}
          <div className="bulk-qr-content">
            {loading ? (
              <div className="bulk-qr-loading">
                <div className="loading-spinner" />
                <p>Loading assets...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="bulk-qr-empty">
                <i className="fas fa-inbox" />
                <p>No assets found with QR codes</p>
                <small>Try adjusting your search or filters</small>
              </div>
            ) : (
              <div className="bulk-qr-list">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`bulk-qr-item ${selectedAssets.has(asset.id) ? 'selected' : ''}`}
                    onClick={() => handleToggleAsset(asset.id)}
                  >
                    <div className="bulk-qr-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={() => {}}
                      />
                    </div>
                    
                    <div className="bulk-qr-preview">
                      {(() => {
                        try {
                          const qrValue = getValidQRValue(asset.qrcode, asset.assetUrl);
                          return (
                            <QRCode
                              value={qrValue}
                              size={50}
                            />
                          );
                        } catch (error) {
                          console.error('QR preview error:', error);
                          return (
                            <div style={{ 
                              width: 50, 
                              height: 50, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: '#fee2e2',
                              borderRadius: '4px',
                              fontSize: '10px',
                              color: '#991b1b'
                            }}>
                              Invalid QR
                            </div>
                          );
                        }
                      })()}
                    </div>

                    <div className="bulk-qr-info">
                      <div className="bulk-qr-name">{asset.assetName || 'Unnamed Asset'}</div>
                      <div className="bulk-qr-details">
                        <span><i className="fas fa-tag" /> {asset.assetId || 'N/A'}</span>
                        <span><i className="fas fa-barcode" /> {asset.serialNo || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="bulk-qr-category-badge">
                      {asset.category || 'Uncategorized'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bulk-qr-footer">
            <div className="bulk-qr-selected-count">
              {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
            </div>
            <div className="bulk-qr-actions">
              <button className="bulk-qr-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className="bulk-qr-print"
                onClick={handlePrint}
                disabled={selectedAssets.size === 0}
              >
                <i className="fas fa-print" /> Print QR Codes ({selectedAssets.size})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Content - Outside modal, hidden on screen */}
      <div className="bulk-qr-print-container">
        {selectedAssetsList.map((asset, index) => (
          <div key={asset.id} className="bulk-qr-print-quarter">
            <div className="print-header">
              <img src="/dohlogo1.png" alt="DOH Logo" className="print-logo" />
              <div className="print-header-text">
                <div className="print-dept-name">Department of Health</div>
                <div className="print-dept-small">Treatment and Rehabilitation Center Argao</div>
                <div className="print-dept-small">Candabong, Binlod, Argao, Cebu</div>
              </div>
            </div>
            
            <div className="print-title">PROPERTY INVENTORY STICKER</div>
            
            <div className="print-info-row">
              <span className="print-info-label">Property No.:</span>
              <span className="print-info-value">{asset.propertyNo || 'N/A'}</span>
            </div>
            
            <div className="print-info-row">
              <span className="print-info-label">Serial No.:</span>
              <span className="print-info-value">{asset.serialNo || 'N/A'}</span>
            </div>
            
            <div className="print-qr-container">
              {(() => {
                try {
                  const qrValue = getValidQRValue(asset.qrcode, asset.assetUrl);
                  return (
                    <QRCode
                      value={qrValue}
                      size={180}
                    />
                  );
                } catch (error) {
                  console.error('QR print error:', asset.assetName, error);
                  return (
                    <div className="print-qr-error">
                      <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>⚠️</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Invalid QR Data</div>
                      <div style={{ fontSize: '12px', marginTop: '0.25rem' }}>Data too large</div>
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="print-info-row">
              <span className="print-info-label">Description:</span>
              <span className="print-info-value">{asset.assetName || 'N/A'}</span>
            </div>
            
            <div className="print-info-row">
              <span className="print-info-label">Date Acquired:</span>
              <span className="print-info-value">{asset.purchaseDate || 'N/A'}</span>
            </div>

            <div className="print-info-row">
              <span className="print-info-label">Custodian:</span>
              <span className="print-info-value">{personnelMap.get(asset.personnel || '') || 'N/A'}</span>
            </div>
            
            <div className="print-validation-section">
              <div className="print-validation-title">Inventory Committee Validation</div>
              <div className="print-signature-grid">
                <div className="print-signature-item">
                  <div>Inspected by</div>
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-item">
                  <div>Date of Inspection</div>
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-item">
                  <div>Signature</div>
                  <div className="print-signature-line"></div>
                </div>
              </div>
              <div className="print-signature-grid">
                <div className="print-signature-item">
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-item">
                  <div className="print-signature-line"></div>
                </div>
                <div className="print-signature-item">
                  <div className="print-signature-line"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default BulkQRPrint;