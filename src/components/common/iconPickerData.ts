export interface IconMetadata {
  id: string;
  name: string;
  lucideName: string;
  category: string;
  keywords: string[];
  defaultColor: string;
}

export const PRESET_COLORS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Gray', hex: '#64748b' }
];

export const iconRegistry: IconMetadata[] = [
  // Academic
  { id: '1', name: 'Document', lucideName: 'FileText', category: 'Academic', keywords: ['document', 'assignment', 'paper', 'text'], defaultColor: '#3b82f6' },
  { id: '2', name: 'Quiz', lucideName: 'HelpCircle', category: 'Academic', keywords: ['quiz', 'exam', 'test', 'question'], defaultColor: '#a855f7' },
  { id: '3', name: 'Graduation', lucideName: 'GraduationCap', category: 'Academic', keywords: ['graduation', 'student', 'cap', 'alumni'], defaultColor: '#22c55e' },
  { id: '4', name: 'Book', lucideName: 'BookOpen', category: 'Academic', keywords: ['book', 'read', 'study', 'course'], defaultColor: '#f97316' },
  { id: '5', name: 'Award', lucideName: 'Award', category: 'Academic', keywords: ['award', 'prize', 'achievement'], defaultColor: '#ef4444' },
  { id: '6', name: 'Calendar', lucideName: 'Calendar', category: 'Academic', keywords: ['calendar', 'date', 'schedule'], defaultColor: '#14b8a6' },
  { id: '7', name: 'Megaphone', lucideName: 'Megaphone', category: 'Academic', keywords: ['megaphone', 'announcement', 'speaker'], defaultColor: '#f97316' },
  { id: '8', name: 'Presentation', lucideName: 'Presentation', category: 'Academic', keywords: ['presentation', 'slide', 'projector'], defaultColor: '#3b82f6' },
  { id: '9', name: 'Users', lucideName: 'Users', category: 'Academic', keywords: ['users', 'group', 'team', 'class'], defaultColor: '#64748b' },
  { id: '10', name: 'Check Square', lucideName: 'CheckSquare', category: 'Academic', keywords: ['check', 'square', 'task', 'todo'], defaultColor: '#22c55e' },

  // Programming
  { id: '11', name: 'Code', lucideName: 'Code', category: 'Programming', keywords: ['code', 'programming', 'script', 'dev', 'html'], defaultColor: '#14b8a6' },
  { id: '12', name: 'Terminal', lucideName: 'Terminal', category: 'Programming', keywords: ['terminal', 'console', 'bash', 'cli'], defaultColor: '#64748b' },
  { id: '13', name: 'Bug', lucideName: 'Bug', category: 'Programming', keywords: ['bug', 'debug', 'error', 'issue'], defaultColor: '#ef4444' },
  { id: '14', name: 'Git Branch', lucideName: 'GitBranch', category: 'Programming', keywords: ['git', 'branch', 'vcs', 'version', 'github'], defaultColor: '#f97316' },
  { id: '15', name: 'Folder Tree', lucideName: 'FolderTree', category: 'Programming', keywords: ['folder', 'tree', 'directory', 'structure'], defaultColor: '#3b82f6' },
  { id: '16', name: 'CPU', lucideName: 'Cpu', category: 'Programming', keywords: ['cpu', 'processor', 'hardware'], defaultColor: '#a855f7' },
  { id: '17', name: 'Globe', lucideName: 'Globe', category: 'Programming', keywords: ['globe', 'web', 'internet', 'world'], defaultColor: '#3b82f6' },
  { id: '18', name: 'Layers', lucideName: 'Layers', category: 'Programming', keywords: ['layers', 'stack', 'overlay'], defaultColor: '#f97316' },
  { id: '19', name: 'Binary', lucideName: 'Binary', category: 'Programming', keywords: ['binary', 'code', 'numbers', '01'], defaultColor: '#22c55e' },
  { id: '20', name: 'File Code', lucideName: 'FileCode', category: 'Programming', keywords: ['file', 'code', 'script'], defaultColor: '#14b8a6' },

  // Mathematics
  { id: '21', name: 'Calculator', lucideName: 'Calculator', category: 'Mathematics', keywords: ['calculator', 'math', 'calc', 'numbers'], defaultColor: '#3b82f6' },
  { id: '22', name: 'Sigma', lucideName: 'Sigma', category: 'Mathematics', keywords: ['sigma', 'math', 'sum', 'function'], defaultColor: '#a855f7' },
  { id: '23', name: 'Trending Up', lucideName: 'TrendingUp', category: 'Mathematics', keywords: ['trending', 'up', 'graph', 'growth'], defaultColor: '#22c55e' },
  { id: '24', name: 'Pie Chart', lucideName: 'PieChart', category: 'Mathematics', keywords: ['pie', 'chart', 'graph', 'data'], defaultColor: '#f97316' },
  { id: '25', name: 'Bar Chart', lucideName: 'BarChart3', category: 'Mathematics', keywords: ['bar', 'chart', 'graph', 'data', 'statistics'], defaultColor: '#3b82f6' },
  { id: '26', name: 'Variable', lucideName: 'Variable', category: 'Mathematics', keywords: ['variable', 'math', 'algebra', 'x'], defaultColor: '#ef4444' },
  { id: '27', name: 'Compass', lucideName: 'Compass', category: 'Mathematics', keywords: ['compass', 'geometry', 'math', 'draw'], defaultColor: '#64748b' },

  // Database
  { id: '28', name: 'Database', lucideName: 'Database', category: 'Database', keywords: ['database', 'db', 'sql', 'storage', 'data'], defaultColor: '#a855f7' },
  { id: '29', name: 'Hard Drive', lucideName: 'HardDrive', category: 'Database', keywords: ['hard', 'drive', 'disk', 'storage'], defaultColor: '#64748b' },
  { id: '30', name: 'Server', lucideName: 'Server', category: 'Database', keywords: ['server', 'host', 'network', 'machine'], defaultColor: '#14b8a6' },
  { id: '31', name: 'Cloud', lucideName: 'Cloud', category: 'Database', keywords: ['cloud', 'aws', 'azure', 'internet'], defaultColor: '#3b82f6' },
  { id: '32', name: 'Table', lucideName: 'Table', category: 'Database', keywords: ['table', 'grid', 'data', 'row', 'column'], defaultColor: '#22c55e' },

  // AI & Data Science
  { id: '33', name: 'Brain', lucideName: 'Brain', category: 'AI & Data Science', keywords: ['brain', 'ai', 'artificial intelligence', 'machine learning', 'neural'], defaultColor: '#a855f7' },
  { id: '34', name: 'Bot', lucideName: 'Bot', category: 'AI & Data Science', keywords: ['bot', 'robot', 'automation', 'machine'], defaultColor: '#3b82f6' },
  { id: '35', name: 'Network', lucideName: 'Network', category: 'AI & Data Science', keywords: ['network', 'graph', 'node', 'connection'], defaultColor: '#14b8a6' },
  { id: '36', name: 'Eye', lucideName: 'Eye', category: 'AI & Data Science', keywords: ['eye', 'vision', 'computer vision', 'watch'], defaultColor: '#64748b' },
  { id: '37', name: 'Sparkles', lucideName: 'Sparkles', category: 'AI & Data Science', keywords: ['sparkles', 'magic', 'ai', 'generate'], defaultColor: '#f97316' },
  { id: '38', name: 'Line Chart', lucideName: 'LineChart', category: 'AI & Data Science', keywords: ['line', 'chart', 'graph', 'data', 'trend'], defaultColor: '#22c55e' },

  // Electronics & Electrical
  { id: '39', name: 'CPU', lucideName: 'Cpu', category: 'Electronics & Electrical', keywords: ['cpu', 'processor', 'chip', 'hardware'], defaultColor: '#3b82f6' },
  { id: '40', name: 'Circuit Board', lucideName: 'CircuitBoard', category: 'Electronics & Electrical', keywords: ['circuit', 'board', 'pcb', 'electronics'], defaultColor: '#22c55e' },
  { id: '41', name: 'Zap', lucideName: 'Zap', category: 'Electronics & Electrical', keywords: ['zap', 'bolt', 'electricity', 'power', 'energy'], defaultColor: '#f97316' },
  { id: '42', name: 'Plug', lucideName: 'Plug', category: 'Electronics & Electrical', keywords: ['plug', 'socket', 'electric', 'power'], defaultColor: '#a855f7' },
  { id: '43', name: 'Radio', lucideName: 'Radio', category: 'Electronics & Electrical', keywords: ['radio', 'signal', 'wave', 'broadcast'], defaultColor: '#14b8a6' },
  { id: '44', name: 'Signal', lucideName: 'Signal', category: 'Electronics & Electrical', keywords: ['signal', 'wave', 'antenna', 'connection'], defaultColor: '#ef4444' },
  { id: '45', name: 'Battery Charging', lucideName: 'BatteryCharging', category: 'Electronics & Electrical', keywords: ['battery', 'charging', 'power', 'energy'], defaultColor: '#22c55e' },
  { id: '46', name: 'Gauge', lucideName: 'Gauge', category: 'Electronics & Electrical', keywords: ['gauge', 'meter', 'measure', 'speed'], defaultColor: '#64748b' },
  { id: '47', name: 'Activity', lucideName: 'Activity', category: 'Electronics & Electrical', keywords: ['activity', 'pulse', 'wave', 'monitor'], defaultColor: '#f97316' },

  // Mechanical
  { id: '48', name: 'Wrench', lucideName: 'Wrench', category: 'Mechanical', keywords: ['wrench', 'tool', 'mechanic', 'fix'], defaultColor: '#64748b' },
  { id: '49', name: 'Settings', lucideName: 'Settings', category: 'Mechanical', keywords: ['settings', 'gear', 'cog', 'mechanical'], defaultColor: '#3b82f6' },
  { id: '50', name: 'Flame', lucideName: 'Flame', category: 'Mechanical', keywords: ['flame', 'fire', 'heat', 'burn', 'thermo'], defaultColor: '#ef4444' },
  { id: '51', name: 'Wind', lucideName: 'Wind', category: 'Mechanical', keywords: ['wind', 'air', 'flow', 'fluid'], defaultColor: '#14b8a6' },
  { id: '52', name: 'Factory', lucideName: 'Factory', category: 'Mechanical', keywords: ['factory', 'industry', 'manufacturing', 'plant'], defaultColor: '#a855f7' },
  { id: '53', name: 'Gauge', lucideName: 'Gauge', category: 'Mechanical', keywords: ['gauge', 'meter', 'pressure', 'measure'], defaultColor: '#f97316' },

  // Civil
  { id: '54', name: 'Building', lucideName: 'Building', category: 'Civil', keywords: ['building', 'civil', 'architecture', 'structure'], defaultColor: '#14b8a6' },
  { id: '55', name: 'Ruler', lucideName: 'Ruler', category: 'Civil', keywords: ['ruler', 'measure', 'length', 'drafting'], defaultColor: '#f97316' },
  { id: '56', name: 'Truck', lucideName: 'Truck', category: 'Civil', keywords: ['truck', 'vehicle', 'transport', 'construction'], defaultColor: '#64748b' },
  { id: '57', name: 'Hard Hat', lucideName: 'HardHat', category: 'Civil', keywords: ['hard', 'hat', 'helmet', 'safety', 'construction'], defaultColor: '#ef4444' },
  { id: '58', name: 'Landmark', lucideName: 'Landmark', category: 'Civil', keywords: ['landmark', 'building', 'architecture', 'monument'], defaultColor: '#3b82f6' },

  // Security
  { id: '59', name: 'Shield Check', lucideName: 'ShieldCheck', category: 'Security', keywords: ['shield', 'check', 'security', 'secure', 'auth', 'cyber'], defaultColor: '#22c55e' },
  { id: '60', name: 'Lock', lucideName: 'Lock', category: 'Security', keywords: ['lock', 'security', 'password', 'private'], defaultColor: '#ef4444' },
  { id: '61', name: 'Key', lucideName: 'Key', category: 'Security', keywords: ['key', 'security', 'access', 'auth'], defaultColor: '#f97316' },
  { id: '62', name: 'Fingerprint', lucideName: 'Fingerprint', category: 'Security', keywords: ['fingerprint', 'security', 'biometric', 'auth'], defaultColor: '#3b82f6' },
  { id: '63', name: 'Shield Alert', lucideName: 'ShieldAlert', category: 'Security', keywords: ['shield', 'alert', 'security', 'warning'], defaultColor: '#ef4444' },
];
