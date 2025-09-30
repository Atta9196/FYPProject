import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';

export function FirebaseAuthProvider({ children }) {
  // Firebase handled server-side; keep as pass-through for compatibility
  return children;
}

export function AppProvider({ children }) {
  return React.createElement(AuthProvider, null, children);
}


