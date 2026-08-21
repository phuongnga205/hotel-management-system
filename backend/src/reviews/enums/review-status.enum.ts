export type ReviewStatus = 'PUBLISHED';
export const ReviewStatus = {
  PUBLISHED: 'PUBLISHED',
} as const satisfies Record<string, ReviewStatus>;
