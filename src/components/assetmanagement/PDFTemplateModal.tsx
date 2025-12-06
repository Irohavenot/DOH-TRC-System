import React, { useState } from "react";

interface PDFTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTemplate: (file: File) => Promise<void> | void;
  hasTemplate: boolean;
  onClearTemplate?: () => void;
}

const PDFTemplateModal: React.FC<PDFTemplateModalProps> = ({
  isOpen,
  onClose,
  onSaveTemplate,
  hasTemplate,
  onClearTemplate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError("Please choose a PDF template first.");
      return;
    }
    try {
      setSaving(true);
      await onSaveTemplate(selectedFile);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (onClearTemplate) {
      onClearTemplate();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Upload Default PDF Template</h3>
        <p style={{ marginTop: 0, fontSize: 14, color: "#555" }}>
          This PDF will be used as the default layout for this report. You can
          replace it anytime.
        </p>

        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          style={{ margin: "12px 0" }}
        />

        {selectedFile && (
          <p style={{ fontSize: 13, color: "#333" }}>
            Selected: <strong>{selectedFile.name}</strong>
          </p>
        )}

        {hasTemplate && !selectedFile && (
          <p style={{ fontSize: 13, color: "#00796b" }}>
            A template is currently saved. Upload a new one to replace it.
          </p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: "#d32f2f", marginTop: 8 }}>{error}</p>
        )}

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {hasTemplate && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #d32f2f",
                background: "#fff",
                color: "#d32f2f",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Clear Template
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#f5f5f5",
              cursor: "pointer",
              fontSize: 13,
            }}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg,#00796b,#004d40)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(0,121,107,0.3)",
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFTemplateModal;
