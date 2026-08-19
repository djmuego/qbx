/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { LocaleProvider } from './i18n/LocaleContext';
import { AuthGate } from './components/auth/AuthGate';
import { AppProvider, useApp } from './context/AppContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { HomeStatusBanner } from './components/home/HomeStatusBanner';
import { GrowPhaseTile } from './components/home/GrowPhaseTile';
import { GrowAgentTile } from './components/home/GrowAgentTile';
import { GrowJournalTile } from './components/home/GrowJournalTile';
import { SensorsGrid } from './components/home/SensorsGrid';
import { EquipmentGrid } from './components/home/EquipmentGrid';
import { TwinControlsOnboarding } from './components/equipment/TwinControlsOnboarding';
import { HomeAutomationsTile } from './components/home/HomeAutomationsTile';
import { AutomationsList } from './components/automations/AutomationsList';
import { AddAutomationModal } from './components/automations/AddAutomationModal';
import { DevicesList } from './components/devices/DevicesList';
import { DeviceDetailModal } from './components/devices/DeviceDetailModal';
import { AddDeviceModal } from './components/devices/AddDeviceModal';
import { SensorDetailModal } from './components/modals/SensorDetailModal';
import { EquipmentDetailModal } from './components/modals/EquipmentDetailModal';
import { EmergencyOffModal } from './components/modals/EmergencyOffModal';
import { GrowPhaseModal } from './components/modals/GrowPhaseModal';
import { SpaceAdvisorModal } from './components/modals/SpaceAdvisorModal';
import { AgentModal } from './components/modals/AgentModal';
import { SettingsView } from './components/settings/SettingsView';
import { AccountView } from './components/account/AccountView';
import { GrowMapView } from './components/map/GrowMapView';
import { PlatformAdminModal } from './components/admin/PlatformAdminModal';

const MainContent: React.FC = () => {
  const { currentTab, dataLayer, reloadWorkspaceData, isPlatformAdminOpen, closePlatformAdmin } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Top Application Header */}
      <Header />

      {/* Main Bento Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12 space-y-6">
        {currentTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bento Row: Status Banner + Grow Mode */}
            <div className="grid grid-cols-12 gap-4 lg:gap-5 items-stretch">
              <div className="col-span-12 lg:col-span-8 flex flex-col">
                <HomeStatusBanner />
              </div>
              <div className="col-span-12 lg:col-span-4 flex flex-col">
                <GrowPhaseTile />
              </div>
            </div>

            {/* QBX Agent — signature feature */}
            <GrowAgentTile />

            <GrowJournalTile />

            <TwinControlsOnboarding />

            {/* Sensors Bento Grid */}
            <SensorsGrid />

            {/* Bottom Bento Row: Equipment Grid + Quick Automations */}
            <div className="grid grid-cols-12 gap-4 lg:gap-5 items-stretch">
              <div className="col-span-12 lg:col-span-8">
                <EquipmentGrid />
              </div>
              <div className="col-span-12 lg:col-span-4 flex flex-col">
                <HomeAutomationsTile />
              </div>
            </div>
          </div>
        )}

        {currentTab === 'automations' && (
          <div className="animate-in fade-in duration-200">
            <AutomationsList />
          </div>
        )}

        {currentTab === 'devices' && (
          <div className="animate-in fade-in duration-200">
            <DevicesList />
          </div>
        )}

        {currentTab === 'map' && (
          <div className="animate-in fade-in duration-200">
            <GrowMapView />
          </div>
        )}

        {currentTab === 'account' && (
          <div className="animate-in fade-in duration-200">
            <AccountView dataLayer={dataLayer} onDataReload={reloadWorkspaceData} />
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="animate-in fade-in duration-200">
            <SettingsView />
          </div>
        )}
      </main>

      {/* Interactive Overlays & Modals */}
      <SensorDetailModal />
      <EquipmentDetailModal />
      <DeviceDetailModal />
      <AddDeviceModal />
      <AddAutomationModal />
      <EmergencyOffModal />
      <GrowPhaseModal />
      <SpaceAdvisorModal />
      <AgentModal />

      <PlatformAdminModal open={isPlatformAdminOpen} onClose={closePlatformAdmin} />

      <BottomNav />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <AuthGate>
          <AppProvider>
            <SubscriptionProvider>
              <MainContent />
            </SubscriptionProvider>
          </AppProvider>
        </AuthGate>
      </LocaleProvider>
    </AuthProvider>
  );
}
