import type { KideEvent, KideReservation, KideReservationResult, KideVariant } from "./types.ts";

function record(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function string(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function boolean(value: unknown, fallback = false): boolean { return typeof value === "boolean" ? value : fallback; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : []; }

function normalizeVariant(value: unknown): KideVariant | null {
  const variant = record(value);
  const id = string(variant?.id);
  const name = string(variant?.name);
  if (!variant || !id || !name) return null;
  return {
    id, name, inventoryId: string(variant.inventoryId), currencyCode: string(variant.currencyCode), pricePerItem: number(variant.pricePerItem), availability: number(variant.availability),
    salesStarted: boolean(variant.salesStarted), salesEnded: boolean(variant.salesEnded), salesOngoing: boolean(variant.salesOngoing),
    maxReservable: number(variant.productVariantMaximumReservableQuantity), maxPerUser: number(variant.productVariantMaximumItemQuantityPerUser),
    hakaRequired: boolean(variant.isProductVariantHakaAuthenticationRequired), membershipRequired: boolean(variant.isProductVariantMembershipRequired), studentCardRequired: boolean(variant.isProductVariantStudentCardRequired),
    accessControlMembershipIds: stringArray(variant.accessControlMembershipIds),
  };
}

export function normalizeKideEvent(value: unknown): KideEvent {
  const root = record(value);
  const model = record(root?.model);
  const product = record(model?.product);
  const id = string(product?.id);
  const name = string(product?.name);
  if (!product || !id || !name) throw new Error("Kide returned an invalid event response");
  const variants = Array.isArray(model?.variants) ? model.variants.flatMap((variant) => {
    const normalized = normalizeVariant(variant);
    return normalized ? [normalized] : [];
  }) : [];
  return {
    id, name, dateSalesFrom: string(product.dateSalesFrom), dateSalesUntil: string(product.dateSalesUntil),
    salesStarted: boolean(product.salesStarted), salesEnded: boolean(product.salesEnded), salesOngoing: boolean(product.salesOngoing), salesPaused: boolean(product.salesPaused),
    timeUntilSalesStart: number(product.timeUntilSalesStart), availability: number(product.availability), hasReservations: typeof product.hasReservations === "boolean" ? product.hasReservations : null,
    hasInventoryItems: typeof product.hasInventoryItems === "boolean" ? product.hasInventoryItems : null,
    hasFreeInventoryItems: typeof product.hasFreeInventoryItems === "boolean" ? product.hasFreeInventoryItems : null, variants,
  };
}

function normalizeReservation(value: unknown): KideReservation | null {
  const reservation = record(value);
  const inventoryId = string(reservation?.inventoryId);
  if (!reservation || !inventoryId) return null;
  return {
    inventoryId, variantId: string(reservation.variantId), variantName: string(reservation.variantName), productId: string(reservation.productId), productName: string(reservation.productName),
    reservedQuantity: number(reservation.reservedQuantity) ?? 0, reservationDateCreated: string(reservation.reservationDateCreated), pricePerItem: number(reservation.pricePerItem),
    currencyCode: string(reservation.currencyCode), availability: number(reservation.availability), hakaRequired: boolean(reservation.isProductVariantHakaAuthenticationRequired),
    maxReservable: number(reservation.productVariantMaximumReservableQuantity), maxPerUser: number(reservation.productVariantMaximumItemQuantityPerUser),
  };
}

export function normalizeKideReservationResult(value: unknown): KideReservationResult {
  const root = record(value); const model = record(root?.model);
  if (!model) throw new Error("Kide returned an invalid reservation response");
  const reservations = Array.isArray(model.reservations) ? model.reservations.flatMap((reservation) => {
    const normalized = normalizeReservation(reservation); return normalized ? [normalized] : [];
  }) : [];
  return {
    reservationsPrice: number(model.reservationsPrice), deliveryMethodsPrice: number(model.deliveryMethodsPrice), serviceFee: number(model.serviceFee), finalPrice: number(model.finalPrice), currencyCode: string(model.currencyCode),
    reservationsCount: number(model.reservationsCount) ?? reservations.length, reservationsTimeLeft: number(model.reservationsTimeLeft), reservations,
  };
}
