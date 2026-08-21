export const REVIEW_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const REVIEW_DATABASE_CONSTRAINT = {
  BOOKING_ID_UNIQUE: 'UQ_reviews_booking_id',
} as const;

export const REVIEW_ADMIN_DELETE_REASON = 'ADMIN_REMOVED';
