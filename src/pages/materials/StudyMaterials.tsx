import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { AddMaterialModal } from '../../components/materials/AddMaterialModal';
import { Badge } from '../../components/ui/Badge';
import { 
  FileText, 
  Search, 
  LayoutGrid, 
  List, 
  Plus,
  Cloud,
  HardDrive,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function StudyMaterials() {
  const { user } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [classes, setClasses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [clsRes, matRes] = await Promise.all([
        api.get('/classes').catch(() => ({ data: { data: [] } })),
        api.get('/materials/my-feed').catch(() => ({ data: { data: [] } }))
      ]);
      const extract = (res: any) => {
        const d = res.data?.data || res.data;
        return Array.isArray(d) ? d : [];
      };
      console.log("Raw materials received from API:", matRes.data);
      setClasses(extract(clsRes));
      setMaterials(extract(matRes));
    } catch (error) {
      console.error('Error fetching study materials data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // STUDENT RESOURCE SCOPING RULE
  const userClasses = useMemo(() => {
    if (!user || !classes) return [];
    // The backend /classes endpoint already correctly scopes classes to the logged-in user
    return classes;
  }, [user, classes]);


  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      // Subject Filter: If 'all' or 'All Subjects', allow everything
      const matchesSubject = 
        !subjectFilter ||
        subjectFilter === 'all' || 
        subjectFilter === 'All Subjects' || 
        material.classId?._id === subjectFilter || 
        material.classId === subjectFilter;

      // Search Query Filter
      const matchesSearch = 
        !searchQuery || 
        material.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        material.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSubject && matchesSearch;
    });
  }, [materials, searchQuery, subjectFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Materials</h1>
          <p className="text-slate-500 text-sm mt-1">Access and manage course resources.</p>
        </div>
        <div>
          {user?.role === 'Faculty' && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Materials" value={materials.length} icon={FileText} />
        <StatCard title="Active Classes" value={userClasses.length} icon={BookOpen} />
        <StatCard title="Recently Added" value="-" icon={Plus} />
        <StatCard title="Drive Connected" value={materials.length} icon={Cloud} />
      </div>

      {user?.role === 'Faculty' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0 h-min">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Zero-Storage Google Drive Integration</h3>
            <p className="text-sm text-blue-800">
              1. Upload your file to Google Drive.<br/>
              2. Right-click and share, setting general access to <strong>"Anyone with the link"</strong>.<br/>
              3. Paste that link here to provide instant, secure access without using platform storage.
            </p>
          </div>
        </div>
      )}

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search materials..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select 
            className="w-full sm:w-auto h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">All Subjects</option>
            {userClasses.map(cls => (
              <option key={cls._id} value={cls._id}>{cls.subjectCode || cls.code} - {cls.subjectName || cls.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-1 bg-canvas-alt p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-surface text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-surface text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full py-8 text-center text-slate-500">Loading...</div>
          ) : filteredMaterials.map(material => {
            const mClassIdStr = typeof material.classId === 'object' ? material.classId?._id : material.classId;
            const cls = classes.find(c => c._id === mClassIdStr) || (typeof material.classId === 'object' ? material.classId : null);
            return (
              <div key={material._id} className="bg-surface rounded-xl border border-surface-border p-5 hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant={material.fileType === 'PDF' ? 'error' : material.fileType === 'Code' ? 'warning' : 'info'}>
                    {material.fileType} • {material.fileSize}
                  </Badge>
                  <span className="text-xs text-slate-500">{new Date(material.uploadedAt || material.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{material.title}</h3>
                <div className="mb-3">
                  <Badge variant="default" className="text-xs bg-primary/5 text-primary border-primary/20">
                    {cls?.subjectCode || cls?.code || 'Unknown'} - {cls?.subjectName || cls?.name || 'Class'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{material.description}</p>
                
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {material.tags?.map((tag: string) => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 bg-canvas-alt text-slate-600 rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                <a 
                  href={material.gDriveUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-canvas-alt hover:bg-canvas border border-surface-border rounded-lg text-sm font-medium text-slate-700 hover:text-primary transition-colors mt-auto"
                >
                  Open Google Drive <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
              <tr>
                <th className="px-6 py-4">Title & Description</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Type & Size</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map(material => {
                const mClassIdStr = typeof material.classId === 'object' ? material.classId?._id : material.classId;
                const cls = classes.find(c => c._id === mClassIdStr) || (typeof material.classId === 'object' ? material.classId : null);
                return (
                  <tr key={material._id} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{material.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{material.description}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <Badge variant="default" className="text-xs bg-slate-50">
                        {cls?.subjectCode || cls?.code || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <Badge variant="default" className="mr-2">{material.fileType}</Badge>
                      <span className="text-xs">{material.fileSize}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={material.gDriveUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover font-medium text-sm px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <Cloud className="h-4 w-4" /> Open
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12 bg-surface rounded-xl border border-surface-border border-dashed">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No materials found</h3>
          <p className="text-slate-500 text-sm mt-1">No study materials match your filters.</p>
        </div>
      )}

      <AddMaterialModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
