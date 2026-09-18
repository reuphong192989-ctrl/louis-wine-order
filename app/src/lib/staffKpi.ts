import { listAllOrdersRaw } from "./sheets/orders";
import { listStaffCalls } from "./sheets/staffCalls";
import { listTableSwitchLog } from "./sheets/tableSwitchLog";
import { listStaffIncidents, type StaffIncident } from "./sheets/staffIncidents";

export type StaffKpi = {
  username: string;
  confirmedOrders: number;
  cancelledOrders: number;
  handledStaffCalls: number;
  avgResponseSeconds: number | null;
  tableSwitches: number;
  incidents: StaffIncident[];
};

function within(iso: string, fromIso: string, toIso: string): boolean {
  return iso >= fromIso && iso <= toIso;
}

/** Aggregates one staff member's auto-tracked activity + manually-logged incidents over [fromIso, toIso] — powers the monthly review page. */
export async function computeStaffKpi(username: string, fromIso: string, toIso: string): Promise<StaffKpi> {
  const [orders, calls, switches, incidents] = await Promise.all([
    listAllOrdersRaw(),
    listStaffCalls(undefined, 100000),
    listTableSwitchLog(100000),
    listStaffIncidents(),
  ]);

  const confirmedOrders = orders.filter(
    (o) => o.confirmedBy === username && o.confirmedAt && within(o.confirmedAt, fromIso, toIso)
  ).length;
  const cancelledOrders = orders.filter(
    (o) => o.cancelledBy === username && o.cancelledAt && within(o.cancelledAt, fromIso, toIso)
  ).length;

  const handledCalls = calls.filter(
    (c) => c.acknowledgedBy === username && c.acknowledgedAt && within(c.acknowledgedAt, fromIso, toIso)
  );
  const responseTimes = handledCalls.map(
    (c) => (new Date(c.acknowledgedAt!).getTime() - new Date(c.createdAt).getTime()) / 1000
  );
  const avgResponseSeconds =
    responseTimes.length > 0 ? Math.round(responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length) : null;

  const tableSwitches = switches.filter((s) => s.username === username && within(s.createdAt, fromIso, toIso)).length;

  const userIncidents = incidents.filter((i) => i.username === username && within(i.createdAt, fromIso, toIso));

  return {
    username,
    confirmedOrders,
    cancelledOrders,
    handledStaffCalls: handledCalls.length,
    avgResponseSeconds,
    tableSwitches,
    incidents: userIncidents,
  };
}
