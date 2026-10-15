import { useAuth } from '../context/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back, {user?.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Here's what's happening on your account today.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive', color: user?.isActive ? 'text-green-600' : 'text-red-500' },
          { label: 'Your Role', value: user?.role === 'admin' ? 'Administrator' : 'Standard User', color: 'text-gray-900' },
          { label: 'Email', value: user?.email ?? '—', color: 'text-gray-700' },
        ].map((card) => (
          <div key={card.label} className="card px-6 py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {card.label}
            </p>
            <p className={`text-lg font-semibold ${card.color} truncate`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
