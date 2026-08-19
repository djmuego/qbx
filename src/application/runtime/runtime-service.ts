import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import type { LocalDemoDataLayerInstance } from '../../data/adapters/local-demo.repository';
import { stripAutomationLiveState, stripDeviceLiveState } from './persist-config';
import { FakeClock, SystemClock, type Clock } from '../../runtime/clock';
import { MathRandomSource, SeededRandomSource, type RandomSource } from '../../runtime/random';
import { QbxRuntime } from '../../runtime/qbx-runtime';
import { createGateway } from '../../runtime/gateway/gateway-factory';
import type { DeviceGateway } from '../../runtime/gateway/device-gateway.contract';
import { getRuntimeMode, isSimulatorMode } from '../../config/runtime-mode';

export class RuntimeService {
  private readonly runtime: QbxRuntime;
  private readonly dataLayer: LocalDemoDataLayerInstance;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();

  constructor(
    dataLayer: LocalDemoDataLayerInstance,
    clock?: Clock,
    random?: RandomSource,
    gateway?: DeviceGateway,
  ) {
    this.dataLayer = dataLayer;
    const resolvedClock = clock ?? new SystemClock();
    const resolvedRandom = random ?? new MathRandomSource();
    this.runtime = new QbxRuntime({
      clock: resolvedClock,
      random: resolvedRandom,
      gateway: gateway ?? createGateway({ clock: resolvedClock, random: resolvedRandom }),
    });
  }

  boot(): void {
    const snapshot = this.dataLayer.getSnapshot();
    this.runtime.boot(snapshot.spaces, snapshot.devices, snapshot.automations);
  }

  startTick(intervalMs = 1000): void {
    this.stopTick();
    this.tickTimer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  tick(): void {
    const snapshot = this.dataLayer.getSnapshot();
    this.runtime.updateConfiguration(snapshot.spaces, snapshot.devices, snapshot.automations);
    this.runtime.setSimulationEnabled(getRuntimeMode() === 'simulator');
    this.runtime.tick();
    this.persistRuntimeView();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getView() {
    return this.runtime.getView();
  }

  getSensorHistory(sensorId: string) {
    return this.runtime.getView().sensorHistory(sensorId);
  }

  getEvents() {
    return this.runtime.getEvents();
  }

  getEventsForSpace(spaceId: string) {
    return this.runtime.getEvents().filter((e) => !e.spaceId || e.spaceId === spaceId);
  }

  isEmergencyActive(spaceId: string): boolean {
    return this.runtime.isEmergencyActive(spaceId);
  }

  async setOutputManual(deviceId: string, outputId: string, state: boolean): Promise<void> {
    this.runtime.setOutputManual(deviceId, outputId, state);
    await this.dataLayer.devices.setOutputControlMode(deviceId, outputId, 'manual');
    await this.persistRuntimeViewAsync();
    this.notify();
  }

  async toggleOutputManual(deviceId: string, outputId: string): Promise<void> {
    const view = this.runtime.getView();
    const device = view.devices.find((d) => d.id === deviceId);
    const output = device?.outputs.find((o) => o.id === outputId);
    if (!output) return;
    await this.setOutputManual(deviceId, outputId, !output.state);
  }

  async returnOutputToAuto(deviceId: string, outputId: string): Promise<void> {
    this.runtime.returnOutputToAuto(deviceId, outputId);
    await this.dataLayer.devices.setOutputControlMode(deviceId, outputId, 'auto');
    this.tick();
  }

  async emergencyOff(spaceId: string): Promise<void> {
    this.runtime.emergencyOff(spaceId);
    await this.persistRuntimeViewAsync();
    this.notify();
  }

  async releaseEmergency(spaceId: string): Promise<void> {
    this.runtime.releaseEmergency(spaceId);
    const view = this.runtime.getView();
    for (const device of view.devices) {
      if (device.spaceId !== spaceId) continue;
      for (const output of device.outputs) {
        await this.dataLayer.devices.setOutputControlMode(device.id, output.id, 'auto');
      }
    }
    this.tick();
  }

  async afterConfigurationChange(): Promise<void> {
    const snapshot = this.dataLayer.getSnapshot();
    this.runtime.updateConfiguration(snapshot.spaces, snapshot.devices, snapshot.automations);
    this.tick();
  }

  /** Simulator only — inject mapped external hub reading into a sensor input. */
  applyExternalSensorReading(sensorId: string, value: number): boolean {
    if (!isSimulatorMode()) return false;
    const exists = this.runtime
      .getView()
      .devices.some((d) => d.inputs.some((s) => s.id === sensorId && s.type !== 'unused'));
    if (!exists) return false;
    this.runtime.setSensorValue(sensorId, value);
    return true;
  }

  /** Re-persist simulator view after external injection (no full tick). */
  refreshView(): void {
    this.persistRuntimeView();
    this.notify();
  }

  private persistRuntimeView(): void {
    const view = this.runtime.getView();
    void this.dataLayer.devices.replaceAll(view.devices.map(stripDeviceLiveState));
    void this.dataLayer.automations.replaceAll(view.automations.map(stripAutomationLiveState));
  }

  private async persistRuntimeViewAsync(): Promise<void> {
    const view = this.runtime.getView();
    await this.dataLayer.devices.replaceAll(view.devices.map(stripDeviceLiveState));
    await this.dataLayer.automations.replaceAll(view.automations.map(stripAutomationLiveState));
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export function createRuntimeService(dataLayer: LocalDemoDataLayerInstance): RuntimeService {
  return new RuntimeService(dataLayer);
}

export function createTestRuntimeService(
  dataLayer: LocalDemoDataLayerInstance,
  clock: FakeClock,
  random: SeededRandomSource,
  gateway?: DeviceGateway,
): RuntimeService {
  return new RuntimeService(dataLayer, clock, random, gateway);
}

export type { Clock, FakeClock, SeededRandomSource };
