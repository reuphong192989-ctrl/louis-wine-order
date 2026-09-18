import { randomUUID } from "crypto";
import { appendRow, deleteRow, readAllRows, cell } from "./core";

const TAB = "StaffIncidents";
const HEADERS = ["id", "username", "severity", "description", "createdBy", "createdAt"];

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";

export type StaffIncident = {
  id: string;
  username: string;
  severity: IncidentSeverity;
  description: string;
  createdBy: string;
  createdAt: string;
};

function decode(values: Record<string, string>): StaffIncident {
  return {
    id: values.id,
    username: values.username,
    severity: values.severity as IncidentSeverity,
    description: values.description,
    createdBy: values.createdBy,
    createdAt: values.createdAt,
  };
}

/** Manager-entered record of a specific mistake/incident tied to a staff member — feeds the monthly review alongside the auto-tracked KPI counts. */
export async function createStaffIncident(input: {
  username: string;
  severity: IncidentSeverity;
  description: string;
  createdBy: string;
}): Promise<StaffIncident> {
  const incident: StaffIncident = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  await appendRow(TAB, HEADERS, {
    id: incident.id,
    username: incident.username,
    severity: incident.severity,
    description: incident.description,
    createdBy: incident.createdBy,
    createdAt: incident.createdAt,
  });
  return incident;
}

export async function listStaffIncidents(): Promise<StaffIncident[]> {
  const rows = await readAllRows(TAB);
  const incidents = rows.map((r) => decode(r.values));
  incidents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return incidents;
}

export async function deleteStaffIncident(id: string): Promise<boolean> {
  const rows = await readAllRows(TAB);
  const row = rows.find((r) => r.values.id === id);
  if (!row) return false;
  await deleteRow(TAB, row.rowNumber);
  return true;
}

export const STAFF_INCIDENTS_TAB = TAB;
export const STAFF_INCIDENTS_HEADERS = HEADERS;
