import React, { useState } from 'react';
import './App.css';
import { Jobs } from './Jobs/Jobs.tsx';
import { SettingsModal } from './Settings/SettingsModal.tsx';
import { storage, type AppStorage } from './storage.ts';

export function LegacyApp() {
  return <Jobs onOpenSettings={() => {}}></Jobs>;
}

export function App() {
  // storage reads are synchronous, so state can initialize directly from it
  const [appStorage, setAppStorage] = useState<AppStorage>(() => storage.get());
  const [showModal, setShowModal] = useState(!appStorage.isOnboarded);

  return (
    <>
      {showModal && (
        <SettingsModal
          appStorage={appStorage}
          onClose={() => setShowModal(false)}
          setAppStorage={(s) => {
            storage.set(s);
            setAppStorage(s);
          }}
        />
      )}
      {appStorage.isOnboarded && (
        <Jobs onOpenSettings={() => setShowModal(true)}></Jobs>
      )}
    </>
  );
}
