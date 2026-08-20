// Cột `rooms.view_type` là varchar + CHECK, không phải Postgres enum — nên
// dùng type + const object thay vì TS `enum`, khớp đúng bản chất cột DB.
export type RoomViewType = 'CITY_VIEW' | 'GARDEN_VIEW' | 'SEA_VIEW';
export const RoomViewType = {
  CITY_VIEW: 'CITY_VIEW',
  GARDEN_VIEW: 'GARDEN_VIEW',
  SEA_VIEW: 'SEA_VIEW',
} as const satisfies Record<string, RoomViewType>;
