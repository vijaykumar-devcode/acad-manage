import * as LucideIcons from 'lucide-react';

export interface RenderIconProps extends Omit<LucideIcons.LucideProps, 'ref'> {
  name?: string;
}

export function RenderIcon({ name = 'FileText', color = '#2563eb', ...props }: RenderIconProps) {
  // @ts-ignore - Dynamic key access
  const IconComponent = LucideIcons[name] || LucideIcons.FileText;
  
  return <IconComponent color={color} {...props} />;
}
