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
    <nav className="bg-white border-t fixed bottom-0 left-0 right-0">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `py-3 px-2 text-sm font-medium ${
                  isActive
                    ? 'text-indigo-600 border-t-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
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
