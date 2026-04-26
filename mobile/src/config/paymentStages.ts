/**
 * Staged UPI collection: percentage splits per vendor category.
 * Amounts on each row are `Math.round(totalAmount * percent / 100)`.
 */
export const PAYMENT_STAGES = {
  decorator: [
    {
      stage: 1,
      percent: 30,
      label: 'Booking Advance',
      trigger: 'on_booking' as const,
      releaseAfter: 'booking_confirmed' as const,
    },
    {
      stage: 2,
      percent: 50,
      label: 'Work Start Payment',
      trigger: 'manual_by_user' as const,
      releaseAfter: 'work_started' as const,
    },
    {
      stage: 3,
      percent: 20,
      label: 'Final Payment',
      trigger: 'manual_by_user' as const,
      releaseAfter: 'event_completed' as const,
    },
  ],
  photographer: [
    {
      stage: 1,
      percent: 0,
      label: 'No Advance',
      trigger: 'none' as const,
      releaseAfter: null,
    },
    {
      stage: 2,
      percent: 100,
      label: 'Full Payment After Delivery',
      trigger: 'manual_by_user' as const,
      releaseAfter: 'photos_delivered' as const,
    },
  ],
  caterer: [
    {
      stage: 1,
      percent: 50,
      label: 'Advance Payment',
      trigger: 'on_booking' as const,
      releaseAfter: 'booking_confirmed' as const,
    },
    {
      stage: 2,
      percent: 50,
      label: 'Day of Event',
      trigger: 'manual_by_user' as const,
      releaseAfter: 'event_day' as const,
    },
  ],
  band_baja: [
    {
      stage: 1,
      percent: 40,
      label: 'Booking Token',
      trigger: 'on_booking' as const,
      releaseAfter: 'booking_confirmed' as const,
    },
    {
      stage: 2,
      percent: 60,
      label: 'Day of Event',
      trigger: 'manual_by_user' as const,
      releaseAfter: 'event_day' as const,
    },
  ],
  venue: [
    {
      stage: 1,
      percent: 25,
      label: 'Slot Booking',
      trigger: 'on_booking' as const,
      releaseAfter: 'booking_confirmed' as const,
    },
    {
      stage: 2,
      percent: 50,
      label: '1 Week Before',
      trigger: 'auto_reminder' as const,
      releaseAfter: 'week_before_event' as const,
    },
    {
      stage: 3,
      percent: 25,
      label: 'Final Settlement',
      trigger: 'manual_by_user' as const,
      releaseAfter: 'event_completed' as const,
    },
  ],
} as const;

export type VendorCategory = keyof typeof PAYMENT_STAGES;

export type PaymentStageDef = (typeof PAYMENT_STAGES)[VendorCategory][number];

const FALLBACK: readonly PaymentStageDef[] = PAYMENT_STAGES.caterer;

export function getPaymentStagesForCategory(
  category: string
): readonly PaymentStageDef[] {
  const c = String(category).toLowerCase() as VendorCategory;
  if (c in PAYMENT_STAGES) {
    return PAYMENT_STAGES[c];
  }
  return FALLBACK;
}
