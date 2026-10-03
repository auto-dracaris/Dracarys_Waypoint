import { IssueType } from '../enums/issue-type.enum';
import { UserRole } from '../enums/user-role.enum';

/** What each kind of issue is called when it is listed. */
export const ISSUE_TITLES: Record<IssueType, string> = {
  [IssueType.LOAD_SHORTFALL]: 'Loaded short',
  [IssueType.LOAD_DAMAGE]: 'Damaged at loading',
  [IssueType.VEHICLE_BREAKDOWN]: 'Vehicle breakdown',
  [IssueType.DELAY]: 'Delay',
  [IssueType.DELIVERY_PROBLEM]: 'Delivery problem',
  [IssueType.DAMAGED]: 'Damaged goods',
  [IssueType.TEMPERATURE_BREACH]: 'Temperature breach',
  [IssueType.SHORT_DELIVERY]: 'Short delivery',
  [IssueType.WRONG_ITEMS]: 'Wrong items',
  [IssueType.RECEIPT_SHORTFALL]: 'Received short',
  [IssueType.RECEIPT_DAMAGE]: 'Received damaged',
  [IssueType.OTHER]: 'Issue',
};

/**
 * What each role can report: a loader what goes wrong before departure, a
 * driver what happens on the road and at the outlet, a store manager what
 * they find on receipt. A dispatcher resolves issues rather than raising them.
 */
export const ISSUE_TYPES_BY_ROLE: Partial<Record<UserRole, IssueType[]>> = {
  [UserRole.LOADER]: [
    IssueType.LOAD_SHORTFALL,
    IssueType.LOAD_DAMAGE,
    IssueType.OTHER,
  ],
  [UserRole.DRIVER]: [
    IssueType.DAMAGED,
    IssueType.TEMPERATURE_BREACH,
    IssueType.SHORT_DELIVERY,
    IssueType.WRONG_ITEMS,
    IssueType.DELIVERY_PROBLEM,
    IssueType.DELAY,
    IssueType.VEHICLE_BREAKDOWN,
    IssueType.OTHER,
  ],
  [UserRole.STORE_MANAGER]: [
    IssueType.RECEIPT_SHORTFALL,
    IssueType.RECEIPT_DAMAGE,
    IssueType.OTHER,
  ],
};

/** Issues about a quantity of one order's goods: they name the order and how many cases. */
export const GOODS_ISSUE_TYPES = new Set([
  IssueType.LOAD_SHORTFALL,
  IssueType.LOAD_DAMAGE,
  IssueType.DAMAGED,
  IssueType.TEMPERATURE_BREACH,
  IssueType.SHORT_DELIVERY,
  IssueType.WRONG_ITEMS,
  IssueType.RECEIPT_SHORTFALL,
  IssueType.RECEIPT_DAMAGE,
]);
