import React from 'react';
import Login from './login';
import Register from './register';
import AboutPage from './AboutPage';
import Navbar from '../components/Navbar';

export function HomePage() {
  return React.createElement('div', { className: 'p-6' }, 'Home');
}
export function LoginPage() { return React.createElement(Login, null); }
export function RegisterPage() { return React.createElement(Register, null); }
export function ResetPasswordPage() { return React.createElement('div', { className: 'p-6' }, 'Reset Password'); }
export function AboutIELTSCoachPage() { return React.createElement(AboutPage, null); }

export function DashboardPage() {
  return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
    React.createElement(Navbar, null),
    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
      React.createElement('div', { className: 'mb-8' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' }, 'Dashboard'),
        React.createElement('p', { className: 'text-gray-600 mt-2' }, 'Welcome to your IELTS preparation journey')
      ),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
        React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6' },
          React.createElement('div', { className: 'flex items-center' },
            React.createElement('div', { className: 'p-3 bg-blue-100 rounded-full' },
              React.createElement('svg', { className: 'w-6 h-6 text-blue-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
              )
            ),
            React.createElement('div', { className: 'ml-4' },
              React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Practice Tests'),
              React.createElement('p', { className: 'text-gray-600' }, 'Take practice tests to improve your skills')
            )
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6' },
          React.createElement('div', { className: 'flex items-center' },
            React.createElement('div', { className: 'p-3 bg-green-100 rounded-full' },
              React.createElement('svg', { className: 'w-6 h-6 text-green-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 10V3L4 14h7v7l9-11h-7z' })
              )
            ),
            React.createElement('div', { className: 'ml-4' },
              React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Quick Practice'),
              React.createElement('p', { className: 'text-gray-600' }, 'Practice specific skills and sections')
            )
          )
        ),
        React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6' },
          React.createElement('div', { className: 'flex items-center' },
            React.createElement('div', { className: 'p-3 bg-purple-100 rounded-full' },
              React.createElement('svg', { className: 'w-6 h-6 text-purple-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
              )
            ),
            React.createElement('div', { className: 'ml-4' },
              React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Progress Tracking'),
              React.createElement('p', { className: 'text-gray-600' }, 'Monitor your improvement over time')
            )
          )
        )
      ),
      React.createElement('div', { className: 'mt-8' },
        React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-4' }, 'Recent Activity'),
        React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-6' },
          React.createElement('p', { className: 'text-gray-600' }, 'No recent activity. Start practicing to see your progress here!')
        )
      )
    )
  );
}

export function PracticePage() {
  return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
    React.createElement(Navbar, null),
    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
      React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 mb-8' }, 'Practice'),
      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8 text-center' },
        React.createElement('p', { className: 'text-gray-600 text-lg' }, 'Practice section coming soon!')
      )
    )
  );
}

export function TestsPage() {
  return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
    React.createElement(Navbar, null),
    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
      React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 mb-8' }, 'Tests'),
      React.createElement('div', { className: 'bg-white rounded-lg shadow-md p-8 text-center' },
        React.createElement('p', { className: 'text-gray-600 text-lg' }, 'Tests section coming soon!')
      )
    )
  );
}



