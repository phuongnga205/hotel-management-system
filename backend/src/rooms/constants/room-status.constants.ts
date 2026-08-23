export const ROOM_STATUS_CHECK_CONSTRAINT = 'chk_rooms_status';

// A migration must update this database constraint whenever RoomStatus changes.
export const ROOM_STATUS_CHECK_EXPRESSION = `"status" IN ('ACTIVE','INACTIVE','MAINTENANCE')`;
