import type { Device } from '../device/device.types';
import type { Space } from '../space/space.types';
import type { MapPlacement, SpaceMap } from './space-map.types';
import { distanceM, placementCenter } from './space-map.geometry';

export interface OutdoorSpatialQueryResult {
  answer: string;
  count?: number;
  placementIds?: string[];
}

function beds(map: SpaceMap): MapPlacement[] {
  return map.placements.filter((p) => p.role === 'grow_bed');
}

function greenhouses(map: SpaceMap): MapPlacement[] {
  return map.placements.filter(
    (p) => p.kind === 'structure' && (p.role === 'greenhouse' || p.catalogId === 'greenhouse'),
  );
}

function weatherStations(map: SpaceMap): MapPlacement[] {
  return map.placements.filter(
    (p) => p.role === 'weather_station' || p.catalogId === 'weather-station',
  );
}

function sensorsInBed(map: SpaceMap, bed: MapPlacement): MapPlacement[] {
  return map.placements.filter(
    (p) =>
      p.kind === 'sensor' &&
      (p.parentId === bed.id ||
        (p.xM >= bed.xM &&
          p.xM <= bed.xM + bed.widthM &&
          p.yM >= bed.yM &&
          p.yM <= bed.yM + bed.heightM)),
  );
}

function tanks(map: SpaceMap): MapPlacement[] {
  return map.placements.filter(
    (p) => p.kind === 'irrigation' && (p.role === 'reservoir' || p.catalogId === 'tank'),
  );
}

export function countBeds(map: SpaceMap): OutdoorSpatialQueryResult {
  const list = beds(map);
  return { answer: `${list.length} грядок`, count: list.length, placementIds: list.map((b) => b.id) };
}

export function locateWeatherStation(map: SpaceMap): OutdoorSpatialQueryResult {
  const ws = weatherStations(map);
  if (!ws.length) return { answer: 'Метеостанция не размещена на карте' };
  const p = ws[0];
  const c = placementCenter(p);
  return {
    answer: `Метеостанция «${p.label ?? p.id}» в (${c.xM.toFixed(1)}, ${c.yM.toFixed(1)}) м`,
    count: ws.length,
    placementIds: ws.map((w) => w.id),
  };
}

export function sensorsInBedByLabel(map: SpaceMap, bedLabel: string): OutdoorSpatialQueryResult {
  const bed = beds(map).find((b) => b.label?.toLowerCase().includes(bedLabel.toLowerCase()));
  if (!bed) return { answer: `Грядка «${bedLabel}» не найдена` };
  const sensors = sensorsInBed(map, bed);
  if (!sensors.length) return { answer: `В «${bed.label}» нет датчиков на карте` };
  return {
    answer: `В «${bed.label}»: ${sensors.map((s) => s.label ?? s.id).join(', ')}`,
    count: sensors.length,
    placementIds: sensors.map((s) => s.id),
  };
}

export function nearestTankToZone(map: SpaceMap, zoneName: string): OutdoorSpatialQueryResult {
  const zone = map.zones.find((z) => z.name.toLowerCase().includes(zoneName.toLowerCase()));
  const tankList = tanks(map);
  if (!tankList.length) return { answer: 'Баки не размещены на карте' };
  if (!zone) return { answer: `Зона «${zoneName}» не найдена` };
  const zx = zone.xM + zone.widthM / 2;
  const zy = zone.yM + zone.heightM / 2;
  let best = tankList[0];
  let bestD = Infinity;
  for (const t of tankList) {
    const d = distanceM({ xM: zx, yM: zy }, placementCenter(t));
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return {
    answer: `Ближе всего к «${zone.name}»: «${best.label ?? best.id}» (${bestD.toFixed(1)} м)`,
    placementIds: [best.id],
  };
}

export function listGreenhousesOnSite(map: SpaceMap, spaces: Space[]): OutdoorSpatialQueryResult {
  const fromPlacements = greenhouses(map);
  const fromSpaces = spaces.filter((s) => s.type === 'greenhouse');
  const names = [
    ...fromPlacements.map((p) => p.label ?? p.id),
    ...fromSpaces.map((s) => s.name),
  ];
  const unique = [...new Set(names)];
  if (!unique.length) return { answer: 'На участке нет теплиц' };
  return { answer: `Теплицы: ${unique.join(', ')}`, count: unique.length };
}

export function liveOutdoorReading(
  placement: MapPlacement,
  devices: Device[],
): { label: string; hasData: boolean } {
  if (!placement.deviceId && !placement.sensorId) {
    return { label: 'Нет связи', hasData: false };
  }
  const device = devices.find((d) => d.id === placement.deviceId);
  if (!device?.isOnline) return { label: 'Нет связи', hasData: false };
  const sensor = device.inputs.find((s) => s.id === placement.sensorId);
  if (!sensor || !Number.isFinite(sensor.currentValue)) {
    return { label: 'Нет данных', hasData: false };
  }
  return { label: `${sensor.currentValue}${sensor.unit}`, hasData: true };
}

export function answerOutdoorSpatialQuestion(
  question: string,
  map: SpaceMap,
  spaces: Space[],
): OutdoorSpatialQueryResult | null {
  const q = question.toLowerCase();
  if (q.includes('сколько') && q.includes('гряд')) return countBeds(map);
  if (q.includes('метеостан')) return locateWeatherStation(map);
  if (q.includes('датчик') && q.includes('гряд')) {
    const m = q.match(/грядк[аеу]?\s*(\d+|[a-zа-я]+)/i);
    if (m) return sensorsInBedByLabel(map, m[1]);
  }
  if (q.includes('бак') && q.includes('ближ')) {
    const m = q.match(/zone\s*([a-zа-я])/i) ?? q.match(/зон[аеу]?\s*([a-zа-я])/i);
    if (m) return nearestTankToZone(map, m[1]);
    return nearestTankToZone(map, 'a');
  }
  if (q.includes('теплиц')) return listGreenhousesOnSite(map, spaces);
  return null;
}
