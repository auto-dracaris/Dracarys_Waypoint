/** The reference people quote for an order, in the dataset's format (ORD0000012). */
export const orderReference = (orderId: number): string =>
  `ORD${String(orderId).padStart(7, '0')}`;
