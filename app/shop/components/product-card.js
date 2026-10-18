import { useRef, useState } from "react";
import { categoryLabel } from "../lib/products";
import ShopIcon from "./shop-icon";
import RestaurantDialog from "./restaurant-dialog";

export default function ProductCard({ product, selectedItem, remaining, ready, onAdd, onRemove }) {
  const [choosing, setChoosing] = useState(false);
  const [pendingVariant, setPendingVariant] = useState(null);
  const selectRef = useRef(null);
  const selected = Boolean(selectedItem);
  const minimumPrice = product.variants ? Math.min(...product.variants.map((variant) => variant.points)) : product.points;
  const price = selectedItem?.points ?? minimumPrice;
  const affordable = minimumPrice <= remaining;
  const disabled = !ready || (!selected && !affordable);
  const buttonText = selected ? "REMOVE FROM CART" : !affordable ? "NOT ENOUGH CREDITS" : "ADD TO CART";

  function action() {
    if (selected) {
      onRemove(product.id);
      setChoosing(false);
    } else if (product.variants) {
      setChoosing(true);
      requestAnimationFrame(() => selectRef.current?.focus());
    } else {
      onAdd(product.id);
    }
  }

  return (
    <article className={`product-card${selected ? " selected" : ""}`} data-product-id={product.id}>
      <button type="button" className="product-visual" onClick={action} disabled={disabled} aria-label={`${product.name} ${selected ? "aus dem Warenkorb entfernen" : "zum Warenkorb hinzufügen"}`}>
        <ShopIcon name={product.icon} className="product-illustration" />
        {selected && <span className="product-selected" aria-label="Ausgewählt"><ShopIcon name="check" /></span>}
      </button>
      <div className="product-details">
        <p className="product-category">{categoryLabel(product.category)}</p>
        <div className="product-title-row"><h2>{product.name}</h2><p className="product-price">{product.variants && !selected ? "AB " : ""}{price}<span> CREDITS</span></p></div>
        {product.variants && (choosing || selected) && (
          <label className="restaurant-options">
            Restaurantart
            <select ref={selectRef} value={selectedItem?.variantId || ""} onChange={(event) => {
              const variant = event.target.value;
              if (product.id === "restaurant" && variant !== "asian") setPendingVariant(variant);
              else onAdd(product.id, variant);
            }} disabled={!ready}>
              <option value="" disabled>Bitte auswählen</option>
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={variant.points > remaining + (selectedItem?.points || 0)}>
                  {variant.name} – {variant.points} Credits
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="product-action" type="button" disabled={disabled} onClick={action} aria-label={`${buttonText}: ${product.name}`}>{buttonText}</button>
      </div>
      {pendingVariant && <RestaurantDialog variant={pendingVariant} canChooseAsian={remaining + (selectedItem?.points || 0) >= 35} onConfirm={variant => {
        onAdd(product.id, variant);
        setPendingVariant(null);
        selectRef.current?.focus();
      }} />}
    </article>
  );
}
