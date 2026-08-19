import type { SpaceMap } from '../../domain/map/space-map.types';

export interface IrrigationGraphNode {
  id: string;
  role: 'tank' | 'pump' | 'valve' | 'zone' | 'plants';
  label: string;
}

export interface IrrigationGraph {
  nodes: IrrigationGraphNode[];
  edges: Array<{ fromId: string; toId: string }>;
  flowRateUnknown: true;
}

export function buildIrrigationGraph(map: SpaceMap): IrrigationGraph {
  const nodes: IrrigationGraphNode[] = [];
  const edges: IrrigationGraph['edges'] = [];
  const tanks = map.placements.filter((p) => p.kind === 'irrigation' && (p.role === 'reservoir' || p.role === 'tank'));
  const pumps = map.placements.filter((p) => p.kind === 'irrigation' && p.role === 'pump');
  const valves = map.placements.filter((p) => p.kind === 'irrigation' && (p.role === 'valve' || p.role === 'manifold'));
  for (const t of tanks) nodes.push({ id: t.id, role: 'tank', label: t.label ?? 'Бак' });
  for (const p of pumps) nodes.push({ id: p.id, role: 'pump', label: p.label ?? 'Насос' });
  for (const v of valves) nodes.push({ id: v.id, role: 'valve', label: v.label ?? 'Клапан' });
  for (const z of map.zones) nodes.push({ id: z.id, role: 'zone', label: z.name });
  const plants = map.placements.filter((p) => p.kind === 'plant' || p.kind === 'plant_group');
  for (const plant of plants) nodes.push({ id: plant.id, role: 'plants', label: plant.label ?? 'Растения' });

  const firstTank = tanks[0];
  const firstPump = pumps[0];
  if (firstTank && firstPump) edges.push({ fromId: firstTank.id, toId: firstPump.id });
  const afterPump = valves[0] ?? map.zones[0];
  if (firstPump && afterPump) edges.push({ fromId: firstPump.id, toId: afterPump.id });
  const zone = map.zones[0];
  if (zone && plants[0]) edges.push({ fromId: zone.id, toId: plants[0].id });
  else if (firstPump && plants[0]) edges.push({ fromId: firstPump.id, toId: plants[0].id });

  return { nodes, edges, flowRateUnknown: true };
}
