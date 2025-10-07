import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { 
  HomeLanding,
  DashboardView,
  SpeakingPracticeView,
  FullTestSimulatorView,
  MCQPracticeView,
  PerformanceDashboardView,
  ProfileView,
  SupportView
} from '../pages/appPages';
import Login from '../pages/login';
import Register from '../pages/register';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<PrivateRoute><DashboardView /></PrivateRoute>} />
      <Route path="/speaking" element={<PrivateRoute><SpeakingPracticeView /></PrivateRoute>} />
      <Route path="/tests" element={<PrivateRoute><FullTestSimulatorView /></PrivateRoute>} />
      <Route path="/mcq" element={<PrivateRoute><MCQPracticeView /></PrivateRoute>} />
      <Route path="/performance" element={<PrivateRoute><PerformanceDashboardView /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfileView /></PrivateRoute>} />
      <Route path="/support" element={<SupportView />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


