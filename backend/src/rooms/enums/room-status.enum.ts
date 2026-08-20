// Administrative status only — whether the room is offered at all.
// Date-by-date availability is derived from bookings, not stored here.
//
// Cột `rooms.status` là varchar + CHECK, không phải Postgres enum — nên
// dùng type + const object thay vì TS `enum`, khớp đúng bản chất cột DB
// (xem @Check ở room.entity.ts).
export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export const RoomStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
} as const satisfies Record<string, RoomStatus>;
