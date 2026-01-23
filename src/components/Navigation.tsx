import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/add', label: 'Add' },
  { to: '/pending', label: 'Pending' },
  { to: '/balances', label: 'Balances' },
];

export function Navigation() {
  return (
    <nav className="bg-gray-800 border-t border-gray-700 fixed bottom-0 left-0 right-0">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `py-3 px-2 text-sm font-medium ${
                  isActive
                    ? 'text-cyan-400 border-t-2 border-cyan-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
