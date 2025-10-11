// src/components/HistoryModal.tsx (or wherever your components live)

import React from 'react';
import '../../assets/HistoryModal.css'; // We'll define styles below

interface HistoryEntry {
  changedAt?: any;
  changedBy?: string;
  from?: string;
  to?: string;
  reason?: string;
  maintainedBy?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  assetName: string;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  assetName,
}) => {
  if (!isOpen) return null;

  const formatWhen = (changedAt: any) => {
    if (!changedAt) return 'Unknown time';
    try {
      if (typeof changedAt.toDate === 'function') {
        return changedAt.toDate().toLocaleString();
      }
      if (typeof changedAt.toMillis === 'function') {
        return new Date(changedAt.toMillis()).toLocaleString();
      }
      if (typeof changedAt === 'string') {
        const parsed = new Date(changedAt);
        return !isNaN(parsed.getTime()) ? parsed.toLocaleString() : String(changedAt);
      }
      if (typeof changedAt === 'number') {
        return new Date(changedAt).toLocaleString();
      }
      return String(changedAt);
    } catch {
      return 'Unknown time';
    }
  };

  // Sort descending
  const sortedHistory = [...(history || [])].sort((a, b) => {
    const getMillis = (x: any) => {
      if (!x) return 0;
      if (typeof x.toMillis === 'function') return x.toMillis();
      if (typeof x === 'string') {
        const t = Date.parse(x);
        return isNaN(t) ? 0 : t;
      }
      if (typeof x === 'number') return x;
      return 0;
    };
    return getMillis(b.changedAt) - getMillis(a.changedAt);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>History: {assetName}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="history-content">
          {sortedHistory.length === 0 ? (
            <div className="history-empty">No history available</div>
          ) : (
            sortedHistory.map((h, i) => (
              <div className="history-entry" key={i}>
                <div className="history-meta">
                  <div className="history-action">
                    {h.from || '—'} → {h.to || '—'}
                  </div>
                  <div className="history-when">{formatWhen(h.changedAt)}</div>
                  <div className="history-who">{h.changedBy || ''}</div>
                </div>
                <div className="history-body">
                  <div className="history-reason">
                    <strong>Reason:</strong> {h.reason || '—'}
                  </div>
                  {h.maintainedBy && (
                    <div className="history-maintained">
                      <strong>Maintained by:</strong> {h.maintainedBy}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;