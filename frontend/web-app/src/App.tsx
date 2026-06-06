import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Rules from './pages/Rules';
import RuleEditor from './pages/RuleEditor';
import Scenes from './pages/Scenes';
import Alerts from './pages/Alerts';
import Rooms from './pages/Rooms';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="devices" element={<Devices />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="rules" element={<Rules />} />
        <Route path="rules/new" element={<RuleEditor />} />
        <Route path="rules/:id" element={<RuleEditor />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
