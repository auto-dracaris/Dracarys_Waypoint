import { DockType } from '../enums/dock-type.enum';
import { toMinutes } from './date.util';

/**
 * When an outlet takes deliveries, as HH:MM: its own window, narrowed to the
 * mall's access window if it is in one.
 */
export function deliveryWindow(outlet: {
  windowOpenTime: string;
  windowCloseTime: string;
  mallWindowOpen: string | null;
  mallWindowClose: string | null;
}): { windowOpen: string; windowClose: string } {
  const later = (a: string, b: string | null) =>
    b && toMinutes(b) > toMinutes(a) ? b : a;
  const earlier = (a: string, b: string | null) =>
    b && toMinutes(b) < toMinutes(a) ? b : a;
  return {
    windowOpen: later(outlet.windowOpenTime, outlet.mallWindowOpen).slice(0, 5),
    windowClose: earlier(outlet.windowCloseTime, outlet.mallWindowClose).slice(
      0,
      5,
    ),
  };
}

/** Where goods are unloaded, in a driver's words. */
export const DOCK_LABELS: Record<DockType, string> = {
  [DockType.STREET]: 'Street frontage',
  [DockType.REAR_DOCK]: 'Rear loading dock',
  [DockType.MALL_BAY]: 'Mall loading bay',
};
