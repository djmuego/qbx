import type { MapObjectKind } from '../../domain/map/space-map.types';

export const MAP_KIND_COLORS: Record<MapObjectKind, { fill: string; stroke: string; text: string }> = {
  plant: { fill: '#d1fae5', stroke: '#059669', text: '#065f46' },
  plant_group: { fill: '#ecfdf5', stroke: '#10b981', text: '#047857' },
  sensor: { fill: '#e0f2fe', stroke: '#0284c7', text: '#075985' },
  equipment: { fill: '#f4f4f5', stroke: '#52525b', text: '#27272a' },
  light: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e' },
  irrigation: { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
  structure: { fill: '#f5f5f4', stroke: '#78716c', text: '#44403c' },
  camera: { fill: '#fae8ff', stroke: '#c026d3', text: '#86198f' },
  hub: { fill: '#ede9fe', stroke: '#7c3aed', text: '#5b21b6' },
  outlet: { fill: '#fef9c3', stroke: '#ca8a04', text: '#854d0e' },
  electrical_panel: { fill: '#ffedd5', stroke: '#ea580c', text: '#9a3412' },
};

export const MAP_KIND_EMOJI: Record<MapObjectKind, string> = {
  plant: '🌱',
  plant_group: '🪴',
  sensor: '🌡',
  equipment: '⚙',
  light: '💡',
  irrigation: '💧',
  structure: '📦',
  camera: '📷',
  hub: '⚡',
  outlet: '🔌',
  electrical_panel: '⬛',
};
