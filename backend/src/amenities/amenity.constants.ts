export const AMENITY_DATABASE_CONSTRAINT = {
  NAME_UNIQUE: 'UQ_amenities_name',
} as const;

export const AMENITY_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
