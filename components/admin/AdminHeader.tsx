interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function AdminHeader({
  title,
  subtitle,
  children,
}: AdminHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
