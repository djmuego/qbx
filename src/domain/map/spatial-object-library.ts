import type { MapObjectKind, MapMounting } from './space-map.types';

export type ObjectLibraryCategory =
  | 'plants'
  | 'structure'
  | 'light'
  | 'climate'
  | 'sensors'
  | 'irrigation'
  | 'qbx'
  | 'infrastructure'
  | 'outdoor';

export interface ObjectLibraryItem {
  id: string;
  category: ObjectLibraryCategory;
  label: string;
  kind: MapObjectKind;
  role?: string;
  mounting?: MapMounting;
  widthM: number;
  heightM: number;
  sizeZM: number;
}

export const OBJECT_LIBRARY: ObjectLibraryItem[] = [
  { id: 'plant-single', category: 'plants', label: 'Растение', kind: 'plant', mounting: 'floor', widthM: 0.3, heightM: 0.3, sizeZM: 0.45 },
  { id: 'plant-group', category: 'plants', label: 'Группа растений', kind: 'plant_group', mounting: 'floor', widthM: 1.2, heightM: 0.8, sizeZM: 0.5 },
  { id: 'plant-row', category: 'plants', label: 'Ряд', kind: 'plant_group', role: 'row', mounting: 'floor', widthM: 2, heightM: 0.4, sizeZM: 0.45 },
  { id: 'grow-bed', category: 'plants', label: 'Grow bed', kind: 'structure', role: 'grow_bed', mounting: 'floor', widthM: 1.2, heightM: 0.6, sizeZM: 0.35 },
  { id: 'tray', category: 'plants', label: 'Лоток', kind: 'structure', role: 'tray', mounting: 'floor', widthM: 0.5, heightM: 0.3, sizeZM: 0.08 },
  { id: 'table', category: 'structure', label: 'Стол', kind: 'structure', role: 'table', mounting: 'floor', widthM: 1.2, heightM: 0.6, sizeZM: 0.75 },
  { id: 'rack', category: 'structure', label: 'Стеллаж', kind: 'structure', role: 'rack', mounting: 'floor', widthM: 1.2, heightM: 0.5, sizeZM: 1.8 },
  { id: 'shelf', category: 'structure', label: 'Полка', kind: 'structure', role: 'shelf', mounting: 'wall', widthM: 0.8, heightM: 0.25, sizeZM: 0.06 },
  { id: 'grow-rack', category: 'structure', label: 'Grow rack', kind: 'structure', role: 'grow_rack', mounting: 'floor', widthM: 1.2, heightM: 0.6, sizeZM: 2 },
  { id: 'pallet', category: 'structure', label: 'Поддон', kind: 'structure', role: 'pallet', mounting: 'floor', widthM: 1.2, heightM: 0.8, sizeZM: 0.14 },
  { id: 'reservoir-struct', category: 'structure', label: 'Резервуар', kind: 'irrigation', role: 'reservoir', mounting: 'floor', widthM: 0.5, heightM: 0.5, sizeZM: 0.6 },
  { id: 'tent-shell', category: 'structure', label: 'Grow tent', kind: 'structure', role: 'tent', mounting: 'floor', widthM: 1.2, heightM: 1.2, sizeZM: 2 },
  { id: 'partition', category: 'structure', label: 'Перегородка', kind: 'structure', role: 'partition', mounting: 'floor', widthM: 0.08, heightM: 2, sizeZM: 2.2 },
  { id: 'led-board', category: 'light', label: 'LED board', kind: 'light', role: 'led_board', mounting: 'hanging', widthM: 0.6, heightM: 0.6, sizeZM: 0.05 },
  { id: 'led-bar', category: 'light', label: 'LED bar', kind: 'light', role: 'led_bar', mounting: 'hanging', widthM: 1.2, heightM: 0.12, sizeZM: 0.05 },
  { id: 'led-hanging', category: 'light', label: 'Подвесной светильник', kind: 'light', role: 'hanging', mounting: 'hanging', widthM: 0.9, heightM: 0.3, sizeZM: 0.06 },
  { id: 'led-side', category: 'light', label: 'Боковая подсветка', kind: 'light', role: 'side', mounting: 'wall', widthM: 0.12, heightM: 0.6, sizeZM: 0.08 },
  { id: 'exhaust', category: 'climate', label: 'Вытяжка', kind: 'equipment', role: 'exhaust', mounting: 'wall', widthM: 0.28, heightM: 0.28, sizeZM: 0.22 },
  { id: 'circulation', category: 'climate', label: 'Циркуляция', kind: 'equipment', role: 'circulation', mounting: 'floor', widthM: 0.22, heightM: 0.22, sizeZM: 0.35 },
  { id: 'intake', category: 'climate', label: 'Приток', kind: 'equipment', role: 'intake', mounting: 'wall', widthM: 0.28, heightM: 0.28, sizeZM: 0.2 },
  { id: 'humidifier', category: 'climate', label: 'Увлажнитель', kind: 'equipment', role: 'humidifier', mounting: 'floor', widthM: 0.25, heightM: 0.25, sizeZM: 0.4 },
  { id: 'dehumidifier', category: 'climate', label: 'Осушитель', kind: 'equipment', role: 'dehumidifier', mounting: 'floor', widthM: 0.3, heightM: 0.3, sizeZM: 0.45 },
  { id: 'heater', category: 'climate', label: 'Нагреватель', kind: 'equipment', role: 'heater', mounting: 'floor', widthM: 0.25, heightM: 0.2, sizeZM: 0.35 },
  { id: 'ac', category: 'climate', label: 'Охлаждение', kind: 'equipment', role: 'hvac', mounting: 'wall', widthM: 0.7, heightM: 0.25, sizeZM: 0.25 },
  { id: 'sensor-trh', category: 'sensors', label: 'T / RH', kind: 'sensor', role: 'temperature', mounting: 'wall', widthM: 0.12, heightM: 0.08, sizeZM: 0.08 },
  { id: 'sensor-co2', category: 'sensors', label: 'CO₂', kind: 'sensor', role: 'co2', mounting: 'wall', widthM: 0.12, heightM: 0.08, sizeZM: 0.08 },
  { id: 'sensor-light', category: 'sensors', label: 'Свет / PPFD', kind: 'sensor', role: 'light', mounting: 'free', widthM: 0.1, heightM: 0.08, sizeZM: 0.06 },
  { id: 'sensor-soil', category: 'sensors', label: 'Субстрат', kind: 'sensor', role: 'soil_moisture', mounting: 'floor', widthM: 0.08, heightM: 0.08, sizeZM: 0.12 },
  { id: 'sensor-ec', category: 'sensors', label: 'EC', kind: 'sensor', role: 'ec', mounting: 'free', widthM: 0.08, heightM: 0.08, sizeZM: 0.1 },
  { id: 'sensor-ph', category: 'sensors', label: 'pH', kind: 'sensor', role: 'ph', mounting: 'free', widthM: 0.08, heightM: 0.08, sizeZM: 0.1 },
  { id: 'sensor-water-t', category: 'sensors', label: 'T воды', kind: 'sensor', role: 'water_temperature', mounting: 'free', widthM: 0.08, heightM: 0.08, sizeZM: 0.08 },
  { id: 'sensor-generic', category: 'sensors', label: 'Датчик', kind: 'sensor', role: 'generic', mounting: 'wall', widthM: 0.1, heightM: 0.08, sizeZM: 0.08 },
  { id: 'pump', category: 'irrigation', label: 'Насос', kind: 'irrigation', role: 'pump', mounting: 'floor', widthM: 0.2, heightM: 0.16, sizeZM: 0.18 },
  { id: 'tank', category: 'irrigation', label: 'Бак', kind: 'irrigation', role: 'reservoir', mounting: 'floor', widthM: 0.45, heightM: 0.45, sizeZM: 0.55 },
  { id: 'valve', category: 'irrigation', label: 'Клапан', kind: 'irrigation', role: 'valve', mounting: 'wall', widthM: 0.12, heightM: 0.1, sizeZM: 0.1 },
  { id: 'manifold', category: 'irrigation', label: 'Коллектор', kind: 'irrigation', role: 'manifold', mounting: 'wall', widthM: 0.3, heightM: 0.12, sizeZM: 0.1 },
  { id: 'irr-line', category: 'irrigation', label: 'Линия полива', kind: 'irrigation', role: 'line', mounting: 'floor', widthM: 1.2, heightM: 0.06, sizeZM: 0.04 },
  { id: 'emitter', category: 'irrigation', label: 'Капельница', kind: 'irrigation', role: 'emitter', mounting: 'floor', widthM: 0.08, heightM: 0.08, sizeZM: 0.04 },
  { id: 'hub', category: 'qbx', label: 'QBX Hub', kind: 'hub', role: 'hub', mounting: 'wall', widthM: 0.22, heightM: 0.12, sizeZM: 0.16 },
  { id: 'relay', category: 'qbx', label: 'Реле / контроллер', kind: 'hub', role: 'relay', mounting: 'wall', widthM: 0.18, heightM: 0.1, sizeZM: 0.12 },
  { id: 'sensor-module', category: 'qbx', label: 'Модуль датчиков', kind: 'hub', role: 'sensor_module', mounting: 'wall', widthM: 0.16, heightM: 0.1, sizeZM: 0.1 },
  { id: 'power-module', category: 'qbx', label: 'Силовой модуль', kind: 'hub', role: 'power_module', mounting: 'wall', widthM: 0.2, heightM: 0.12, sizeZM: 0.14 },
  { id: 'outlet', category: 'infrastructure', label: 'Розетка', kind: 'outlet', role: 'outlet', mounting: 'wall', widthM: 0.1, heightM: 0.06, sizeZM: 0.08 },
  { id: 'panel', category: 'infrastructure', label: 'Электрощит', kind: 'electrical_panel', role: 'panel', mounting: 'wall', widthM: 0.35, heightM: 0.12, sizeZM: 0.45 },
  { id: 'door', category: 'infrastructure', label: 'Дверь', kind: 'structure', role: 'door', mounting: 'wall', widthM: 0.9, heightM: 0.08, sizeZM: 2.1 },
  { id: 'window', category: 'infrastructure', label: 'Окно', kind: 'structure', role: 'window', mounting: 'wall', widthM: 1.2, heightM: 0.08, sizeZM: 1 },
  { id: 'camera', category: 'infrastructure', label: 'Камера', kind: 'camera', role: 'camera', mounting: 'wall', widthM: 0.12, heightM: 0.1, sizeZM: 0.1 },
  { id: 'path', category: 'outdoor', label: 'Дорожка', kind: 'structure', role: 'path', mounting: 'floor', widthM: 2, heightM: 0.8, sizeZM: 0.03 },
  { id: 'fence', category: 'outdoor', label: 'Забор', kind: 'structure', role: 'fence', mounting: 'floor', widthM: 3, heightM: 0.08, sizeZM: 1.2 },
  { id: 'gate', category: 'outdoor', label: 'Ворота', kind: 'structure', role: 'gate', mounting: 'floor', widthM: 1.2, heightM: 0.1, sizeZM: 1.5 },
  { id: 'shade-net', category: 'outdoor', label: 'Затеняющая сетка', kind: 'structure', role: 'shade_net', mounting: 'hanging', widthM: 4, heightM: 4, sizeZM: 0.02 },
  { id: 'greenhouse', category: 'outdoor', label: 'Теплица', kind: 'structure', role: 'greenhouse', mounting: 'floor', widthM: 8, heightM: 4, sizeZM: 3.2 },
  { id: 'shed', category: 'outdoor', label: 'Сарай', kind: 'structure', role: 'shed', mounting: 'floor', widthM: 3, heightM: 2.5, sizeZM: 2.4 },
  { id: 'service-area', category: 'outdoor', label: 'Служебная зона', kind: 'structure', role: 'service_area', mounting: 'floor', widthM: 4, heightM: 3, sizeZM: 0.05 },
  { id: 'weather-station', category: 'outdoor', label: 'Метеостанция', kind: 'sensor', role: 'weather_station', mounting: 'floor', widthM: 0.4, heightM: 0.4, sizeZM: 2 },
  { id: 'tree', category: 'outdoor', label: 'Дерево', kind: 'plant', role: 'tree', mounting: 'floor', widthM: 0.8, heightM: 0.8, sizeZM: 2.5 },
  { id: 'shrub', category: 'outdoor', label: 'Куст', kind: 'plant', role: 'shrub', mounting: 'floor', widthM: 0.5, heightM: 0.5, sizeZM: 0.8 },
  { id: 'crop-row', category: 'outdoor', label: 'Культурный ряд', kind: 'plant_group', role: 'crop_row', mounting: 'floor', widthM: 4, heightM: 0.5, sizeZM: 0.4 },
  { id: 'seedling-group', category: 'outdoor', label: 'Рассада', kind: 'plant_group', role: 'seedling_group', mounting: 'floor', widthM: 1.5, heightM: 0.8, sizeZM: 0.25 },
  { id: 'water-tank', category: 'outdoor', label: 'Бак воды', kind: 'irrigation', role: 'reservoir', mounting: 'floor', widthM: 2, heightM: 2, sizeZM: 1.8 },
  { id: 'pump-station', category: 'outdoor', label: 'Насосная', kind: 'irrigation', role: 'pump_station', mounting: 'floor', widthM: 1.5, heightM: 1, sizeZM: 1.2 },
  { id: 'utility-box', category: 'outdoor', label: 'Щит / утилиты', kind: 'equipment', role: 'utility_box', mounting: 'floor', widthM: 0.6, heightM: 0.4, sizeZM: 1 },
  { id: 'irrigation-manifold', category: 'outdoor', label: 'Коллектор полива', kind: 'irrigation', role: 'manifold', mounting: 'wall', widthM: 0.5, heightM: 0.2, sizeZM: 0.3 },
  { id: 'sprinkler', category: 'outdoor', label: 'Спринклер', kind: 'irrigation', role: 'sprinkler', mounting: 'floor', widthM: 0.15, heightM: 0.15, sizeZM: 0.35 },
  { id: 'drip-point', category: 'outdoor', label: 'Капельница', kind: 'irrigation', role: 'emitter', mounting: 'floor', widthM: 0.08, heightM: 0.08, sizeZM: 0.04 },
  { id: 'sensor-rain', category: 'sensors', label: 'Дождь', kind: 'sensor', role: 'rain', mounting: 'free', widthM: 0.1, heightM: 0.1, sizeZM: 0.1 },
  { id: 'sensor-wind', category: 'sensors', label: 'Ветер', kind: 'sensor', role: 'wind', mounting: 'free', widthM: 0.1, heightM: 0.1, sizeZM: 0.1 },
  { id: 'sensor-solar', category: 'sensors', label: 'Солнечная радиация', kind: 'sensor', role: 'solar_radiation', mounting: 'free', widthM: 0.12, heightM: 0.1, sizeZM: 0.08 },
  { id: 'sensor-flow', category: 'sensors', label: 'Поток', kind: 'sensor', role: 'flow', mounting: 'free', widthM: 0.1, heightM: 0.08, sizeZM: 0.08 },
  { id: 'sensor-water-level', category: 'sensors', label: 'Уровень воды', kind: 'sensor', role: 'water_level', mounting: 'free', widthM: 0.1, heightM: 0.08, sizeZM: 0.1 },
];

export const LIBRARY_CATEGORY_LABELS: Record<ObjectLibraryCategory, string> = {
  plants: 'Растения',
  structure: 'Конструкции',
  light: 'Свет',
  climate: 'Климат',
  sensors: 'Датчики',
  irrigation: 'Полив',
  qbx: 'QBX',
  infrastructure: 'Инфраструктура',
  outdoor: 'Улица / участок',
};

export function libraryItemById(id: string) {
  return OBJECT_LIBRARY.find((i) => i.id === id);
}
