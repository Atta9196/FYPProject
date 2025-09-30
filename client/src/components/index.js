import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  return React.createElement(
    'nav',
    { className: 'w-full px-4 py-3 border-b bg-white' },
    'Navbar'
  );
}

export function Footer() {
  return React.createElement(
    'footer',
    { className: 'w-full px-4 py-3 border-t bg-white' },
    'Footer'
  );
}

export function ProtectedRoute({ requireAuth, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (requireAuth && !user) return React.createElement(Navigate, { to: '/login', replace: true });
  if (requireAuth === false && user) return React.createElement(Navigate, { to: '/dashboard', replace: true });
  return children;
}



