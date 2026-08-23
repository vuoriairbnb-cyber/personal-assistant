export function formatKidePrice(price: number | null, currency: string | null) {
  if (price === 0) return "Free";
  if (price === null || !currency) return "Price unavailable";
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency }).format(price / 100);
}
