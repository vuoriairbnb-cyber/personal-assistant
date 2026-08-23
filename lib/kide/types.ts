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

export class KideError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}
