import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export const Tabs = ({ tabs, defaultTab, activeTab: controlledTab, onChange, className, fullWidth }: TabsProps) => {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id);
  const active = controlledTab !== undefined ? controlledTab : internalTab;

  const handleTabClick = (id: string) => {
    if (controlledTab === undefined) {
      setInternalTab(id);
    }
    if (onChange) {
      onChange(id);
    }
  };

  return (
    <div className={cn('border-b border-surface-border', className)}>
      <nav className={cn('flex -mb-px space-x-4', fullWidth && 'justify-between space-x-0')}>
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                fullWidth && 'flex-1 justify-center'
              )}
            >
              {Icon && <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-slate-400')} />}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
