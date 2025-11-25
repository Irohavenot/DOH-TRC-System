// QRDiagnosticTool.tsx
// Add this as a component in your admin panel or settings page

import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { toast } from 'react-toastify';
import '../../assets/QRDiagnostic.css'; // We'll create CSS below

interface QRIssue {
  id: string;
  name: string;
  issue: string;
  length: number;
  preview?: string;
  originalQR?: string;
}

interface Stats {
  total: number;
  withQR: number;
  valid: number;
  tooLong: number;
  empty: number;
  maxLength: number;
  minLength: number;
}

const QRDiagnosticTool: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [issues, setIssues] = useState<QRIssue[]>([]);
  const [showResults, setShowResults] = useState(false);

  const MAX_QR_LENGTH = 2000;

  const runDiagnostic = async () => {
    setLoading(true);
    setShowResults(false);
    
    try {
      const snapshot = await getDocs(collection(db, 'IT_Assets'));
      const foundIssues: QRIssue[] = [];
      const diagnosticStats: Stats = {
        total: 0,
        withQR: 0,
        valid: 0,
        tooLong: 0,
        empty: 0,
        maxLength: 0,
        minLength: Infinity
      };
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        diagnosticStats.total++;
        
        if (data.generateQR) {
          diagnosticStats.withQR++;
          const qrValue = data.qrcode || data.assetUrl || '';
          const length = qrValue.length;
          
          if (length > diagnosticStats.maxLength) diagnosticStats.maxLength = length;
          if (length < diagnosticStats.minLength && length > 0) diagnosticStats.minLength = length;
          
          if (length === 0) {
            diagnosticStats.empty++;
            foundIssues.push({
              id: docSnap.id,
              name: data.assetName || 'Unknown',
              issue: 'Empty QR code',
              length: 0
            });
          } else if (length > MAX_QR_LENGTH) {
            diagnosticStats.tooLong++;
            foundIssues.push({
              id: docSnap.id,
              name: data.assetName || 'Unknown',
              issue: 'QR code too long',
              length: length,
              preview: qrValue.substring(0, 100) + '...',
              originalQR: qrValue
            });
          } else {
            diagnosticStats.valid++;
          }
        }
      });
      
      if (diagnosticStats.minLength === Infinity) diagnosticStats.minLength = 0;
      
      setStats(diagnosticStats);
      setIssues(foundIssues);
      setShowResults(true);
      
      if (foundIssues.length === 0) {
        toast.success('✅ No QR code issues found!');
      } else {
        toast.warning(`⚠️ Found ${foundIssues.length} issue(s) that need fixing.`);
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Failed to run diagnostic.');
    } finally {
      setLoading(false);
    }
  };

  const fixAllIssues = async () => {
    if (issues.length === 0) {
      toast.info('No issues to fix!');
      return;
    }

    const confirmed = window.confirm(
      `This will fix ${issues.length} asset(s) with QR code issues.\n\n` +
      `It will replace problematic QR codes with just the asset URL.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setFixing(true);
    let fixed = 0;
    let failed = 0;

    try {
      for (const issue of issues) {
        try {
          const assetRef = doc(db, 'IT_Assets', issue.id);
          
          // Get the document data to extract assetUrl
          const snapshot = await getDocs(collection(db, 'IT_Assets'));
          const assetDoc = snapshot.docs.find(d => d.id === issue.id);
          
          if (!assetDoc) {
            console.warn('Asset not found:', issue.id);
            failed++;
            continue;
          }

          const data = assetDoc.data();
          let newQRValue = data.assetUrl || '';

          // If assetUrl is also too long or missing, construct a simple one
          if (!newQRValue || newQRValue.length > MAX_QR_LENGTH) {
            const assetId = data.assetId || issue.id;
            newQRValue = `${window.location.origin}/dashboard/${encodeURIComponent(assetId)}`;
          }

          // Update with the clean URL
          await updateDoc(assetRef, {
            qrcode: newQRValue,
            updatedAt: new Date(),
            updatedBy: 'QR Diagnostic Tool'
          });

          console.log(`✅ Fixed: ${issue.name} (${issue.length} → ${newQRValue.length} chars)`);
          fixed++;
        } catch (err) {
          console.error(`Failed to fix ${issue.name}:`, err);
          failed++;
        }
      }

      if (fixed > 0) {
        toast.success(`✅ Fixed ${fixed} QR code(s)!`);
      }
      if (failed > 0) {
        toast.error(`❌ Failed to fix ${failed} QR code(s).`);
      }

      // Re-run diagnostic to show updated results
      await runDiagnostic();
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Failed to fix QR codes.');
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="qr-diagnostic-container">
      <div className="diagnostic-header">
        <div className="header-content">
          <i className="fas fa-stethoscope"></i>
          <div>
            <h2>QR Code Diagnostic Tool</h2>
            <p>Scan and fix QR code issues in your asset database</p>
          </div>
        </div>
      </div>

      <div className="diagnostic-actions">
        <button
          className="btn-diagnostic"
          onClick={runDiagnostic}
          disabled={loading || fixing}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Scanning...
            </>
          ) : (
            <>
              <i className="fas fa-search"></i> Run Diagnostic
            </>
          )}
        </button>

        {issues.length > 0 && (
          <button
            className="btn-fix"
            onClick={fixAllIssues}
            disabled={loading || fixing}
          >
            {fixing ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Fixing...
              </>
            ) : (
              <>
                <i className="fas fa-wrench"></i> Fix All Issues ({issues.length})
              </>
            )}
          </button>
        )}
      </div>

      {showResults && stats && (
        <div className="diagnostic-results">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <i className="fas fa-database"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Assets</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon qr">
                <i className="fas fa-qrcode"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">With QR</span>
                <span className="stat-value">{stats.withQR}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon valid">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Valid</span>
                <span className="stat-value">{stats.valid}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon error">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="stat-content">
                <span className="stat-label">Issues</span>
                <span className="stat-value">{stats.tooLong + stats.empty}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h3>
              <i className="fas fa-info-circle"></i> Details
            </h3>
            <div className="detail-row">
              <span>Too Long (&gt; {MAX_QR_LENGTH} chars):</span>
              <strong className={stats.tooLong > 0 ? 'text-error' : ''}>{stats.tooLong}</strong>
            </div>
            <div className="detail-row">
              <span>Empty QR Codes:</span>
              <strong className={stats.empty > 0 ? 'text-warning' : ''}>{stats.empty}</strong>
            </div>
            <div className="detail-row">
              <span>Max QR Length:</span>
              <strong>{stats.maxLength.toLocaleString()} chars</strong>
            </div>
            <div className="detail-row">
              <span>Min QR Length:</span>
              <strong>{stats.minLength.toLocaleString()} chars</strong>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="issues-section">
              <h3>
                <i className="fas fa-exclamation-circle"></i> Found Issues
              </h3>
              <div className="issues-list">
                {issues.map((issue, index) => (
                  <div key={issue.id} className="issue-card">
                    <div className="issue-header">
                      <span className="issue-number">#{index + 1}</span>
                      <span className="issue-name">{issue.name}</span>
                      <span className={`issue-badge ${issue.issue.includes('Empty') ? 'empty' : 'long'}`}>
                        {issue.issue}
                      </span>
                    </div>
                    <div className="issue-details">
                      <div className="issue-detail">
                        <i className="fas fa-id-badge"></i>
                        <span>ID: {issue.id}</span>
                      </div>
                      <div className="issue-detail">
                        <i className="fas fa-ruler"></i>
                        <span>Length: {issue.length.toLocaleString()} chars</span>
                      </div>
                    </div>
                    {issue.preview && (
                      <div className="issue-preview">
                        <i className="fas fa-eye"></i>
                        <code>{issue.preview}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {issues.length === 0 && (
            <div className="no-issues">
              <i className="fas fa-check-circle"></i>
              <h3>All Clear!</h3>
              <p>No QR code issues found in your database.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRDiagnosticTool;