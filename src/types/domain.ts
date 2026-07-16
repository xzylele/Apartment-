export type UserRole = "owner" | "staff" | "tenant";

export type DashboardSummary = {
  totalRooms: number;
  vacantRooms: number;
  occupiedRooms: number;
  overdueInvoices: number;
  monthlyIncome: number;
  pendingMaintenance: number;
};
