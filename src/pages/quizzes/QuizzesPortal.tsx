import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CreateQuizModal } from '../../components/quizzes/CreateQuizModal';
import { QuizDetailsDrawer } from '../../components/quizzes/QuizDetailsDrawer';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { RenderIcon } from '../../components/common/RenderIcon';
import { SkeletonTable, SkeletonStatCard } from '../../components/ui/Skeletons';
import type { Quiz } from '../../types';
import { 
  ClipboardList, 
  Clock, 
  PlayCircle,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function QuizzesPortal() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [classes, setClasses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, qRes, aRes] = await Promise.all([
        api.get('/classes').catch(() => ({ data: { data: [] } })),
        api.get('/quizzes/my-feed').catch(() => ({ data: { data: [] } })),
        api.get('/quizzes/attempts/all').catch(() => ({ data: { data: [] } }))
      ]);

      const extractClasses = (res: any) => {
        const d = res.data?.data || res.data;
        return Array.isArray(d) ? d : [];
      };

      const extractQuizzes = (res: any) => {
        const d = res.data?.quizzes || res.data?.data || res.data;
        return Array.isArray(d) ? d : [];
      };

      setClasses(extractClasses(cRes));
      
      const rawQuizzes = extractQuizzes(qRes);
      const computedQuizzes = rawQuizzes.map((quiz: any) => {
        const now = new Date();
        const startTime = new Date(quiz.startTime);
        const endTime = new Date(quiz.endTime);
        let computedStatus = 'Scheduled';
        if (now > endTime) {
          computedStatus = 'Closed';
        } else if (now >= startTime && now <= endTime) {
          computedStatus = 'Active';
        }
        return { ...quiz, status: computedStatus };
      });
      setQuizzes(computedQuizzes);
      
      setQuizAttempts(extractClasses(aRes));
    } catch (err) {
      setError('Failed to load quizzes');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);



  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const clsId = typeof quiz.classId === 'object' ? (quiz.classId as any)?._id || (quiz.classId as any)?.id : quiz.classId;
      const cls = classes.find(c => c.id === clsId || (c as any)._id === clsId) || (typeof quiz.classId === 'object' ? quiz.classId : null);
      
      const matchesSearch = quiz.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (cls as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (cls as any)?.subjectName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter ? quiz.status === statusFilter : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [quizzes, searchQuery, statusFilter, classes]);

  const counts = useMemo(() => {
    return {
      total: quizzes.length,
      scheduled: quizzes.filter(q => q.status === 'Scheduled').length,
      active: quizzes.filter(q => q.status === 'Active').length,
      closed: quizzes.filter(q => q.status === 'Closed').length,
    };
  }, [quizzes]);

  const handleActionClick = (quiz: Quiz) => {
    if (user?.role === 'Faculty') {
      setSelectedQuiz(quiz);
    }
  };

  const renderStudentAction = (quiz: Quiz) => {
    const userId = (user as any)?._id || user?.id;
    const attempt = quizAttempts.find(qa => {
      const qIdMatch = qa.quizId === quiz.id || qa.quizId === (quiz as any)._id;
      const sIdMatch = qa.studentId === userId || qa.studentId?._id === userId;
      return qIdMatch && sIdMatch;
    });

    const isUserAttempted = attempt?.status === 'Completed' || attempt?.status === 'Evaluated' || attempt?.status === 'Submitted';

    const status = quiz.status; // Rely on the computed status that is displayed on the badge

    if (isUserAttempted && status !== 'Closed' && user?.role === 'Student') {
      return (
        <Button variant="secondary" disabled className="w-full sm:w-auto opacity-70 cursor-not-allowed">
          Submitted (Results pending)
        </Button>
      );
    }

    if (status === 'Closed' || isUserAttempted) {
      return (
        <Button variant="secondary" onClick={() => navigate(`/quizzes/${(quiz as any)._id || quiz.id}/result`)} className="w-full sm:w-auto">
          View Results
        </Button>
      );
    }

    if (status === 'Active') {
      return (
        <Button onClick={() => navigate(`/quizzes/${(quiz as any)._id || quiz.id}/take`)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
          {attempt?.status === 'In-Progress' ? 'Resume Quiz' : 'Start Quiz'}
        </Button>
      );
    }

    // Scheduled / Upcoming
    return (
      <Button disabled className="w-full sm:w-auto opacity-50 cursor-not-allowed">
        Upcoming
      </Button>
    );
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quizzes & Exams</h1>
            <p className="text-slate-500 text-sm mt-1">Manage, participate in, and review quizzes for your classes.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <ClipboardList className="h-12 w-12 text-red-300 mb-3" />
        <h3 className="text-lg font-medium text-slate-900">{error}</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">There was a problem communicating with the server.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === 'Faculty' ? 'Create and manage online quizzes for your classes.' : 'Take upcoming quizzes and review past performances.'}
          </p>
        </div>
        <div>
          {user?.role === 'Faculty' && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Quizzes" value={counts.total} icon={ClipboardList} />
        <StatCard title="Scheduled" value={counts.scheduled} icon={Clock} />
        <StatCard title="Active" value={counts.active} icon={PlayCircle} />
        <StatCard title="Closed" value={counts.closed} icon={CheckCircle2} />
      </div>

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search quizzes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              className="w-full sm:w-auto h-10 pl-10 pr-8 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {user?.role === 'Faculty' && <option value="Draft">Draft</option>}
              <option value="Scheduled">Scheduled</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-canvas-alt p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setViewMode('table')}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === 'table' ? "bg-surface text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <List className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-surface text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
              <tr>
                <th className="px-6 py-4">Quiz</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes?.map(quiz => {
                const clsId = typeof quiz.classId === 'object' ? (quiz.classId as any)?._id || (quiz.classId as any)?.id : quiz.classId;
                const cls = classes.find(c => c.id === clsId || (c as any)._id === clsId) || (typeof quiz.classId === 'object' ? quiz.classId : null);
                return (
                  <tr key={(quiz as any)._id || quiz.id} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{quiz.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{quiz.totalMarks} Marks</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default" className="text-xs bg-slate-50">
                        {quiz.subject || cls?.subjectCode || cls?.code || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {quiz.durationMinutes} mins
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {new Date(quiz.startTime).toLocaleString()} <br/>
                      to {new Date(quiz.endTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={
                          quiz.status === 'Active' ? 'success' : 
                          quiz.status === 'Scheduled' ? 'info' : 
                          quiz.status === 'Closed' ? 'error' : 'default'
                        }
                      >
                        {quiz.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user?.role === 'Faculty' ? (
                        <button 
                          onClick={() => handleActionClick(quiz)}
                          className="inline-flex items-center text-primary hover:text-primary-hover font-medium text-sm px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          View Details
                        </button>
                      ) : (
                        renderStudentAction(quiz)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredQuizzes.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No quizzes found</h3>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes?.map(quiz => {
            const clsId = typeof quiz.classId === 'object' ? (quiz.classId as any)?._id || (quiz.classId as any)?.id : quiz.classId;
            const cls = classes.find(c => c.id === clsId || (c as any)._id === clsId) || (typeof quiz.classId === 'object' ? quiz.classId : null);
            return (
              <div key={(quiz as any)._id || quiz.id} className="bg-surface rounded-xl border border-surface-border p-5 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-surface border border-surface-border">
                      <RenderIcon name={quiz.iconName} color={quiz.iconColor} className="w-5 h-5" />
                    </div>
                    <Badge variant="info">{quiz.subject || cls?.subjectCode || cls?.code}</Badge>
                  </div>
                  <Badge 
                    variant={
                      quiz.status === 'Active' ? 'success' : 
                      quiz.status === 'Scheduled' ? 'info' : 
                      quiz.status === 'Closed' ? 'error' : 'default'
                    }
                  >
                    {quiz.status}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">{quiz.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{quiz.description}</p>
                
                <div className="bg-canvas-alt rounded-lg p-3 space-y-2 mb-4 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium text-slate-900">{quiz.durationMinutes} mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Marks:</span>
                    <span className="font-medium text-slate-900">{quiz.totalMarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Starts:</span>
                    <span className="font-medium text-slate-900">{new Date(quiz.startTime).toLocaleDateString()}</span>
                  </div>
                </div>

                {user?.role === 'Faculty' ? (
                  <Button variant="secondary" onClick={() => handleActionClick(quiz)} className="w-full">
                    Manage Quiz
                  </Button>
                ) : (
                  renderStudentAction(quiz)
                )}
              </div>
            );
          })}
        </div>
      )}

      {user?.role === 'Faculty' && (
        <>
          <ErrorBoundary fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-lg">
                <h3 className="text-lg font-bold text-slate-900">Modal Crashed</h3>
                <p className="text-sm text-slate-600 mt-2">There was an error loading the quiz creator.</p>
                <Button onClick={() => window.location.reload()} className="mt-4 w-full">Reload Page</Button>
              </div>
            </div>
          }>
            <CreateQuizModal 
              isOpen={isCreateModalOpen} 
              onClose={() => setIsCreateModalOpen(false)} 
              onSuccess={fetchData}
            />
          </ErrorBoundary>
          <QuizDetailsDrawer 
            isOpen={selectedQuiz !== null} 
            onClose={() => setSelectedQuiz(null)}
            quiz={selectedQuiz}
            onSuccess={fetchData}
          />
        </>
      )}
    </div>
  );
}
