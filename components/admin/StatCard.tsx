interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  textColor?: string;
}

export default function StatCard({ title, value, icon, color, textColor = "text-gray-900" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-normal leading-tight">{title}</p>
        <p className={`text-2xl font-semibold mt-0.5 ${textColor}`}>{value}</p>
      </div>
    </div>
  );
}
