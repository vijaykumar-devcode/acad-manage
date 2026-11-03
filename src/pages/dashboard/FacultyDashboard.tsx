import { StatCard } from '../../components/ui/StatCard';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, 
  BookOpen, 
  FileText, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { RenderIcon } from '../../components/common/RenderIcon';
import { CreateClassModal } from '../../components/classes/CreateClassModal';
import { CreateAssignmentModal } from '../../components/assignments/CreateAssignmentModal';
import { CreateQuizModal } from '../../components/quizzes/CreateQuizModal';
import { SkeletonStatCard, SkeletonCard } from '../../components/ui/Skeletons';

export function FacultyDashboard() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [clsRes, asnRes, qzRes] = await Promise.all([
          api.get('/classes').catch(() => ({ data: { data: [] } })),
          api.get('/assignments/my-feed').catch(() => ({ data: { data: [] } })),
          api.get('/quizzes/my-feed').catch(() => ({ data: { data: [] } }))
        ]);

        const extract = (res: any) => {
          const d = res.data?.data || res.data;
          return Array.isArray(d) ? d : [];
        };

        setClasses(extract(clsRes));
        setAssignments(extract(asnRes));
        setQuizzes(extract(qzRes));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
              <div className="h-6 w-32 bg-slate-200 animate-pulse rounded mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
              <div className="h-6 w-32 bg-slate-200 animate-pulse rounded mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Active Classes" value={classes.length} icon={BookOpen} />
        <StatCard title="Total Students" value="-" icon={Users} />
        <StatCard title="Active Assignments" value={assignments.length} icon={FileText} />
        <StatCard title="Need Evaluation" value="-" icon={AlertCircle} />
        <StatCard title="Running Quizzes" value={quizzes.length} icon={ClipboardList} />
        <StatCard title="Published Results" value="3" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Classes</h3>
              <Link to="/classes" className="text-sm font-medium text-primary hover:text-primary-hover">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.slice(0, 4).map(cls => (
                <Link 
                  key={cls._id} 
                  to={`/classes/${cls._id}`}
                  className="block p-4 rounded-lg border border-surface-border hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-canvas-alt text-slate-600 rounded-md">
                      {cls.code}
                    </span>
                    <span className="text-xs text-slate-500">Students</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 group-hover:text-primary transition-colors line-clamp-1">
                    {cls.subjectName}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">{cls.schedule}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Assignments</h3>
              <Link to="/assignments" className="text-sm font-medium text-primary hover:text-primary-hover">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-canvas-alt uppercase">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Title</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 rounded-r-lg">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.slice(0, 5).map(assignment => {
                    const cls = classes.find(c => c._id === assignment.classId);
                    return (
                      <tr key={assignment._id} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <RenderIcon name={assignment.iconName} color={assignment.iconColor} className="w-4 h-4 shrink-0" />
                            <span className="truncate">{assignment.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{cls?.code}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(assignment.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-600">{assignment.maxMarks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Evaluation</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Thread Synchronization</p>
                  <p className="text-xs text-slate-500">CS302 • 12 pending</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">SQL Queries</p>
                  <p className="text-xs text-slate-500">CS301 • 5 pending</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsClassModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-canvas-alt hover:bg-canvas border border-transparent hover:border-primary transition-all text-slate-700 hover:text-primary"
              >
                <BookOpen className="h-6 w-6 mb-2" />
                <span className="text-xs font-medium">New Class</span>
              </button>
              <button 
                onClick={() => setIsAssignmentModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-canvas-alt hover:bg-canvas border border-transparent hover:border-primary transition-all text-slate-700 hover:text-primary"
              >
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-xs font-medium">Assignment</span>
              </button>
              <button 
                onClick={() => setIsQuizModalOpen(true)}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-canvas-alt hover:bg-canvas border border-transparent hover:border-primary transition-all text-slate-700 hover:text-primary"
              >
                <ClipboardList className="h-6 w-6 mb-2" />
                <span className="text-xs font-medium">New Quiz</span>
              </button>
              <button 
                onClick={() => navigate('/classes')}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-canvas-alt hover:bg-canvas border border-transparent hover:border-primary transition-all text-slate-700 hover:text-primary"
              >
                <Users className="h-6 w-6 mb-2" />
                <span className="text-xs font-medium">Students</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isClassModalOpen && (
        <CreateClassModal isOpen={true} onClose={() => setIsClassModalOpen(false)} />
      )}
      {isAssignmentModalOpen && (
        <CreateAssignmentModal isOpen={true} onClose={() => setIsAssignmentModalOpen(false)} />
      )}
      {isQuizModalOpen && (
        <CreateQuizModal isOpen={true} onClose={() => setIsQuizModalOpen(false)} />
      )}
    </div>
  );
}
