import { ISSUE_TITLES } from '../../common/constants/issue.constant';
import { DeferralReason } from '../../common/enums/deferral-reason.enum';
import { IssueType } from '../../common/enums/issue-type.enum';
import { NotificationSeverity } from '../../common/enums/notification-severity.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { orderReference } from '../../common/utils/order.util';

/** A notification before it has recipients. */
export interface Notice {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  data: Record<string, string>;
}

const { ERROR, WARNING, INFO, SUCCESS } = NotificationSeverity;

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

const refs = (orderIds: number[]): string =>
  orderIds.map(orderReference).join(', ');

// A breakdown or a warm chilled load cannot wait for the next look at the list.
const URGENT_ISSUES = new Set([
  IssueType.VEHICLE_BREAKDOWN,
  IssueType.TEMPERATURE_BREACH,
]);

interface IssueFacts {
  id: string;
  type: IssueType;
  tripId: string | null;
  orderId: number | null;
}

const issueData = (issue: IssueFacts): Record<string, string> => ({
  issueId: issue.id,
  ...(issue.tripId && { tripId: issue.tripId }),
  ...(issue.orderId && { orderId: orderReference(issue.orderId) }),
});

/** What one order ended up as at its stop. */
export interface DeliveryLine {
  orderId: number;
  delivered: number;
  ordered: number;
}

const deliveryLines = (lines: DeliveryLine[]): string =>
  lines
    .map(
      (line) =>
        `${orderReference(line.orderId)}: ${line.delivered} of ${plural(line.ordered, 'case')}`,
    )
    .join('; ');

/**
 * Every notification the system sends, worded in one place. Each builder
 * takes the facts of the moment and returns what the recipient reads.
 */
export const notice = {
  tripAssigned: (trip: {
    id: string;
    tripNo: number;
    serviceDate: string;
    district: string | null;
    stops: number;
  }): Notice => ({
    type: NotificationType.TRIP_ASSIGNED,
    severity: INFO,
    title: `Trip ${trip.tripNo} assigned`,
    body: `${trip.district ?? 'Delivery run'} on ${trip.serviceDate}, ${plural(trip.stops, 'stop')}.`,
    data: { tripId: trip.id, date: trip.serviceDate },
  }),

  tripsToLoad: (date: string, trips: number): Notice => ({
    type: NotificationType.TRIPS_TO_LOAD,
    severity: INFO,
    title: `${plural(trips, 'trip')} to load on ${date}`,
    body: 'The delivery plan is published. Open the loading list for the vehicles and their orders.',
    data: { date },
  }),

  tripReady: (trip: { id: string; tripNo: number }): Notice => ({
    type: NotificationType.TRIP_READY,
    severity: INFO,
    title: `Trip ${trip.tripNo} is loaded and ready`,
    body: 'Get the start code from the loader to begin the trip.',
    data: { tripId: trip.id },
  }),

  routeChanged: (
    trip: { id: string; tripNo: number },
    reason: string,
  ): Notice => ({
    type: NotificationType.ROUTE_CHANGED,
    severity: ERROR,
    title: `Trip ${trip.tripNo} stop order changed`,
    body: `${reason} Review the new sequence before you continue.`,
    data: { tripId: trip.id },
  }),

  orderScheduled: (orderId: number, date: string): Notice => ({
    type: NotificationType.ORDER_SCHEDULED,
    severity: SUCCESS,
    title: `${orderReference(orderId)} scheduled for delivery`,
    body: `Your order is on the delivery plan for ${date}.`,
    data: { orderId: orderReference(orderId), date },
  }),

  orderDeferred: (
    orderId: number,
    reason: DeferralReason,
    deferredToDate: string | null,
  ): Notice => ({
    type: NotificationType.ORDER_DEFERRED,
    severity: WARNING,
    title: `${orderReference(orderId)} moved to a later delivery`,
    body: `Reason: ${reason.replace(/_/g, ' ')}.${deferredToDate ? ` It joins the delivery run for ${deferredToDate}.` : ''}`,
    data: {
      orderId: orderReference(orderId),
      ...(deferredToDate && { date: deferredToDate }),
    },
  }),

  orderOutForDelivery: (orderIds: number[]): Notice => ({
    type: NotificationType.ORDER_OUT_FOR_DELIVERY,
    severity: INFO,
    title: 'Your delivery is on the way',
    body: `${refs(orderIds)} left the depot. The delivery code has been sent by SMS.`,
    data: { orderId: orderReference(orderIds[0]) },
  }),

  /** For the outlet: what was handed over at its stop. */
  deliveryRecorded: (lines: DeliveryLine[]): Notice => {
    const nothing = lines.every((line) => line.delivered === 0);
    const short = lines.some((line) => line.delivered < line.ordered);
    return {
      type: NotificationType.DELIVERY_RECORDED,
      severity: nothing ? ERROR : short ? WARNING : SUCCESS,
      title: nothing
        ? 'Delivery not completed'
        : short
          ? 'Delivery completed with a shortfall'
          : 'Delivery completed',
      body: `${deliveryLines(lines)}.`,
      data: { orderId: orderReference(lines[0].orderId) },
    };
  },

  /** For the dispatcher: a stop where not everything was handed over. */
  deliveryProblem: (
    trip: { id: string; tripNo: number },
    outletName: string,
    lines: DeliveryLine[],
  ): Notice => ({
    type: NotificationType.DELIVERY_PROBLEM,
    severity: WARNING,
    title: `Short delivery at ${outletName}`.slice(0, 150),
    body: `Trip ${trip.tripNo}. ${deliveryLines(lines.filter((line) => line.delivered < line.ordered))}.`,
    data: { tripId: trip.id, orderId: orderReference(lines[0].orderId) },
  }),

  planDraftReady: (plan: {
    depot: string;
    date: string;
    trips: number;
    deferred: number;
  }): Notice => ({
    type: NotificationType.PLAN_DRAFT_READY,
    severity: INFO,
    title: `Draft plan ready: ${plan.depot}, ${plan.date}`,
    body: `${plural(plan.trips, 'trip')}, ${plural(plan.deferred, 'order')} deferred. Review and publish it.`,
    data: { depot: plan.depot, date: plan.date },
  }),

  planRunFailed: (depot: string, date: string, message: string): Notice => ({
    type: NotificationType.PLAN_RUN_FAILED,
    severity: ERROR,
    title: `Planning run failed: ${depot}, ${date}`,
    body: `${message} Run planning by hand once this is fixed.`,
    data: { depot, date },
  }),

  issueReported: (issue: IssueFacts & { description: string }): Notice => ({
    type: NotificationType.ISSUE_REPORTED,
    severity: URGENT_ISSUES.has(issue.type) ? ERROR : WARNING,
    title: `${ISSUE_TITLES[issue.type]} reported`,
    body: issue.orderId
      ? `${orderReference(issue.orderId)}: ${issue.description}`
      : issue.description,
    data: issueData(issue),
  }),

  issueAcknowledged: (issue: IssueFacts): Notice => ({
    type: NotificationType.ISSUE_ACKNOWLEDGED,
    severity: INFO,
    title: 'Your report is being reviewed',
    body: `${ISSUE_TITLES[issue.type]}: the dispatcher has seen it.`,
    data: issueData(issue),
  }),

  issueResolved: (issue: IssueFacts, resolutionNote: string): Notice => ({
    type: NotificationType.ISSUE_RESOLVED,
    severity: SUCCESS,
    title: 'Your report was resolved',
    body: `${ISSUE_TITLES[issue.type]}: ${resolutionNote}`,
    data: issueData(issue),
  }),
};
