export type KideVariant = {
  id: string;
  name: string;
  inventoryId: string | null;
  currencyCode: string | null;
  pricePerItem: number | null;
  availability: number | null;
  salesStarted: boolean;
  salesEnded: boolean;
  salesOngoing: boolean;
  maxReservable: number | null;
  maxPerUser: number | null;
  hakaRequired: boolean;
  membershipRequired: boolean;
  studentCardRequired: boolean;
  accessControlMembershipIds: string[];
};

export type KideEvent = {
  id: string;
  name: string;
  dateSalesFrom: string | null;
  dateSalesUntil: string | null;
  salesStarted: boolean;
  salesEnded: boolean;
  salesOngoing: boolean;
  salesPaused: boolean;
  timeUntilSalesStart: number | null;
  availability: number | null;
  hasReservations: boolean | null;
  hasInventoryItems: boolean | null;
  hasFreeInventoryItems: boolean | null;
  variants: KideVariant[];
};

export type KideReservation = {
  inventoryId: string;
  variantId: string | null;
  variantName: string | null;
  productId: string | null;
  productName: string | null;
  reservedQuantity: number;
  reservationDateCreated: string | null;
  pricePerItem: number | null;
  currencyCode: string | null;
  availability: number | null;
  hakaRequired: boolean;
  maxReservable: number | null;
  maxPerUser: number | null;
};

export type KideReservationResult = {
  reservationsPrice: number | null;
  deliveryMethodsPrice: number | null;
  serviceFee: number | null;
  finalPrice: number | null;
  currencyCode: string | null;
  reservationsCount: number;
  reservationsTimeLeft: number | null;
  reservations: KideReservation[];
};

export class KideError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}
