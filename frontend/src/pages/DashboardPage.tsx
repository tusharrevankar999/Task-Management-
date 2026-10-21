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
          <div
            key={card.label}
            className="bg-white rounded-2xl border-2 border-gray-200 hover:border-black px-7 py-8 min-h-[140px] flex flex-col justify-center cursor-pointer transition-all duration-200 hover:shadow-md"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {card.label}
            </p>
            <p className={`text-xl font-bold ${card.color} truncate`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
