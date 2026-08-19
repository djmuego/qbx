import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  NavigationTab,
  ThemeMode,
  TempUnit,
  Space,
  QBXDevice,
  Automation,
  PortInput,
  PortOutput,
  GrowPhaseId,
  GrowPhaseInfo,
} from '../types';
import { GROW_PHASES } from '../domain/grow/grow-phase.types';
import { createDataLayer } from '../data';
import { createLocalDemoDataLayer, type LocalDemoDataLayerInstance } from '../data/adapters/local-demo.repository';
import { createRuntimeService, type RuntimeService } from '../application/runtime/runtime-service';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../infrastructure/supabase/client';
import { setAiCloudContext } from '../application/ai/ai-cloud.persistence';
import type { AccountSectionId } from '../domain/account/account-sections';
import { isReadOnlyRole, canToggleOutput, canManageAutomations, canManageDevices, canDeleteSpace, canEditMap } from '../domain/auth/role-guards';
import { useLocale } from '../i18n/LocaleContext';
import { localizeDeviceModels, localizeEquipmentConfig, localizeSensorConfig } from '../i18n/localize-catalog';
import type { WorkspaceRole } from '../domain/auth/auth.types';
import type { DeviceModel } from '../domain/device/device.types';
import type { EquipmentConfigEntry, SensorConfigEntry } from '../domain/catalog/device-catalog';
import type { SensorHistoryPoint } from '../types';
import type { AiSettings } from '../domain/ai/ai-provider.types';
import type { SpaceAdvisorRecommendation } from '../domain/ai/advisor.types';
import type { AgentBriefing, AgentMessage } from '../domain/ai/agent.types';
import type { CultivationContext } from '../domain/ai/cultivation-context.types';
import type { GrowAgentAnalysis } from '../domain/ai/grow-agent-response.types';
import type { CropProfile } from '../domain/grow/crop-profile.types';
import type { SpaceMap } from '../domain/map/space-map.types';
import { generateSpaceLayout } from '../application/map/template-generator';
import { spatialKindForType, spatialScaleForType } from '../domain/map/spatial-hierarchy';
import type {
  CreatePlantGroupInput,
  CreatePlantInput,
  Plant,
  PlantGroup,
  UpdatePlantGroupInput,
  UpdatePlantInput,
} from '../domain/grow/plant.types';
import type { SpaceDimensions } from '../domain/space/space.types';
import { computeSpaceMetrics } from '../domain/space/space.types';
import { buildDuplicateSpaceBundle, summarizeSpace } from '../application/space/space-management';
import { EXPORT_SCHEMA_VERSION, stripEphemeralAutomation, stripEphemeralDevice } from '../data/adapters/export-sanitize';
import { loadAiSettings, saveAiSettings } from '../application/ai/ai-settings.store';
import { loadCropProfile, saveCropProfile, clearCropProfile } from '../application/ai/crop-profile.store';
import { buildIntelligenceContext } from '../application/intelligence/intelligence-context.builder';
import {
  analysisToBriefing,
  analyzeGrowContext,
  askGrowAgent,
  createExpertAnalysis,
} from '../application/ai/grow-agent.service';
import {
  clearAgentChat,
  loadAgentAnalysis,
  loadAgentChat,
  saveAgentAnalysis,
  saveAgentChat,
} from '../application/ai/agent-store';
import { AiClientError } from '../application/ai/ai-client';
import { cloudLoadGrowJournal } from '../application/ai/ai-cloud.persistence';
import {
  journalFromAgentRecommendation,
  mergeGrowJournalFromCloud,
} from '../application/ai/grow-journal.store';
import { getActiveGrowRun } from '../application/grow/grow-run.store';
import {
  buildRuntimeTelemetrySlice,
  hasTelemetryData,
} from '../application/grow/grow-run-telemetry.service';
import { captureRuntimeTelemetrySlice } from '../application/grow/grow-run-telemetry.store';
import { hydrateIntegrationsFromCloud } from '../application/integrations/hub-integration.store';
import { useExternalIntegrationsBridge } from '../application/integrations/use-external-integrations-bridge';
import {
  fetchPlatformConsciousnessCloud,
  fetchWorkspaceAiConfigCloud,
  getLocalPlatformConsciousness,
  getLocalWorkspaceAiConfig,
} from '../application/ai/ai-config.persistence';
import {
  buildPromptOverlay,
  mergeWorkspaceAiSettings,
  resolveAgentQuickPrompts,
} from '../application/ai/ai-config.resolver';
import { DEFAULT_AGENT_QUICK_PROMPTS } from '../domain/ai/ai-admin-config.types';
import type { PlatformConsciousnessConfig, WorkspaceAiAdminConfig } from '../domain/ai/ai-admin-config.types';
import { ACCOUNT_SECTIONS, ACCOUNT_SECTION_ALIASES } from '../domain/account/account-sections';

interface AppCatalog {
  deviceModels: DeviceModel[];
  sensorConfig: Record<string, SensorConfigEntry>;
  equipmentConfig: Record<string, EquipmentConfigEntry>;
}

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  accountSection: AccountSectionId;
  setAccountSection: (section: AccountSectionId) => void;
  openAccount: (section?: AccountSectionId) => void;
  isPlatformAdminOpen: boolean;
  openPlatformAdmin: () => void;
  closePlatformAdmin: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  tempUnit: TempUnit;
  setTempUnit: (unit: TempUnit) => void;
  growPhase: GrowPhaseId;
  setGrowPhase: (phase: GrowPhaseId) => void;
  currentGrowPhaseInfo: GrowPhaseInfo;
  isGrowPhaseModalOpen: boolean;
  setIsGrowPhaseModalOpen: (open: boolean) => void;
  spaces: Space[];
  currentSpaceId: string;
  setCurrentSpaceId: (id: string) => void;
  currentSpace: Space | undefined;
  addSpace: (name: string, description?: string, options?: import('../domain/space/space.types').CreateSpaceInput) => string;
  updateSpace: (id: string, name: string) => void;
  updateSpaceDetails: (id: string, input: import('../domain/space/space.types').UpdateSpaceInput) => Promise<void>;
  updateSpaceDimensions: (id: string, dimensions: SpaceDimensions) => void;
  duplicateSpace: (id: string, name?: string) => Promise<string | null>;
  deleteSpace: (id: string) => void;
  getSpaceSummary: (spaceId: string) => { deviceCount: number; automationCount: number; plantCount: number; mapObjectCount: number };
  devices: QBXDevice[];
  currentSpaceDevices: QBXDevice[];
  addDevice: (modelId: string, customName: string, spaceId: string) => string;
  updateDeviceName: (id: string, customName: string) => void;
  assignDeviceToSpace: (id: string, spaceId: string) => void;
  deleteDevice: (id: string) => void;
  configurePortInput: (deviceId: string, portId: string, updates: Partial<PortInput>) => void;
  configurePortOutput: (deviceId: string, portId: string, updates: Partial<PortOutput>) => void;
  toggleOutput: (deviceId: string, outputId: string) => void;
  setOutputAutoMode: (deviceId: string, outputId: string, isAuto: boolean) => void;
  setOutputTwinMode: (deviceId: string, outputId: string, mode: import('../domain/equipment/output-twin-mode').OutputTwinMode) => void;
  turnOffAllInSpace: (spaceId?: string) => void;
  automations: Automation[];
  currentSpaceAutomations: Automation[];
  addAutomation: (auto: import('../domain/automation/automation.types').CreateAutomationInput) => string;
  updateAutomation: (id: string, updates: Partial<Automation>) => void;
  deleteAutomation: (id: string) => void;
  toggleAutomation: (id: string) => void;
  allSensorsInCurrentSpace: { device: QBXDevice; sensor: PortInput }[];
  allOutputsInCurrentSpace: { device: QBXDevice; output: PortOutput }[];
  toggleSensorHomeVisibility: (deviceId: string, portId: string) => void;
  selectedSensor: { device: QBXDevice; sensor: PortInput } | null;
  setSelectedSensor: (data: { device: QBXDevice; sensor: PortInput } | null) => void;
  selectedEquipment: { device: QBXDevice; output: PortOutput } | null;
  setSelectedEquipment: (data: { device: QBXDevice; output: PortOutput } | null) => void;
  selectedDeviceDetail: QBXDevice | null;
  setSelectedDeviceDetail: (device: QBXDevice | null) => void;
  isAddDeviceOpen: boolean;
  setIsAddDeviceOpen: (open: boolean) => void;
  openAddDevice: (preferredModelId?: string) => void;
  addDevicePreferredModelId: string | null;
  isAddAutomationOpen: boolean;
  setIsAddAutomationOpen: (open: boolean) => void;
  isEmergencyModalOpen: boolean;
  setIsEmergencyModalOpen: (open: boolean) => void;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;
  resetToDefault: () => void;
  catalog: AppCatalog;
  isEmergencyActive: boolean;
  releaseEmergency: () => void;
  getSensorHistory: (sensorId: string) => SensorHistoryPoint[];
  aiSettings: AiSettings;
  updateAiSettings: (updates: Partial<AiSettings>) => void;
  agentQuickPrompts: string[];
  workspaceAiManaged: boolean;
  isSpaceAdvisorOpen: boolean;
  setIsSpaceAdvisorOpen: (open: boolean) => void;
  applySpaceAdvisorRecommendation: (recommendation: SpaceAdvisorRecommendation) => Promise<void>;
  agentDisplayBriefing: AgentBriefing;
  growAgentAnalysis: GrowAgentAnalysis;
  growContext: CultivationContext;
  cropProfile: CropProfile | null;
  setCropProfile: (profile: CropProfile | null) => void;
  agentMessages: AgentMessage[];
  agentLoading: boolean;
  agentError: string | null;
  isAgentOpen: boolean;
  setIsAgentOpen: (open: boolean) => void;
  refreshAgentBriefing: (options?: { useGateway?: boolean }) => Promise<void>;
  askAgentQuestion: (question: string, options?: { useGateway?: boolean }) => Promise<void>;
  clearAgentConversation: () => void;
  currentSpaceMap: SpaceMap | null;
  currentSpacePlants: Plant[];
  currentPlantGroups: PlantGroup[];
  ensureSpaceMap: (spaceId: string) => void;
  saveSpaceMap: (map: SpaceMap) => void;
  createPlant: (input: CreatePlantInput) => Promise<Plant>;
  updatePlant: (id: string, input: UpdatePlantInput) => void;
  deletePlant: (id: string) => void;
  createPlantGroup: (input: CreatePlantGroupInput) => Promise<PlantGroup>;
  updatePlantGroup: (id: string, input: UpdatePlantGroupInput) => void;
  applyMapLayout: (layout: import('../domain/map/map-blueprint.types').LayoutPreview) => Promise<void>;
  createSpaceWithLayout: (
    input: import('../domain/space/space.types').CreateSpaceInput,
    template?: import('../domain/map/space-templates.types').TemplateGenerateInput,
  ) => Promise<string>;
  mapViewMode: '2d' | '3d';
  setMapViewMode: (mode: '2d' | '3d') => void;
  runtimeSnapshot: import('../runtime/types/runtime-state.types').RuntimeSnapshot | null;
  runtimeEvents: import('../runtime/types/events.types').RuntimeEvent[];
  spatialFocus: import('../domain/map/spatial-focus').SpatialFocusTarget | null;
  setSpatialFocus: (target: import('../domain/map/spatial-focus').SpatialFocusTarget | null) => void;
  activeRole: WorkspaceRole | null;
  isReadOnly: boolean;
  reloadWorkspaceData: () => Promise<void>;
  dataLayer: LocalDemoDataLayerInstance | null;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authContext, supabaseEnabled, localAuthEnabled } = useAuth();
  const { locale, t } = useLocale();
  const supabase = getSupabaseClient();
  const [dataLayer, setDataLayer] = useState<LocalDemoDataLayerInstance | null>(null);
  const [runtimeService, setRuntimeService] = useState<RuntimeService | null>(null);
  const [dataBooting, setDataBooting] = useState(true);

  const activeRole = authContext?.activeRole ?? null;
  const isReadOnly = activeRole ? isReadOnlyRole(activeRole) : false;

  const bootDataLayer = useCallback(async () => {
    setDataBooting(true);
    try {
      const layer = await createDataLayer(
        supabaseEnabled && authContext && supabase
          ? { mode: 'supabase', session: authContext, supabase }
          : { mode: 'local' },
      );
      if (supabaseEnabled && authContext && supabase) {
        setAiCloudContext({ client: supabase, workspaceId: authContext.activeWorkspaceId });
      } else {
        setAiCloudContext(null);
      }
      const rt = createRuntimeService(layer);
      setDataLayer(layer);
      setRuntimeService(rt);
      const snapshot = layer.getSnapshot();
      setSpaces(snapshot.spaces);
      setDevices(snapshot.devices);
      setAutomations(snapshot.automations);
      setSpaceMaps(snapshot.spaceMaps ?? []);
      setPlants(snapshot.plants ?? []);
      setPlantGroups(snapshot.plantGroups ?? []);
      setThemeState(snapshot.settings.theme);
      setTempUnitState(snapshot.settings.tempUnit);
      setGrowPhaseState(snapshot.settings.growPhase);
      setCurrentSpaceIdState(snapshot.settings.currentSpaceId);
      setMapViewModeState(snapshot.settings.mapViewMode ?? '2d');
    } finally {
      setDataBooting(false);
    }
  }, [authContext, supabase, supabaseEnabled]);

  useEffect(() => {
    void bootDataLayer();
  }, [bootDataLayer]);

  const reloadWorkspaceData = useCallback(async () => {
    await bootDataLayer();
  }, [bootDataLayer]);

  const initialSnapshot = dataLayer?.getSnapshot();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [accountSection, setAccountSection] = useState<AccountSectionId>('overview');
  const [isPlatformAdminOpen, setIsPlatformAdminOpen] = useState(false);

  const openAccount = useCallback((section: AccountSectionId = 'overview') => {
    setAccountSection(section);
    setCurrentTab('account');
  }, []);

  const openPlatformAdmin = useCallback(() => {
    setIsPlatformAdminOpen(true);
  }, []);

  const closePlatformAdmin = useCallback(() => {
    setIsPlatformAdminOpen(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const section = params.get('section');
    const validTabs: NavigationTab[] = ['home', 'automations', 'devices', 'map', 'account', 'settings'];
    if (tab && validTabs.includes(tab as NavigationTab)) {
      setCurrentTab(tab as NavigationTab);
    }
    if (section === 'admin') {
      setIsPlatformAdminOpen(true);
      return;
    }
    const resolvedSection = section ? (ACCOUNT_SECTION_ALIASES[section] ?? section) : null;
    if (resolvedSection && ACCOUNT_SECTIONS.includes(resolvedSection as AccountSectionId)) {
      setAccountSection(resolvedSection as AccountSectionId);
      setCurrentTab('account');
    }
  }, []);
  const [spaces, setSpaces] = useState<Space[]>(initialSnapshot?.spaces ?? []);
  const [devices, setDevices] = useState<QBXDevice[]>(initialSnapshot?.devices ?? []);
  const [automations, setAutomations] = useState<Automation[]>(initialSnapshot?.automations ?? []);
  const [spaceMaps, setSpaceMaps] = useState<SpaceMap[]>(initialSnapshot?.spaceMaps ?? []);
  const [plants, setPlants] = useState<Plant[]>(initialSnapshot?.plants ?? []);
  const [plantGroups, setPlantGroups] = useState<PlantGroup[]>(initialSnapshot?.plantGroups ?? []);
  const [theme, setThemeState] = useState<ThemeMode>(initialSnapshot?.settings.theme ?? 'system');
  const [tempUnit, setTempUnitState] = useState<TempUnit>(initialSnapshot?.settings.tempUnit ?? 'C');
  const [growPhase, setGrowPhaseState] = useState<GrowPhaseId>(initialSnapshot?.settings.growPhase ?? 'vegetation');
  const [currentSpaceId, setCurrentSpaceIdState] = useState<string>(initialSnapshot?.settings.currentSpaceId ?? '');
  const [mapViewMode, setMapViewModeState] = useState<'2d' | '3d'>(initialSnapshot?.settings.mapViewMode ?? '2d');
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<
    import('../runtime/types/runtime-state.types').RuntimeSnapshot | null
  >(null);
  const [runtimeEvents, setRuntimeEvents] = useState<import('../runtime/types/events.types').RuntimeEvent[]>([]);
  const [spatialFocus, setSpatialFocus] = useState<import('../domain/map/spatial-focus').SpatialFocusTarget | null>(
    null,
  );
  const [catalog, setCatalog] = useState<AppCatalog>({
    deviceModels: [],
    sensorConfig: {},
    equipmentConfig: {},
  });

  const [isGrowPhaseModalOpen, setIsGrowPhaseModalOpen] = useState(false);
  const [growRunRevision, setGrowRunRevision] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState<{ device: QBXDevice; sensor: PortInput } | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<{ device: QBXDevice; output: PortOutput } | null>(null);
  const [selectedDeviceDetail, setSelectedDeviceDetail] = useState<QBXDevice | null>(null);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [addDevicePreferredModelId, setAddDevicePreferredModelId] = useState<string | null>(null);
  const [isAddAutomationOpen, setIsAddAutomationOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(() => loadAiSettings());
  const [platformConsciousness, setPlatformConsciousness] = useState<PlatformConsciousnessConfig>({
    schemaVersion: 1,
  });
  const [workspaceAiConfig, setWorkspaceAiConfig] = useState<WorkspaceAiAdminConfig | null>(null);

  const effectiveAiSettings = useMemo(
    () => mergeWorkspaceAiSettings(aiSettings, workspaceAiConfig),
    [aiSettings, workspaceAiConfig],
  );
  const agentPromptOverlay = useMemo(
    () => buildPromptOverlay(platformConsciousness, workspaceAiConfig),
    [platformConsciousness, workspaceAiConfig],
  );
  const agentQuickPrompts = useMemo(() => {
    const custom = resolveAgentQuickPrompts(workspaceAiConfig);
    return custom.length > 0 ? custom : DEFAULT_AGENT_QUICK_PROMPTS;
  }, [workspaceAiConfig]);
  const workspaceAiManaged = Boolean(workspaceAiConfig?.managedByPlatform);
  const [cropProfile, setCropProfileState] = useState<CropProfile | null>(null);
  const [isSpaceAdvisorOpen, setIsSpaceAdvisorOpen] = useState(false);
  const [agentAnalysis, setAgentAnalysis] = useState<GrowAgentAnalysis | null>(null);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const syncFromLayer = () => {
    if (!dataLayer || !runtimeService) return;
    const snapshot = dataLayer.getSnapshot();
    setSpaces(snapshot.spaces);
    const view = runtimeService.getView();
    setDevices(view.devices);
    setAutomations(view.automations);
    setSpaceMaps(snapshot.spaceMaps ?? []);
    setPlants(snapshot.plants ?? []);
    setPlantGroups(snapshot.plantGroups ?? []);
    setThemeState(snapshot.settings.theme);
    setTempUnitState(snapshot.settings.tempUnit);
    setGrowPhaseState(snapshot.settings.growPhase);
    setCurrentSpaceIdState(snapshot.settings.currentSpaceId);
    setMapViewModeState(snapshot.settings.mapViewMode ?? '2d');
    setIsEmergencyActive(runtimeService.isEmergencyActive(snapshot.settings.currentSpaceId));
    setRuntimeSnapshot(runtimeService.getView().snapshot);
    setRuntimeEvents(runtimeService.getEventsForSpace(snapshot.settings.currentSpaceId));

    const activeRun = getActiveGrowRun(snapshot.settings.currentSpaceId);
    if (activeRun) {
      const slice = buildRuntimeTelemetrySlice(view.devices, snapshot.settings.currentSpaceId);
      if (hasTelemetryData(slice)) {
        captureRuntimeTelemetrySlice(snapshot.settings.currentSpaceId, activeRun.id, slice);
      }
    }
  };

  useEffect(() => {
    if (!runtimeService || !dataLayer) return;
    runtimeService.boot();
    runtimeService.startTick(1000);
    const unsubscribe = runtimeService.subscribe(() => syncFromLayer());
    syncFromLayer();
    return () => {
      unsubscribe();
      runtimeService.stopTick();
    };
  }, [runtimeService, dataLayer]);

  useExternalIntegrationsBridge(runtimeService, authContext?.activeWorkspaceId);

  useEffect(() => {
    if (!dataLayer) return;
    void Promise.all([
      dataLayer.catalog.getDeviceModels(),
      dataLayer.catalog.getSensorConfig(),
      dataLayer.catalog.getEquipmentConfig(),
    ]).then(() => {
      setCatalog({
        deviceModels: localizeDeviceModels(t),
        sensorConfig: localizeSensorConfig(t),
        equipmentConfig: localizeEquipmentConfig(t),
      });
    });
  }, [dataLayer, locale, t]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(media.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    void dataLayer.settings.update({ theme: newTheme }).then(() => syncFromLayer());
  };

  const setTempUnit = (unit: TempUnit) => {
    void dataLayer.settings.update({ tempUnit: unit }).then(() => syncFromLayer());
  };

  const setGrowPhase = (phase: GrowPhaseId) => {
    void dataLayer.settings.update({ growPhase: phase }).then(() => syncFromLayer());
  };

  const setCurrentSpaceId = (id: string) => {
    void dataLayer.settings.update({ currentSpaceId: id }).then(() => syncFromLayer());
  };

  const setMapViewMode = (mode: '2d' | '3d') => {
    setMapViewModeState(mode);
    void dataLayer.settings.update({ mapViewMode: mode }).then(() => syncFromLayer());
  };

  const currentGrowPhaseInfo = useMemo(() => GROW_PHASES[growPhase] || GROW_PHASES.vegetation, [growPhase]);

  const currentSpace = useMemo(
    () => spaces.find((s) => s.id === currentSpaceId),
    [spaces, currentSpaceId],
  );

  const currentSpaceDevices = useMemo(
    () => devices.filter((d) => d.spaceId === currentSpaceId),
    [devices, currentSpaceId],
  );

  const currentSpaceAutomations = useMemo(
    () => automations.filter((a) => a.spaceId === currentSpaceId),
    [automations, currentSpaceId],
  );

  const currentSpaceMap = useMemo(
    () => spaceMaps.find((m) => m.spaceId === currentSpaceId) ?? null,
    [spaceMaps, currentSpaceId],
  );

  const currentSpacePlants = useMemo(
    () => plants.filter((p) => p.spaceId === currentSpaceId),
    [plants, currentSpaceId],
  );

  const currentPlantGroups = useMemo(
    () => plantGroups.filter((g) => g.spaceId === currentSpaceId),
    [plantGroups, currentSpaceId],
  );

  const allSensorsInCurrentSpace = useMemo(() => {
    const list: { device: QBXDevice; sensor: PortInput }[] = [];
    currentSpaceDevices.forEach((device) => {
      device.inputs.forEach((sensor) => {
        if (sensor.type !== 'unused') list.push({ device, sensor });
      });
    });
    return list;
  }, [currentSpaceDevices]);

  const allOutputsInCurrentSpace = useMemo(() => {
    const list: { device: QBXDevice; output: PortOutput }[] = [];
    currentSpaceDevices.forEach((device) => {
      device.outputs.forEach((output) => {
        if (output.type !== 'unused') list.push({ device, output });
      });
    });
    return list;
  }, [currentSpaceDevices]);

  const activeGrowRun = useMemo(
    () => (currentSpaceId ? getActiveGrowRun(currentSpaceId) : null),
    [currentSpaceId, growRunRevision],
  );

  useEffect(() => {
    const onGrowRunUpdated = () => setGrowRunRevision((n) => n + 1);
    window.addEventListener('qbx-grow-run-updated', onGrowRunUpdated);
    return () => window.removeEventListener('qbx-grow-run-updated', onGrowRunUpdated);
  }, []);

  const growContext = useMemo(
    () =>
      buildIntelligenceContext({
        space: currentSpace,
        growPhase,
        cropProfile,
        growRun: activeGrowRun,
        devices,
        automations,
        isEmergencyActive,
        getSensorHistory: (sensorId) => runtimeService.getSensorHistory(sensorId),
        recentEvents: currentSpaceId ? runtimeService.getEventsForSpace(currentSpaceId) : [],
        spaceMap: currentSpaceMap,
        plants: currentSpacePlants,
      }),
    [currentSpace, growPhase, cropProfile, activeGrowRun, devices, automations, isEmergencyActive, currentSpaceId, runtimeService, currentSpaceMap, currentSpacePlants],
  );

  const agentLocalAnalysis = useMemo(() => createExpertAnalysis(growContext, cropProfile), [growContext, cropProfile]);
  const growAgentAnalysis = agentAnalysis ?? agentLocalAnalysis;
  const agentDisplayBriefing = useMemo(() => analysisToBriefing(growAgentAnalysis), [growAgentAnalysis]);

  useEffect(() => {
    if (!currentSpaceId) {
      setAgentAnalysis(null);
      setAgentMessages([]);
      setCropProfileState(null);
      return;
    }
    void (async () => {
      const { cloudLoadAgentAnalysis, cloudLoadAgentChat, cloudLoadCropProfile } = await import(
        '../application/ai/ai-cloud.persistence'
      );
      const cloudAnalysis = await cloudLoadAgentAnalysis(currentSpaceId);
      const cloudChat = await cloudLoadAgentChat(currentSpaceId);
      const cloudCrop = await cloudLoadCropProfile(currentSpaceId);
      const cloudJournal = await cloudLoadGrowJournal(currentSpaceId);
      if (cloudJournal.length) {
        mergeGrowJournalFromCloud(currentSpaceId, cloudJournal);
        window.dispatchEvent(new Event('qbx-journal-updated'));
      }
      setAgentAnalysis(cloudAnalysis ?? loadAgentAnalysis(currentSpaceId));
      setAgentMessages(cloudChat.length ? cloudChat : loadAgentChat(currentSpaceId));
      setCropProfileState(cloudCrop ?? loadCropProfile(currentSpaceId));
      setAgentError(null);
    })();
  }, [currentSpaceId]);

  useEffect(() => {
    if (!authContext?.activeWorkspaceId) return;
    void hydrateIntegrationsFromCloud(authContext.activeWorkspaceId);
  }, [authContext?.activeWorkspaceId]);

  useEffect(() => {
    if (localAuthEnabled) {
      setPlatformConsciousness(getLocalPlatformConsciousness());
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase || !supabaseEnabled) return;
    void fetchPlatformConsciousnessCloud(supabase)
      .then(setPlatformConsciousness)
      .catch(() => setPlatformConsciousness({ schemaVersion: 1 }));
  }, [localAuthEnabled, supabaseEnabled]);

  useEffect(() => {
    const wsId = authContext?.activeWorkspaceId;
    if (!wsId) {
      setWorkspaceAiConfig(null);
      return;
    }
    if (localAuthEnabled) {
      setWorkspaceAiConfig(getLocalWorkspaceAiConfig(wsId));
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase || !supabaseEnabled) return;
    void fetchWorkspaceAiConfigCloud(supabase, wsId)
      .then(setWorkspaceAiConfig)
      .catch(() => setWorkspaceAiConfig(null));
  }, [authContext?.activeWorkspaceId, localAuthEnabled, supabaseEnabled]);

  const setCropProfile = useCallback(
    (profile: CropProfile | null) => {
      setCropProfileState(profile);
      if (currentSpaceId) {
        if (profile) saveCropProfile(currentSpaceId, profile);
        else clearCropProfile(currentSpaceId);
      }
    },
    [currentSpaceId],
  );

  useEffect(() => {
    if (selectedSensor) {
      const dev = devices.find((d) => d.id === selectedSensor.device.id);
      const sen = dev?.inputs.find((i) => i.id === selectedSensor.sensor.id);
      if (dev && sen) setSelectedSensor({ device: dev, sensor: sen });
    }
  }, [devices]);

  useEffect(() => {
    if (selectedEquipment) {
      const dev = devices.find((d) => d.id === selectedEquipment.device.id);
      const out = dev?.outputs.find((o) => o.id === selectedEquipment.output.id);
      if (dev && out) setSelectedEquipment({ device: dev, output: out });
    }
  }, [devices]);

  useEffect(() => {
    if (selectedDeviceDetail) {
      const dev = devices.find((d) => d.id === selectedDeviceDetail.id);
      if (dev) setSelectedDeviceDetail(dev);
    }
  }, [devices]);

  const addSpace = (
    name: string,
    description?: string,
    options?: import('../domain/space/space.types').CreateSpaceInput,
  ): string => {
    let newId = '';
    void dataLayer.spaces
      .create({
        name,
        description: description ?? options?.description,
        type: options?.type,
        dimensions: options?.dimensions,
        timezone: options?.timezone,
      })
      .then(async (space) => {
        newId = space.id;
        await dataLayer.settings.update({ currentSpaceId: space.id });
        await runtimeService.afterConfigurationChange();
        syncFromLayer();
      });
    return newId;
  };

  const updateAiSettings = (updates: Partial<AiSettings>) => {
    setAiSettingsState((prev) => {
      const next = { ...prev, ...updates };
      saveAiSettings(next);
      return next;
    });
  };

  const applySpaceAdvisorRecommendation = async (recommendation: SpaceAdvisorRecommendation) => {
    const space = await dataLayer.spaces.create({
      name: recommendation.spaceNameSuggestion,
      description: recommendation.spaceDescription,
    });
    await dataLayer.settings.update({
      currentSpaceId: space.id,
      growPhase: recommendation.growPhase,
    });
    await runtimeService.afterConfigurationChange();
    syncFromLayer();
  };

  const refreshAgentBriefing = useCallback(
    async (options?: { useGateway?: boolean }) => {
      setAgentLoading(true);
      setAgentError(null);
      try {
        const context = buildIntelligenceContext({
          space: currentSpace,
          growPhase,
          cropProfile,
          devices,
          automations,
          isEmergencyActive,
          getSensorHistory: (sensorId) => runtimeService.getSensorHistory(sensorId),
          recentEvents: currentSpaceId ? runtimeService.getEventsForSpace(currentSpaceId) : [],
          spaceMap: currentSpaceMap,
          plants: currentSpacePlants,
        });

        const analysis = await analyzeGrowContext(context, effectiveAiSettings, {
          cropProfile,
          forceGateway: options?.useGateway === true,
          promptOverlay: agentPromptOverlay,
        });
        setAgentAnalysis(analysis);
        if (currentSpaceId) {
          saveAgentAnalysis(currentSpaceId, analysis);
          journalFromAgentRecommendation(
            currentSpaceId,
            analysis.headline || 'QBX Agent',
            analysis.summary,
            growPhase,
          );
          window.dispatchEvent(new Event('qbx-journal-updated'));
        }
      } catch (err) {
        const message =
          err instanceof AiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'QBX Grow Agent временно недоступен';
        setAgentError(message);
        const fallback = createExpertAnalysis(growContext, cropProfile);
        setAgentAnalysis(fallback);
        if (currentSpaceId) {
          saveAgentAnalysis(currentSpaceId, fallback);
          journalFromAgentRecommendation(
            currentSpaceId,
            fallback.headline || 'QBX Agent',
            fallback.summary,
            growPhase,
          );
          window.dispatchEvent(new Event('qbx-journal-updated'));
        }
      } finally {
        setAgentLoading(false);
      }
    },
    [
      aiSettings,
      effectiveAiSettings,
      agentPromptOverlay,
      automations,
      cropProfile,
      currentSpace,
      currentSpaceId,
      currentSpaceMap,
      currentSpacePlants,
      devices,
      growContext,
      growPhase,
      isEmergencyActive,
      runtimeService,
    ],
  );

  const askAgentQuestion = useCallback(
    async (question: string, options?: { useGateway?: boolean }) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestampMs: Date.now(),
      };
      const nextMessages = [...agentMessages, userMessage];
      setAgentMessages(nextMessages);
      if (currentSpaceId) saveAgentChat(currentSpaceId, nextMessages);

      try {
        const answer = await askGrowAgent(growContext, trimmed, agentMessages, effectiveAiSettings, {
          cropProfile,
          forceGateway: options?.useGateway === true,
          promptOverlay: agentPromptOverlay,
        });
        const assistantMessage: AgentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestampMs: Date.now(),
        };
        const withAnswer = [...nextMessages, assistantMessage];
        setAgentMessages(withAnswer);
        if (currentSpaceId) saveAgentChat(currentSpaceId, withAnswer);
      } catch (err) {
        const message =
          err instanceof AiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'QBX Grow Agent временно недоступен';
        const errorMessage: AgentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: message,
          timestampMs: Date.now(),
        };
        const withError = [...nextMessages, errorMessage];
        setAgentMessages(withError);
        if (currentSpaceId) saveAgentChat(currentSpaceId, withError);
      }
    },
    [agentMessages, effectiveAiSettings, agentPromptOverlay, cropProfile, currentSpaceId, growContext],
  );

  const clearAgentConversation = useCallback(() => {
    setAgentMessages([]);
    if (currentSpaceId) clearAgentChat(currentSpaceId);
  }, [currentSpaceId]);

  const updateSpace = (id: string, name: string) => {
    void dataLayer.spaces.update(id, { name }).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const updateSpaceDetails = async (id: string, input: import('../domain/space/space.types').UpdateSpaceInput) => {
    const payload = { ...input };
    if (input.dimensions) {
      Object.assign(payload, computeSpaceMetrics(input.dimensions));
    }
    await dataLayer.spaces.update(id, payload);
    await runtimeService.afterConfigurationChange();
    syncFromLayer();
  };

  const duplicateSpace = async (id: string, name?: string): Promise<string | null> => {
    if (isReadOnly) return null;
    const snapshot = dataLayer.getSnapshot();
    const bundle = buildDuplicateSpaceBundle(snapshot, id, name);
    if (!bundle) return null;
    await dataLayer.setSnapshot({
      ...snapshot,
      spaces: [...snapshot.spaces, bundle.space],
      devices: [...snapshot.devices, ...bundle.devices],
      automations: [...snapshot.automations, ...bundle.automations],
      spaceMaps: bundle.spaceMap ? [...snapshot.spaceMaps, bundle.spaceMap] : snapshot.spaceMaps,
      plants: [...snapshot.plants, ...bundle.plants],
      plantGroups: [...snapshot.plantGroups, ...bundle.plantGroups],
    });
    await dataLayer.settings.update({ currentSpaceId: bundle.space.id });
    await runtimeService.afterConfigurationChange();
    syncFromLayer();
    return bundle.space.id;
  };

  const getSpaceSummary = (spaceId: string) => summarizeSpace(dataLayer.getSnapshot(), spaceId);

  const updateSpaceDimensions = (id: string, dimensions: SpaceDimensions) => {
    const metrics = computeSpaceMetrics(dimensions);
    void dataLayer.spaces
      .update(id, { dimensions, ...metrics })
      .then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const ensureSpaceMap = (spaceId: string) => {
    void dataLayer.spaceMaps.ensureForSpace(spaceId).then(() => syncFromLayer());
  };

  const saveSpaceMap = (map: SpaceMap) => {
    if (!canEditMap(activeRole ?? 'owner')) return;
    void dataLayer.spaceMaps.save(map).then(() => syncFromLayer());
  };

  const createPlant = async (input: CreatePlantInput) => {
    const plant = await dataLayer.plants.create(input);
    syncFromLayer();
    return plant;
  };

  const updatePlantFn = (id: string, input: UpdatePlantInput) => {
    void dataLayer.plants.update(id, input).then(() => syncFromLayer());
  };

  const deletePlant = (id: string) => {
    void dataLayer.plants.delete(id).then(() => syncFromLayer());
  };

  const createPlantGroup = async (input: CreatePlantGroupInput) => {
    const group = await dataLayer.plants.createGroup(input);
    syncFromLayer();
    return group;
  };

  const updatePlantGroup = (id: string, input: UpdatePlantGroupInput) => {
    void dataLayer.plants.updateGroup(id, input).then(() => syncFromLayer());
  };

  const applyMapLayout = async (layout: import('../domain/map/map-blueprint.types').LayoutPreview) => {
    const allPlants = await dataLayer.plants.list();
    const allGroups = await dataLayer.plants.listGroups();
    const spaceId = layout.map.spaceId;
    await dataLayer.plants.replaceAll(
      [...allPlants.filter((p) => p.spaceId !== spaceId), ...layout.plants],
      [...allGroups.filter((g) => g.spaceId !== spaceId), ...layout.groups],
    );
    await dataLayer.spaceMaps.save(layout.map);
    syncFromLayer();
  };

  const createSpaceWithLayout = async (
    input: import('../domain/space/space.types').CreateSpaceInput,
    template?: import('../domain/map/space-templates.types').TemplateGenerateInput,
  ) => {
    const space = await dataLayer.spaces.create({
      ...input,
      spatialScale: input.spatialScale ?? spatialScaleForType(input.type, input.dimensions ? input.dimensions.lengthM * input.dimensions.widthM : undefined),
      spatialKind: input.spatialKind ?? spatialKindForType(input.type),
    });
    await dataLayer.settings.update({ currentSpaceId: space.id });
    if (template) {
      await applyMapLayout(generateSpaceLayout({ ...template, spaceId: space.id }));
    }
    await runtimeService.afterConfigurationChange();
    syncFromLayer();
    return space.id;
  };

  const deleteSpace = (id: string) => {
    if (!dataLayer || !runtimeService || !canDeleteSpace(activeRole ?? 'owner')) return;
    const snapshot = dataLayer.getSnapshot();
    if (snapshot.spaces.length <= 1) return;
    void dataLayer.spaces.delete(id).then(async () => {
      const snapshot = dataLayer.getSnapshot();
      if (snapshot.settings.currentSpaceId === id) {
        await dataLayer.settings.update({ currentSpaceId: snapshot.spaces[0]?.id ?? '' });
      }
      await runtimeService.afterConfigurationChange();
      syncFromLayer();
    });
  };

  const addDevice = (modelId: string, customName: string, spaceId: string): string => {
    if (!canManageDevices(activeRole ?? 'owner')) return '';
    let newId = '';
    void dataLayer.devices.create({ modelId, customName, name: customName, spaceId }).then(async (device) => {
      newId = device.id;
      await runtimeService.afterConfigurationChange();
      syncFromLayer();
    });
    return newId;
  };

  const updateDeviceName = (id: string, customName: string) => {
    void dataLayer.devices.update(id, { customName }).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const assignDeviceToSpace = (id: string, spaceId: string) => {
    if (!canManageDevices(activeRole ?? 'owner')) return;
    const device = devices.find((d) => d.id === id);
    if (!device || device.spaceId === spaceId) return;
    void dataLayer.devices.update(id, { spaceId }).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const deleteDevice = (id: string) => {
    if (!canManageDevices(activeRole ?? 'owner')) return;
    void dataLayer.devices.delete(id).then(() => {
      void dataLayer.automations.deleteByDevice(id).then(() => {
        void runtimeService.afterConfigurationChange().then(() => {
          syncFromLayer();
          if (selectedDeviceDetail?.id === id) setSelectedDeviceDetail(null);
        });
      });
    });
  };

  const configurePortInput = (deviceId: string, portId: string, updates: Partial<PortInput>) => {
    void dataLayer.devices.configureSensor(deviceId, portId, updates).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const configurePortOutput = (deviceId: string, portId: string, updates: Partial<PortOutput>) => {
    void dataLayer.devices.configureOutput(deviceId, portId, updates).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const toggleOutput = (deviceId: string, outputId: string) => {
    if (!runtimeService || !canToggleOutput(activeRole ?? 'owner')) return;
    void runtimeService.toggleOutputManual(deviceId, outputId).then(() => syncFromLayer());
  };

  const setOutputAutoMode = (deviceId: string, outputId: string, isAuto: boolean) => {
    if (!canToggleOutput(activeRole ?? 'owner')) return;
    if (isAuto) {
      void runtimeService.returnOutputToAuto(deviceId, outputId).then(() => syncFromLayer());
      return;
    }
    void runtimeService.setOutputManual(deviceId, outputId, true).then(() => syncFromLayer());
  };

  const setOutputTwinMode = (
    deviceId: string,
    outputId: string,
    mode: import('../domain/equipment/output-twin-mode').OutputTwinMode,
  ) => {
    if (!runtimeService || !canToggleOutput(activeRole ?? 'owner')) return;
    if (mode === 'auto') {
      void runtimeService.returnOutputToAuto(deviceId, outputId).then(() => syncFromLayer());
      return;
    }
    void runtimeService.setOutputManual(deviceId, outputId, mode === 'on').then(() => syncFromLayer());
  };

  const turnOffAllInSpace = (spaceId?: string) => {
    if (!canToggleOutput(activeRole ?? 'owner')) return;
    void runtimeService.emergencyOff(spaceId || currentSpaceId).then(() => syncFromLayer());
  };

  const releaseEmergency = () => {
    void runtimeService.releaseEmergency(currentSpaceId).then(() => syncFromLayer());
  };

  const getSensorHistory = (sensorId: string) => runtimeService.getSensorHistory(sensorId);

  const toggleSensorHomeVisibility = (deviceId: string, portId: string) => {
    void dataLayer.devices.toggleSensorHomeVisibility(deviceId, portId).then(() => syncFromLayer());
  };

  const addAutomation = (auto: import('../domain/automation/automation.types').CreateAutomationInput): string => {
    if (!dataLayer || !runtimeService || !canManageAutomations(activeRole ?? 'owner')) return '';
    let newId = '';
    void dataLayer.automations.create(auto).then(async (automation) => {
      newId = automation.id;
      await runtimeService.afterConfigurationChange();
      syncFromLayer();
    });
    return newId;
  };

  const updateAutomation = (id: string, updates: Partial<Automation>) => {
    if (!canManageAutomations(activeRole ?? 'owner')) return;
    void dataLayer.automations.update(id, updates).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const deleteAutomation = (id: string) => {
    if (!canManageAutomations(activeRole ?? 'owner')) return;
    void dataLayer.automations.delete(id).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const toggleAutomation = (id: string) => {
    if (!canManageAutomations(activeRole ?? 'owner')) return;
    void dataLayer.automations.toggle(id).then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const exportDataJson = () => {
    const snapshot = dataLayer.getSnapshot();
    return JSON.stringify(
      {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        spaces: snapshot.spaces,
        devices: snapshot.devices.map(stripEphemeralDevice),
        automations: snapshot.automations.map(stripEphemeralAutomation),
        spaceMaps: snapshot.spaceMaps,
        plants: snapshot.plants,
        plantGroups: snapshot.plantGroups,
        exportedAt: new Date().toISOString(),
        app: 'QBX — Quantum BotaniX',
      },
      null,
      2,
    );
  };

  const importDataJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString) as Record<string, unknown>;
      if (data.schemaVersion != null && data.schemaVersion !== EXPORT_SCHEMA_VERSION) return false;
      if (!Array.isArray(data.spaces) || !Array.isArray(data.devices) || !Array.isArray(data.automations)) {
        return false;
      }
      void dataLayer.dataManagement
        .importBundle({
          schemaVersion: EXPORT_SCHEMA_VERSION,
          spaces: data.spaces,
          devices: data.devices,
          automations: data.automations,
          spaceMaps: Array.isArray(data.spaceMaps) ? data.spaceMaps : [],
          plants: Array.isArray(data.plants) ? data.plants : [],
          plantGroups: Array.isArray(data.plantGroups) ? data.plantGroups : [],
          exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
          app: typeof data.app === 'string' ? data.app : 'QBX — Quantum BotaniX',
        })
        .then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()))
        .catch((e) => console.error('Import failed', e));
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  const resetToDefault = () => {
    void dataLayer.dataManagement.resetToDefaults().then(() => runtimeService.afterConfigurationChange().then(() => syncFromLayer()));
  };

  const value: AppContextType = {
    currentTab,
    setCurrentTab,
    accountSection,
    setAccountSection,
    openAccount,
    isPlatformAdminOpen,
    openPlatformAdmin,
    closePlatformAdmin,
    theme,
    setTheme,
    tempUnit,
    setTempUnit,
    growPhase,
    setGrowPhase,
    currentGrowPhaseInfo,
    isGrowPhaseModalOpen,
    setIsGrowPhaseModalOpen,
    spaces,
    currentSpaceId,
    setCurrentSpaceId,
    currentSpace,
    addSpace,
    updateSpace,
    updateSpaceDetails,
    updateSpaceDimensions,
    duplicateSpace,
    getSpaceSummary,
    deleteSpace,
    devices,
    currentSpaceDevices,
    addDevice,
    updateDeviceName,
    assignDeviceToSpace,
    deleteDevice,
    configurePortInput,
    configurePortOutput,
    toggleOutput,
    setOutputAutoMode,
    setOutputTwinMode,
    turnOffAllInSpace,
    automations,
    currentSpaceAutomations,
    addAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    allSensorsInCurrentSpace,
    allOutputsInCurrentSpace,
    toggleSensorHomeVisibility,
    selectedSensor,
    setSelectedSensor,
    selectedEquipment,
    setSelectedEquipment,
    selectedDeviceDetail,
    setSelectedDeviceDetail,
    isAddDeviceOpen,
    setIsAddDeviceOpen,
    openAddDevice: (preferredModelId?: string) => {
      setAddDevicePreferredModelId(preferredModelId ?? null);
      setIsAddDeviceOpen(true);
    },
    addDevicePreferredModelId,
    isAddAutomationOpen,
    setIsAddAutomationOpen,
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    exportDataJson,
    importDataJson,
    resetToDefault,
    catalog,
    isEmergencyActive,
    releaseEmergency,
    getSensorHistory,
    aiSettings,
    updateAiSettings,
    agentQuickPrompts,
    workspaceAiManaged,
    isSpaceAdvisorOpen,
    setIsSpaceAdvisorOpen,
    applySpaceAdvisorRecommendation,
    agentDisplayBriefing,
    growAgentAnalysis,
    growContext,
    cropProfile,
    setCropProfile,
    agentMessages,
    agentLoading,
    agentError,
    isAgentOpen,
    setIsAgentOpen,
    refreshAgentBriefing,
    askAgentQuestion,
    clearAgentConversation,
    currentSpaceMap,
    currentSpacePlants,
    currentPlantGroups,
    ensureSpaceMap,
    saveSpaceMap,
    createPlant,
    updatePlant: updatePlantFn,
    deletePlant,
    createPlantGroup,
    updatePlantGroup,
    applyMapLayout,
    createSpaceWithLayout,
    mapViewMode,
    setMapViewMode,
    runtimeSnapshot,
    runtimeEvents,
    spatialFocus,
    setSpatialFocus,
    activeRole,
    isReadOnly,
    reloadWorkspaceData,
    dataLayer,
  };

  if (dataBooting || !dataLayer || !runtimeService) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090b]">
        <p className="text-sm text-slate-500">Загрузка workspace…</p>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export { GROW_PHASES };
