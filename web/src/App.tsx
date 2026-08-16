import React from 'react';
import { LootQueueConsole } from './components/LootQueueConsole';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LootQueueConsole />
    </div>
  );
};

export default App;
