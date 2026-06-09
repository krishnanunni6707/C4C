interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  textColor?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  textColor = "text-gray-900",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium leading-tight">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
      </div>
    </div>
  );
}
