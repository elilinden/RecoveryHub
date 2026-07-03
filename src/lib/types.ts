export type Priority = "Urgent" | "High priority" | "Normal" | "Low priority";

export type MatterStage =
  | "New referral"
  | "Initial review"
  | "Investigation"
  | "Missing information"
  | "Ready for demand"
  | "Demand pending"
  | "Negotiation"
  | "Arbitration review"
  | "Litigation review"
  | "Recovery received"
  | "Under review"
  | "Awaiting client"
  | "Closed"
  | "No immediate action";

export type MatterStatus =
  | Priority
  | MatterStage
  | "Auto subrogation"
  | "Property damage"
  | "Workers' compensation recovery"
  | "Health-plan recovery"
  | "Commercial loss"
  | "Product-related loss"
  | "Construction loss"
  | "Insurance defense"
  | "Other"
  | "Deadline verified"
  | "Unverified statute deadline"
  | "Action overdue"
  | "Stale matter"
  | "Awaiting overdue response"
  | "No next action"
  | "Deadline soon"
  | "Draft intake"
  | "Intake in progress"
  | "Intake complete";

export type FollowUpReason =
  | "overdue_next_action"
  | "missing_next_action"
  | "stale_matter"
  | "awaiting_overdue_response"
  | "unverified_statute_deadline"
  | "upcoming_deadline";

export type SummaryMetric = {
  title: string;
  count: number;
  description: string;
  href: string;
  trend?: string;
  tone: "neutral" | "success" | "warning" | "urgent";
};

export type Matter = {
  id: string;
  intakeStatus?: "Draft" | "In progress" | "Complete";
  name: string;
  carrier: string;
  claimNumber: string;
  assignedAdjuster: string;
  carrierSupervisor?: string;
  amountSought: number;
  amountRecovered: number;
  assignedAttorney: string;
  assignedPerson: string;
  stage: MatterStage;
  priority: Priority;
  nextAction?: string;
  nextActionDueDate?: string;
  statuteDeadline: string;
  lastUpdated: string;
  lastSubstantiveActivity: string;
  daysSinceLastSubstantiveActivity: number;
  awaitingResponseDueDate?: string;
  status: MatterStage;
  type: string;
  deadlineVerified: boolean;
  followUpReasons: FollowUpReason[];
  notes: string;
};

export type QueueItem = Pick<
  Matter,
  | "id"
  | "name"
  | "carrier"
  | "amountSought"
  | "assignedAdjuster"
  | "assignedPerson"
  | "nextAction"
  | "nextActionDueDate"
  | "statuteDeadline"
  | "daysSinceLastSubstantiveActivity"
  | "deadlineVerified"
  | "followUpReasons"
  | "status"
  | "priority"
>;

export type ActivityItem = {
  id: string;
  matterId: string;
  title: string;
  description: string;
  date: string;
};

export type SavedViewScope = "personal" | "shared";

export type SavedView = {
  id: string;
  name: string;
  page: "matters";
  scope: SavedViewScope;
  description: string;
};
