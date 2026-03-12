import { NavLink } from 'react-router-dom';

export function Navigation() {
  const navItems = [
    { to: '/', icon: '📖', label: '学习' },
    { to: '/review', icon: '🔄', label: '复习' },
    { to: '/stats', icon: '📊', label: '统计' },
    { to: '/settings', icon: '⚙️', label: '设置' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="max-w-md mx-auto flex justify-around">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-4 ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl">{icon}</span>
            <span className="text-xs mt-0.5">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
