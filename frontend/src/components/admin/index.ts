// Barrel re-export so existing `from '.../components/admin'` imports keep working
// after the split into per-component files.

export * from './StatusBadge'
export * from './statusConfigs'
export * from './StatTile'
export * from './ConfirmModal'
export * from './Breadcrumb'
export * from './SearchInput'
export * from './AdminTable'
export * from './AmenityCheckboxGroup'
export { default as RoomImagePanel } from './RoomImagePanel'
export type { RoomImagePanelItem } from './RoomImagePanel'
