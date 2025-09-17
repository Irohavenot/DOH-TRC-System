// pages/AssetDetails.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

type Asset = {
  assetId: string;
  assetName: string;
  serialNo?: string;
  category?: string;
  status?: string;
  image?: string;
  assetUrl?: string;
  // ... any other fields you saved
};

export default function AssetDetails() {
  const { assetId = "" } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(
          collection(db, "IT_Assets"),
          where("assetId", "==", assetId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAsset(snap.docs[0].data() as Asset);
        } else {
          setAsset(null);
        }
      } catch (e) {
        console.error(e);
        setAsset(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId]);

  if (loading) return <div style={{ padding: 24 }}>Loading asset…</div>;
  if (!asset) return <div style={{ padding: 24 }}>Asset not found.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>{asset.assetName}</h2>
      {asset.image && <img src={asset.image} alt={asset.assetName} style={{ maxWidth: 300 }} />}
      <p><b>ID:</b> {asset.assetId}</p>
      <p><b>Category:</b> {asset.category || "—"}</p>
      <p><b>Status:</b> {asset.status || "—"}</p>
      <p><b>Serial:</b> {asset.serialNo || "—"}</p>
      {/* add the rest */}
    </div>
  );
}
