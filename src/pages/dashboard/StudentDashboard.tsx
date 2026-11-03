import { StatCard } from '../../components/ui/StatCard';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  BookOpen, 
  FileText, 

  GraduationCap, 
  Clock,

  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { RenderIcon } from '../../components/common/RenderIcon';
import { SkeletonStatCard, SkeletonCard } from '../../components/ui/Skeletons';

export function StudentDashboard() {
  const [classes, setClasses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [publishedResultsCount, setPublishedResultsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, materialsRes, assignmentsRes, quizzesRes, resultsRes] = await Promise.all([
          api.get('/classes').catch(() => ({ data: { data: [] } })),
          api.get('/materials/my-feed').catch(() => ({ data: { data: [] } })),
          api.get('/assignments/my-feed').catch(() => ({ data: { data: [] } })),
          api.get('/quizzes/my-feed').catch(() => ({ data: { data: [] } })),
          api.get('/results/my-feed').catch(() => ({ data: { data: [] } }))
        ]);

        const extract = (res: any) => {
          const d = res.data?.data || res.data;
          return Array.isArray(d) ? d : [];
        };

        setClasses(extract(classesRes));
        setMaterials(extract(materialsRes));
        setAssignments(extract(assignmentsRes));
        setQuizzes(extract(quizzesRes));
        
        const resultsData = extract(resultsRes);
        const uniquePublishedClasses = new Set(resultsData.filter((r: any) => r.isPublished !== false).map((r: any) => r.classId));
        setPublishedResultsCount(uniquePublishedClasses.size);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <SkeletonStatCard key={i} />)}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Joined Classes" value={classes.length} icon={BookOpen} />
        <StatCard title="Study Materials" value={materials.length} icon={FileText} />
        <StatCard title="Pending Assignments" value={assignments.filter(a => a.status !== 'completed').length} icon={AlertCircle} />
        <StatCard title="Upcoming Quizzes" value={quizzes.length} icon={Clock} />
        <StatCard title="Published Results" value={publishedResultsCount} icon={GraduationCap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Study Materials</h3>
              <Link to="/materials" className="text-sm font-medium text-primary hover:text-primary-hover">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {materials.map(material => {
                const cls = classes.find(c => c._id === material.classId);
                return (
                  <div key={material._id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-canvas-alt transition-colors border border-transparent hover:border-surface-border">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 truncate">{material.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{cls?.code} • {new Date(material.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <a href={material.gDriveUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Pending Assignments</h3>
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
                    <th className="px-4 py-3 rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(assignment => {
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
                        <td className="px-4 py-3 text-slate-600">
                          <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
                            {assignment.status}
                          </span>
                        </td>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Quizzes</h3>
            <div className="space-y-4">
              {quizzes.map(quiz => {
                const cls = classes.find(c => c._id === quiz.classId);
                return (
                  <div key={quiz._id} className="p-3 border border-surface-border rounded-lg hover:border-primary transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold px-2 py-1 bg-canvas-alt text-slate-600 rounded-md">
                        {cls?.code}
                      </span>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                        {quiz.durationMinutes} mins
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RenderIcon name={quiz.iconName} color={quiz.iconColor} className="w-4 h-4 shrink-0" />
                      <h4 className="font-semibold text-slate-800">{quiz.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(quiz.startTime).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
            <div className="relative border-l border-surface-border ml-3 space-y-6">
              <div className="relative pl-6">
                <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-surface"></span>
                <p className="text-sm font-medium text-slate-800">Assignment Graded</p>
                <p className="text-xs text-slate-500 mt-0.5">Thread Synchronization • 85/100</p>
                <p className="text-xs text-slate-400 mt-1">2 hours ago</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-surface"></span>
                <p className="text-sm font-medium text-slate-800">New Material Added</p>
                <p className="text-xs text-slate-500 mt-0.5">Normalization Rules • CS301</p>
                <p className="text-xs text-slate-400 mt-1">Yesterday</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-surface"></span>
                <p className="text-sm font-medium text-slate-800">Joined Class</p>
                <p className="text-xs text-slate-500 mt-0.5">Computer Networks • CS303</p>
                <p className="text-xs text-slate-400 mt-1">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
