import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { CreateClassModal } from '../../components/classes/CreateClassModal';
import { EditClassModal } from '../../components/classes/EditClassModal';
import { JoinClassModal } from '../../components/classes/JoinClassModal';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Search,
  LayoutGrid,
  List,
  Users,
  Copy,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { RenderIcon } from '../../components/common/RenderIcon';
import { SkeletonCard } from '../../components/ui/Skeletons';

export function ClassesOverview() {
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const isFacultyOrAdmin = user?.role === 'Faculty' || user?.role === 'Admin';

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      const data = response.data.data || response.data;
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const matchesSearch = cls.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cls.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSemester = semesterFilter 
        ? String(cls.semester).replace(/\D/g, '') === semesterFilter 
        : true;
      
      return matchesSearch && matchesSemester;
    });
  }, [classes, searchQuery, semesterFilter]);

  const handleCopyJoinLink = (joinCode: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const joinUrl = `${window.location.origin}/join/${joinCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedCode(joinCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteClass = async (cls: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `Permanently delete "${cls.subjectName}"?\n\nThis will also delete all assignments, quizzes, materials, notices, enrollments, marks, and results for this class. This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await api.delete(`/classes/${cls._id || cls.id}`);
      toast.success(`"${cls.subjectName}" deleted successfully.`);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete class.');
    }
  };

  const handleDeleteAllClasses = async () => {
    const confirmText = window.prompt(
      `This will permanently delete ALL your classes and all their data (assignments, quizzes, materials, notices, marks, results).\n\nType DELETE ALL to confirm:`
    );
    if (confirmText !== 'DELETE ALL') {
      if (confirmText !== null) toast.error('Confirmation text did not match. No classes were deleted.');
      return;
    }
    setIsDeletingAll(true);
    try {
      const res = await api.delete('/classes');
      toast.success(res.data.message || 'All classes deleted.');
      fetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete all classes.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and view all your enrolled classes.</p>
          </div>
          <div>
            {user?.role === 'Faculty' || user?.role === 'Admin' ? (
              <Button disabled>
                <BookOpen className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            ) : (
              <Button disabled>
                <Users className="h-4 w-4 mr-2" />
                Join Class
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-xl border border-surface-border">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="h-10 w-64 bg-slate-200 animate-pulse rounded-md"></div>
            <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-md"></div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto p-1 bg-canvas-alt rounded-lg border border-surface-border">
            <div className="h-8 w-10 bg-slate-200 animate-pulse rounded-md"></div>
            <div className="h-8 w-10 bg-slate-200 animate-pulse rounded-md"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and view all your enrolled classes.</p>
        </div>
        <div className="flex items-center gap-3">
          {isFacultyOrAdmin ? (
            <>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Create Class
              </Button>
              {classes.length > 0 && (
                <button
                  onClick={handleDeleteAllClasses}
                  disabled={isDeletingAll}
                  title="Delete all your classes"
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 px-3 py-2 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isDeletingAll ? 'Deleting…' : 'Delete All'}
                </button>
              )}
            </>
          ) : (
            <Button onClick={() => setIsJoinModalOpen(true)}>
              Join Class
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Classes" value={filteredClasses.length} icon={BookOpen} />
        <StatCard title="Active Students" value="-" icon={Users} />
        <StatCard title="Semesters Active" value="3" icon={Calendar} />
      </div>

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <label htmlFor="classes-search" className="sr-only">Search classes</label>
            <input 
              id="classes-search"
              name="classes-search"
              type="text" 
              autoComplete="off"
              placeholder="Search classes by name or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <label htmlFor="classes-semester-filter" className="sr-only">Filter by semester</label>
          <select 
            id="classes-semester-filter"
            name="classes-semester-filter"
            autoComplete="off"
            className="w-full sm:w-auto h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
          >
            <option value="">All Semesters</option>
            <option value="1">1st Semester</option>
            <option value="2">2nd Semester</option>
            <option value="3">3rd Semester</option>
            <option value="4">4th Semester</option>
            <option value="5">5th Semester</option>
            <option value="6">6th Semester</option>
            <option value="7">7th Semester</option>
            <option value="8">8th Semester</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClasses.map(cls => (
            <div key={cls._id || cls.id} className="relative group">
              <Link
                to={`/classes/${cls._id || cls.id}`}
                className="bg-surface rounded-xl border border-surface-border overflow-hidden hover:border-primary hover:shadow-md transition-all flex flex-col h-full block"
              >
                <div className="h-2 bg-primary w-full"></div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-canvas-alt border border-surface-border">
                        <RenderIcon name={cls.iconName || 'BookOpen'} color={cls.iconColor || '#2563eb'} className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-md">
                        {cls.subjectCode}
                      </span>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-canvas-alt text-slate-600 rounded-md">
                      Semester {cls.semester}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 mb-1">
                    {cls.subjectName}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">{cls.department}</p>

                  <div className="mt-auto pt-4 border-t border-surface-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{cls.students?.length || cls.studentCount || 0} Students</span>
                    </div>
                    {user?.role === 'Faculty' && (
                      <button
                        onClick={(e) => handleCopyJoinLink(cls.joinCode, e)}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors',
                          copiedCode === cls.joinCode
                            ? 'bg-green-50 text-green-700'
                            : 'bg-canvas-alt text-slate-600 hover:bg-canvas hover:text-primary'
                        )}
                      >
                        {copiedCode === cls.joinCode ? (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Copied</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </Link>

              {/* Edit + Delete buttons — Faculty/Admin only, appear on hover */}
              {isFacultyOrAdmin && (
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingClass(cls); }}
                    title="Edit class"
                    className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-500 hover:text-primary hover:border-primary hover:bg-white shadow-sm transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClass(cls, e)}
                    title="Delete class"
                    className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 shadow-sm transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-surface-border overflow-x-auto overflow-y-hidden custom-scrollbar w-full">
          <table className="w-full min-w-[700px] text-sm text-left">
            <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
              <tr>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Department & Sem</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map(cls => (
                <tr key={cls._id || cls.id} className="border-b border-surface-border last:border-0 hover:bg-canvas/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link to={`/classes/${cls._id || cls.id}`} className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-canvas-alt border border-surface-border shrink-0 group-hover:border-primary/30 transition-colors">
                        <RenderIcon name={cls.iconName || 'BookOpen'} color={cls.iconColor || '#2563eb'} className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-primary transition-colors">{cls.subjectName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cls.subjectCode}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {cls.department} <br/>
                    <span className="text-xs text-slate-500">Sem {cls.semester} • Sec {cls.section}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-slate-400" />
                      {cls.students?.length || cls.studentCount || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user?.role === 'Faculty' && (
                        <button
                          onClick={(e) => handleCopyJoinLink(cls.joinCode, e)}
                          title="Copy Join Link"
                          className={cn(
                            'p-2 rounded-md transition-colors',
                            copiedCode === cls.joinCode ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-primary hover:bg-canvas-alt'
                          )}
                        >
                          {copiedCode === cls.joinCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                      <Link
                        to={`/classes/${cls._id || cls.id}`}
                        className="text-primary hover:text-primary-hover font-medium text-xs px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        View Details
                      </Link>
                      {isFacultyOrAdmin && (
                        <>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingClass(cls); }}
                            title="Edit class"
                            className="p-2 rounded-md text-slate-400 hover:text-primary hover:bg-canvas-alt transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClass(cls, e)}
                            title="Delete class"
                            className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredClasses.length === 0 && (
        <div className="text-center py-12 bg-surface rounded-xl border border-surface-border border-dashed">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No classes found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      )}

      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchClasses}
      />

      <EditClassModal
        isOpen={!!editingClass}
        classData={editingClass}
        onClose={() => setEditingClass(null)}
        onSuccess={() => { setEditingClass(null); fetchClasses(); }}
      />

      <JoinClassModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}
