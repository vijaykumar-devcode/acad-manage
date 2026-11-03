import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    success: 'bg-green-50 text-green-700 ring-green-600/20',
    warning: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    error: 'bg-red-50 text-red-700 ring-red-600/10',
    info: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    default: 'bg-slate-50 text-slate-600 ring-slate-500/10',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
