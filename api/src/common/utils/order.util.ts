/** The reference people quote for an order, in the dataset's format (ORD0000012). */
export const orderReference = (orderId: number): string =>
  `ORD${String(orderId).padStart(7, '0')}`;

/** An order reference (`ORD0000012` or `12`) as the id it stands for; null if it is neither. */
export const orderIdFromReference = (reference: string): number | null => {
  const match = /^(?:ORD)?0*(\d{1,9})$/i.exec(reference.trim());
  return match ? parseInt(match[1], 10) : null;
};
