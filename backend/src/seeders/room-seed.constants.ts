export const ROOM_SEED = {
  COUNT: 50,
  NUMBER_PREFIX: 'SEED-',
  NUMBER_PADDING: 3,
  AMENITIES_PER_ROOM: 3,
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 6,
  MIN_PRICE_MULTIPLIER: 5,
  MAX_PRICE_MULTIPLIER: 50,
  PRICE_STEP: 100_000,
  ENABLED_VALUE: 'true',
  DISABLED_VALUE: 'false',
} as const;

export const ROOM_SEED_AMENITIES = [
  { name: 'SEED_WI_FI', description: 'High-speed wireless internet' },
  {
    name: 'SEED_AIR_CONDITIONING',
    description: 'In-room air conditioning',
  },
  { name: 'SEED_TELEVISION', description: 'Smart television' },
  { name: 'SEED_MINI_BAR', description: 'In-room refreshments' },
  { name: 'SEED_BATHTUB', description: 'Private bathtub' },
  { name: 'SEED_BALCONY', description: 'Private balcony' },
  { name: 'SEED_WORK_DESK', description: 'Dedicated working area' },
  { name: 'SEED_ROOM_SAFE', description: 'In-room safety box' },
] as const;

export const ROOM_SEED_I18N_KEY = {
  DISABLED: 'messages.SEEDER.DISABLED',
  PRODUCTION: 'messages.SEEDER.PRODUCTION',
} as const;
