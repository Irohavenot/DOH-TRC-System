import { useEffect, useState } from "react";

interface UseLocalPdfTemplateResult {
  hasTemplate: boolean;
  loadingTemplate: boolean;
  saveTemplateFile: (file: File) => Promise<void>;
  clearTemplate: () => void;
  getTemplateBytes: () => Uint8Array | null;
}

export function useLocalPdfTemplate(storageKey: string): UseLocalPdfTemplateResult {
  const [base64, setBase64] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setBase64(stored);
    } catch (err) {
      console.error("Failed to read template from localStorage", err);
    } finally {
      setLoadingTemplate(false);
    }
  }, [storageKey]);

  const saveTemplateFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Uint8Array -> base64
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    localStorage.setItem(storageKey, b64);
    setBase64(b64);
  };

  const clearTemplate = () => {
    localStorage.removeItem(storageKey);
    setBase64(null);
  };

  const getTemplateBytes = () => {
    if (!base64) return null;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  return {
    hasTemplate: !!base64,
    loadingTemplate,
    saveTemplateFile,
    clearTemplate,
    getTemplateBytes,
  };
}
