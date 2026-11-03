import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';
import { RenderIcon } from './RenderIcon';
import { iconRegistry, PRESET_COLORS, type IconMetadata } from './iconPickerData';

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string, iconColor: string) => void;
  initialIcon?: string;
  initialColor?: string;
}

export function IconPicker({ isOpen, onClose, onSelect, initialColor = '#2563eb' }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [recentIcons, setRecentIcons] = useState<IconMetadata[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedColor(initialColor);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      // Load recents
      try {
        const saved = localStorage.getItem('recentIcons');
        if (saved) {
          setRecentIcons(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Could not load recent icons', e);
      }
    }
  }, [isOpen, initialColor]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const saveRecent = (icon: IconMetadata) => {
    try {
      const newRecents = [icon, ...recentIcons.filter(i => i.id !== icon.id)].slice(0, 8);
      setRecentIcons(newRecents);
      localStorage.setItem('recentIcons', JSON.stringify(newRecents));
    } catch (e) {
      console.error('Could not save recent icons', e);
    }
  };

  const handleSelect = (icon: IconMetadata) => {
    saveRecent(icon);
    onSelect(icon.lucideName, selectedColor);
    onClose();
  };

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return iconRegistry;
    const query = searchQuery.toLowerCase();
    return iconRegistry.filter(icon => 
      icon.name.toLowerCase().includes(query) || 
      icon.category.toLowerCase().includes(query) ||
      icon.keywords.some(k => k.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Group by category
  const categories = useMemo(() => {
    const groups: Record<string, IconMetadata[]> = {};
    filteredIcons.forEach(icon => {
      if (!groups[icon.category]) groups[icon.category] = [];
      groups[icon.category].push(icon);
    });
    return groups;
  }, [filteredIcons]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icon-picker-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="icon-picker-title" className="text-lg font-bold text-slate-900">Select Icon</h2>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search and Color Picker */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search icons (e.g. database, math, network)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Icon Color</span>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.hex)}
                  title={color.name}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-black/10"
                  style={{ backgroundColor: color.hex }}
                >
                  {selectedColor.toLowerCase() === color.hex.toLowerCase() && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
              ))}
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              <input 
                type="color" 
                value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                title="Custom Color"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
          
          {searchQuery === '' && recentIcons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Recently Used</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {recentIcons.map(icon => (
                  <button
                    key={`recent-${icon.id}`}
                    onClick={() => handleSelect(icon)}
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-100 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    title={icon.name}
                  >
                    <RenderIcon name={icon.lucideName} color={selectedColor} className="w-6 h-6 mb-2 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] text-slate-500 truncate w-full text-center group-hover:text-primary">{icon.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {Object.entries(categories).map(([category, icons]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{category}</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {icons.map(icon => (
                  <button
                    key={icon.id}
                    onClick={() => handleSelect(icon)}
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-100 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                    title={icon.name}
                  >
                    <RenderIcon name={icon.lucideName} color={selectedColor} className="w-6 h-6 mb-2 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] text-slate-500 truncate w-full text-center group-hover:text-primary">{icon.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(categories).length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No icons found</p>
              <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
