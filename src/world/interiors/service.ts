/** SERVICE (PRD §7.8; a fallback): reception, the work floor, the back office. */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { label, stationAt, type Interior, type Station } from './types';

export const STATIONS: readonly Station[] = [
  { id: 'reception', label: 'Reception', tags: ['reception', 'customers', 'customer', 'clients', 'client', 'patients', 'patient', 'visitors', 'front', 'sales', 'marketing', 'revenue', 'booking', 'bookings', 'guests', 'students', 'members', 'subscribers', 'accounts'], anchor: [0.2, 0.72] },
  { id: 'floor', label: 'Work floor', tags: ['work', 'floor', 'staff', 'labour', 'labor', 'doctors', 'nurses', 'teachers', 'engineers', 'consultants', 'hours', 'beds', 'bed', 'seats', 'tables', 'kitchen', 'food', 'materials', 'supplies', 'drugs', 'medicines', 'headcount', 'wages', 'salaries', 'crew', 'fuel'], anchor: [0.55, 0.4] },
  { id: 'office', label: 'Back office', tags: ['office', 'back', 'admin', 'overhead', 'overheads', 'rent', 'it', 'systems', 'sga', 'general', 'administrative', 'finance', 'interest', 'funding', 'provisions', 'claims'], anchor: [0.85, 0.2] },
];

export function build(p: Part, b: Box): void {
  const at = (id: string) => stationAt(b, STATIONS.find((s) => s.id === id)!);
  const [rx, ry] = at('reception'); p.box(rx - 1.2, ry - 0.3, 0, 2.4, 0.6, 1.0, 'n'); label(p, TOP, rx, ry, 'Reception');
  const [fx, fy] = at('floor'); for (let i = 0; i < 3; i++) p.box(fx - 1.8 + i * 1.4, fy - 0.5, 0, 1.0, 1.0, 0.7, 'n'); label(p, TOP, fx, fy + 0.4, 'Work floor');
  const [ox, oy] = at('office'); p.box(ox - 1.0, oy - 0.7, 0, 2.0, 1.4, 1.2, 'n'); label(p, TOP, ox, oy + 0.3, 'Back office');
}

export const SERVICE: Interior = { archetype: 'SERVICE', STATIONS, build };
