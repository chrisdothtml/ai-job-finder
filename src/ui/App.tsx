import React, { useState } from 'react';
import './App.css';
import { Jobs } from './Jobs/Jobs.tsx';
import { SettingsModal } from './Settings/SettingsModal.tsx';
import { appStorage, type AppStorage } from './storage.ts';

export function LegacyApp() {
  return <Jobs onOpenSettings={() => {}}></Jobs>;
}

export function App() {
  // storage reads are synchronous, so state can initialize directly from it
  const [storageState, setStorageState] = useState<AppStorage>(() =>
    appStorage.get()
  );
  const [showModal, setShowModal] = useState(!storageState.isOnboarded);

  return (
    <>
      {showModal && (
        <SettingsModal
          appStorage={storageState}
          onClose={() => setShowModal(false)}
          setAppStorage={(s) => {
            appStorage.set(s);
            setStorageState(s);
          }}
        />
      )}
      {storageState.isOnboarded && (
        <Jobs onOpenSettings={() => setShowModal(true)}></Jobs>
      )}
    </>
  );
}
