// src/components/.../ReleaseQuantityModal.tsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

export interface ReleaseItem {
  id: string;
  requestId: string;
  name: string;
  unit: string;
  maxQuantity: number;   // original/current quantity remaining in request
}

interface ReleaseQuantityModalProps {
  mode: "single" | "bulk";
  items: ReleaseItem[];
  onClose: () => void;
  onConfirm: (rows: { id: string; quantityToRelease: number }[]) => void;
}

const ReleaseQuantityModal: React.FC<ReleaseQuantityModalProps> = ({
  mode,
  items,
  onClose,
  onConfirm,
}) => {
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    // default each quantity to full remaining quantity
    const init: Record<string, string> = {};
    items.forEach((item) => {
      init[item.id] = item.maxQuantity.toString();
    });
    setQuantities(init);
  }, [items]);

  const handleChange = (id: string, value: string) => {
    // Only allow numbers + empty
    if (!/^\d*\.?\d*$/.test(value)) return;
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (!items.length) return;

    const result: { id: string; quantityToRelease: number }[] = [];

    for (const item of items) {
      const raw = quantities[item.id];
      const qty = Number(raw);

      if (!raw || isNaN(qty)) {
        toast.error(`Please enter a valid quantity for "${item.name}".`);
        return;
      }

      if (qty <= 0) {
        toast.error(`Quantity for "${item.name}" must be greater than 0.`);
        return;
      }

      if (qty > item.maxQuantity) {
        toast.error(
          `Quantity for "${item.name}" cannot exceed ${item.maxQuantity} ${item.unit}.`
        );
        return;
      }

      result.push({ id: item.id, quantityToRelease: qty });
    }

    if (!result.length) {
      toast.error("No valid quantities to release.");
      return;
    }

    onConfirm(result);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content release-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i className="fas fa-box-open" />
            {mode === "single" ? "Release to Inventory" : "Release Multiple Items"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body">
          <p className="confirmation-text">
            Enter how much you want to release to inventory.
          </p>

          <div className="release-table-wrapper">
            <table className="release-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Item</th>
                  <th>Requested / Remaining</th>
                  <th>Release Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="id-cell">{item.requestId}</td>
                    <td className="name-cell">{item.name}</td>
                    <td>
                      {item.maxQuantity} {item.unit}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="quantity-input"
                        value={quantities[item.id] ?? ""}
                        onChange={(e) =>
                          handleChange(item.id, e.target.value.trim())
                        }
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="warning-text">
            <i className="fas fa-exclamation-triangle" />
            If the released quantity is less than the requested quantity, the
            remaining amount will stay in the request.
          </p>
        </div>

        <div className="modal-actions">
          <button className="action-btn cancel" onClick={onClose}>
            <i className="fas fa-ban" /> Cancel
          </button>
          <button className="action-btn release" onClick={handleSubmit}>
            <i className="fas fa-box-open" /> Confirm Release
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReleaseQuantityModal;
