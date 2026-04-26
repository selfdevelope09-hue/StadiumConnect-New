/**
 * Customer-facing price: 15% platform markup is baked into the "service cost" line
 * and never itemised. GST applies on the full taxable subtotal (visible).
 */
const HIDDEN_COMMISSION = 0.15;
const PLATFORM_SERVICE_FEE_RATE = 0.03;
const CONVENIENCE_FEE = 99;

export type FinalPrice = {
  /** Shown as "Service Cost" – vendor base + 15% (hidden) */
  vendorPrice: number;
  platformServiceFee: number;
  convenienceFee: number;
  subtotal: number;
  gst: number;
  totalPayable: number;
  discount: number;
  _internalCommission: number;
  _vendorReceives: number;
};

export function calculateFinalPrice(
  vendorBasePrice: number,
  discountRupees = 0
): FinalPrice {
  const safe = Math.max(0, Math.round(vendorBasePrice * 100) / 100);
  const ourCommission = safe * HIDDEN_COMMISSION;
  const priceWithCommission = safe + ourCommission;
  const platformServiceFee = Math.round(
    priceWithCommission * PLATFORM_SERVICE_FEE_RATE * 100
  ) / 100;
  const convenienceFee = CONVENIENCE_FEE;
  const subtotal =
    Math.round(
      (priceWithCommission + platformServiceFee + convenienceFee - discountRupees) * 100
    ) / 100;
  const gst = Math.round(subtotal * 0.18 * 100) / 100;
  const totalPayable = Math.round((subtotal + gst) * 100) / 100;

  return {
    vendorPrice: Math.round(priceWithCommission * 100) / 100,
    platformServiceFee,
    convenienceFee: CONVENIENCE_FEE,
    subtotal,
    gst,
    totalPayable,
    discount: Math.max(0, discountRupees),
    _internalCommission: Math.round(ourCommission * 100) / 100,
    _vendorReceives: safe,
  };
}

export { HIDDEN_COMMISSION, PLATFORM_SERVICE_FEE_RATE, CONVENIENCE_FEE };
