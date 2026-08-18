// Administrative status only — whether the room is offered at all.
// Date-by-date availability is derived from bookings, not stored here.
export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}
