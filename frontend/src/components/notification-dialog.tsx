import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import WarningRounded from "@mui/icons-material/WarningRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import InfoRounded from "@mui/icons-material/InfoRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import FiberManualRecordRounded from "@mui/icons-material/FiberManualRecordRounded";
import { cn } from "@/lib/utils";

type NotificationType = "error" | "warning" | "success" | "info";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  time: string;
  unread: boolean;
  actionNeeded?: boolean;
  description?: string;
  details?: {
    order?: string;
    reportedBy?: string;
    run?: string;
    status?: string;
  };
  actionText?: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    type: "error",
    title: "Loading shortfall reported",
    time: "5 min ago",
    unread: true,
    actionNeeded: true,
    description:
      "The loading team reported missing items for DEMO-103. Review the quantities and decide the next action.",
    details: {
      order: "DEMO-103",
      reportedBy: "Loading team",
      run: "Earlier run · 26 Sep 2026",
      status: "Awaiting review",
    },
    actionText: "View order DEMO-103",
  },
  {
    id: "2",
    type: "warning",
    title: "Chilled order needs a vehicle",
    time: "8 min ago",
    unread: true,
    description:
      "DEMO-108 requires a refrigerated van. The current allocation cannot accommodate it.",
    actionText: "Reassign Vehicle",
  },
  {
    id: "3",
    type: "success",
    title: "DEMO-109 delivery confirmed",
    time: "2h ago",
    unread: true,
    description:
      "Customer signed off at 14:32. All 18 items received in good condition.",
    actionText: "Reassign Vehicle",
  },
  {
    id: "4",
    type: "info",
    title: "Late departure – Run R-042",
    time: "3h ago",
    unread: true,
    description:
      "Vehicle left depot 22 min behind schedule. ETA for first drop updated.",
    actionText: "Reassign Vehicle",
  },
];


const statusStyles = {
  error: {
    card: "bg-wp-red-50 outline-wp-red-100",
    iconSurface: "bg-wp-red-50",
    foreground: "text-wp-red-700",
    icon: ErrorRounded,
  },
  warning: {
    card: "bg-wp-yellow-50 outline-wp-yellow-300",
    iconSurface: "bg-wp-yellow-100",
    foreground: "text-wp-yellow-600",
    icon: WarningRounded,
  },
  success: {
    card: "bg-wp-lime-50 outline-wp-lime-200",
    iconSurface: "bg-wp-lime-100",
    foreground: "text-wp-text-success-primary",
    icon: CheckCircleRounded,
  },
  info: {
    card: "bg-wp-blue-50 outline-wp-blue-200",
    iconSurface: "bg-wp-blue-100",
    foreground: "text-wp-blue-500",
    icon: InfoRounded,
  },
};

function UnreadIndicator({ unread }: { unread: boolean }) {
  if (!unread) return null;

  return (
    <FiberManualRecordRounded
      aria-label="Unread notification"
      titleAccess="Unread notification"
      fontSize="inherit"
      viewBox="4 4 16 16"
      className="size-wp-space-sm shrink-0 text-wp-blue-500"
    />
  );
}

function NotificationCard({ item }: { item: NotificationItem }) {
  const styles = statusStyles[item.type];
  const StatusIcon = styles.icon;

  return (
    <article
      className={cn(
        "w-full shrink-0 overflow-hidden outline outline-1 -outline-offset-1",
        item.details ? "rounded-wp-radius-xl" : "rounded-wp-radius-md",
        styles.card,
      )}
    >
      {item.details ? (
        <>
          <div className="flex items-start gap-wp-space-lg px-wp-space-lg pt-wp-space-lg pb-wp-space-md">
            <StatusIcon fontSize="inherit" className={cn("size-wp-space-3xl shrink-0", styles.foreground)} />
            <div className="flex min-w-0 flex-1 flex-col gap-wp-space-sm">
              <h3 className="text-wp-text-primary type-text-sm-bold">{item.title}</h3>
              <div className="flex flex-wrap items-center gap-wp-space-sm type-text-xs-regular">
                {item.actionNeeded && (
                  <span className="text-wp-text-error-primary type-text-xs-semibold">Action needed</span>
                )}
                <span className="text-wp-text-tertiary">{item.actionNeeded && "· "}{item.time}</span>
              </div>
            </div>
            <UnreadIndicator unread={item.unread} />
          </div>
          <div className="px-wp-space-md pb-wp-space-md">
            <div className="flex flex-col gap-wp-space-3xl rounded-wp-radius-md bg-wp-neutral-50 p-wp-space-lg outline outline-1 -outline-offset-1 outline-wp-red-200">
              <p className="text-wp-text-secondary type-text-sm-regular">{item.description}</p>
              <div className="flex flex-col gap-wp-space-lg">
                <dl className="grid grid-cols-2 gap-x-wp-space-md gap-y-wp-space-md type-text-xs-regular">
                  {[
                    ["Order", item.details.order],
                    ["Reported by", item.details.reportedBy],
                    ["Run", item.details.run],
                    ["Status", item.details.status],
                  ].map(([label, value]) => (
                    <div key={label} className="flex min-w-0 flex-col gap-wp-space-sm">
                      <dt className="text-wp-text-tertiary type-text-xs-medium">{label}</dt>
                      <dd className="text-wp-text-primary type-text-xs-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                {item.actionText && (
                  <Button
                    className="h-wp-space-5xl w-full gap-wp-space-md rounded-wp-radius-xs bg-wp-red-500 px-wp-space-lg text-wp-text-white hover:bg-wp-red-600 type-text-md-semibold"
                  >
                    {item.actionText}
                    <ArrowForwardRounded fontSize="inherit" className="size-wp-space-2xl" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-wp-space-md p-wp-space-lg">
            <div className={cn("flex size-wp-space-4xl shrink-0 items-center justify-center rounded-wp-radius-2xl", styles.iconSurface)}>
              <StatusIcon fontSize="inherit" className={cn("size-wp-space-2xl", styles.foreground)} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-wp-space-xs">
              <h3 className="text-wp-text-primary type-text-sm-bold">{item.title}</h3>
              <p className="text-wp-text-secondary type-text-sm-regular">{item.description}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-wp-space-sm">
              <span className="text-wp-text-tertiary type-text-xs-regular">{item.time}</span>
              <UnreadIndicator unread={item.unread} />
            </div>
          </div>
          {item.actionText && (
            <div className="flex justify-end">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-wp-space-md rounded-wp-radius-xs p-wp-space-lg hover:bg-wp-neutral-50 focus-visible:outline-2 focus-visible:outline-wp-yellow-500 type-text-sm-semibold",
                  item.type === "warning" ? "text-wp-yellow-600" : styles.foreground,
                )}
              >
                <span className="underline decoration-from-font [text-underline-position:from-font]">{item.actionText}</span>
                <ArrowForwardRounded fontSize="inherit" className="size-wp-space-2xl" />
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function NotificationDialog() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<"All" | "Errors" | "Success" | "Info">("All");

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "Errors") return item.type === "error" || item.type === "warning";
    if (activeTab === "Success") return item.type === "success";
    if (activeTab === "Info") return item.type === "info";
    return true;
  });

  const tabs = [
    { label: "All", count: notifications.length },
    { label: "Errors", count: notifications.filter((item) => item.type === "error" || item.type === "warning").length },
    { label: "Success", count: notifications.filter((item) => item.type === "success").length },
    { label: "Info", count: notifications.filter((item) => item.type === "info").length },
  ] as const;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="h-wp-space-4xl gap-wp-space-sm rounded-wp-radius-lg px-wp-space-lg type-text-sm-medium" />}>
        Open Notifications
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex w-wp-spacing-120 max-w-[calc(100%-var(--wp-space-4xl))] max-h-[calc(100dvh-var(--wp-space-4xl))] flex-col gap-wp-space-none overflow-hidden rounded-wp-radius-2xl border-0 bg-wp-neutral-50 p-wp-space-none shadow-none ring-0 sm:max-w-[calc(100%-var(--wp-space-4xl))]"
      >
        <div className="flex h-wp-space-6xl shrink-0 items-center justify-between border-b border-wp-neutral-200 bg-wp-neutral-50 px-wp-space-lg">
          <DialogTitle className="shrink-0 whitespace-nowrap text-wp-text-primary type-text-sm-medium">Notification</DialogTitle>
          <div className="flex shrink-0 items-center gap-wp-space-lg">
            <button type="button" onClick={markAllAsRead} className="whitespace-nowrap rounded-wp-radius-xs p-wp-space-lg text-wp-blue-600 underline decoration-from-font [text-underline-position:from-font] hover:text-wp-blue-700 focus-visible:outline-2 focus-visible:outline-wp-yellow-500 type-text-sm-semibold">
              Mark All Read
            </button>
            <DialogClose aria-label="Close notifications" className="flex size-wp-space-4xl items-center justify-center rounded-wp-radius-sm border border-wp-neutral-400 text-wp-neutral-600 hover:bg-wp-neutral-100 type-text-lg-medium">
              <CloseRounded fontSize="inherit" className="size-wp-space-2xl" />
            </DialogClose>
          </div>
        </div>
        <DialogDescription className="sr-only">Delivery alerts and updates. Filter notifications or mark them all as read.</DialogDescription>
        <div className="flex h-wp-space-7xl shrink-0 items-center px-wp-space-lg py-wp-space-md">
          <div role="group" aria-label="Filter notifications" className="flex w-full items-center justify-between rounded-wp-radius-lg bg-wp-neutral-100 p-wp-space-xs">
            {tabs.map(({ label, count }) => (
              <button
                key={label}
                type="button"
                aria-pressed={activeTab === label}
                onClick={() => setActiveTab(label)}
                className={cn(
                  "flex items-center justify-center gap-wp-space-sm rounded-wp-radius-md px-wp-space-lg py-wp-space-md focus-visible:outline-2 focus-visible:outline-wp-yellow-500 max-sm:px-wp-space-sm",
                  activeTab === label ? "bg-wp-neutral-50" : "hover:bg-wp-neutral-50",
                )}
              >
                <span className={cn(activeTab === label ? "text-wp-text-primary type-text-sm-medium" : "text-wp-text-secondary type-text-sm-regular")}>{label}</span>
                <span className="text-wp-text-quaternary type-text-sm-regular">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-wp-space-md overflow-y-auto px-wp-space-lg pb-wp-space-sm">
          {filteredNotifications.map((item) => <NotificationCard key={item.id} item={item} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
