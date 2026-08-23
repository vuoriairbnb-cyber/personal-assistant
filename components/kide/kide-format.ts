export function formatKidePrice(price: number | null, currency: string | null) {
  if (price === 0) return "Free";
  if (price === null || !currency) return "Price unavailable";
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency }).format(price / 100);
}

export function formatReservationTimeLeft(seconds: number | null) {
  if (seconds === null || seconds < 0) return "Not available";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
