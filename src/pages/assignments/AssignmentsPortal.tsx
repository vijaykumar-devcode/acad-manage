import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AssignmentDetailsDrawer } from '../../components/assignments/AssignmentDetailsDrawer';
import { CreateAssignmentModal } from '../../components/assignments/CreateAssignmentModal';
import { EditAssignmentModal } from '../../components/assignments/EditAssignmentModal';

import { SkeletonTable, SkeletonStatCard } from '../../components/ui/Skeletons';
import { RenderIcon } from '../../components/common/RenderIcon';
import type { Assignment } from '../../types';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function AssignmentsPortal() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [asnRes, clsRes] = await Promise.all([
          api.get('/assignments/my-feed').catch(() => ({ data: { data: [] } })),
          api.get('/classes').catch(() => ({ data: { data: [] } }))
        ]);
        const extract = (res: any) => {
          const d = res.data?.data || res.data;
          return Array.isArray(d) ? d : [];
        };
        setAssignments(extract(asnRes));
        setClasses(extract(clsRes));
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAssignmentCreated = () => {
    // Re-fetch assignments after creation
    const fetchData = async () => {
      try {
        const [asnRes, clsRes] = await Promise.all([
          api.get('/assignments/my-feed').catch(() => ({ data: { data: [] } })),
          api.get('/classes').catch(() => ({ data: { data: [] } }))
        ]);
        const extract = (res: any) => {
          const d = res.data?.data || res.data;
          return Array.isArray(d) ? d : [];
        };
        setAssignments(extract(asnRes));
        setClasses(extract(clsRes));
      } catch (error) {
        console.error('Error fetching assignments:', error);
      }
    };
    fetchData();
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      setAssignments(prev => prev.filter(a => (a._id || a.id) !== id));
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment');
    }
  };

  const assignmentsWithSubmissions = useMemo(() => {
    return assignments.map(assignment => {
      const isPastDue = new Date(assignment.dueDate) < new Date();
      let status = isPastDue ? 'Late' : 'Pending';
      if (assignment.submission) {
        status = assignment.submission.status;
      }
      return { assignment, submission: assignment.submission || null, status };
    });
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignmentsWithSubmissions.filter(item => {
      const cls = classes.find(c => c._id === item.assignment.classId?._id || c._id === item.assignment.classId);
      const matchesSearch = item.assignment.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cls?.subjectName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter ? item.status === statusFilter : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [assignmentsWithSubmissions, searchQuery, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: assignmentsWithSubmissions.length,
      pending: assignmentsWithSubmissions.filter(i => i.status === 'Pending').length,
      submitted: assignmentsWithSubmissions.filter(i => i.status === 'Submitted' || i.status === 'Evaluated').length,
      late: assignmentsWithSubmissions.filter(i => i.status === 'Late').length,
    };
  }, [assignmentsWithSubmissions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assignments Portal</h1>
            <p className="text-slate-500 text-sm mt-1">Track and submit your course assignments.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Track and submit your course assignments.</p>
        </div>
        <div>
          {user?.role === 'Faculty' && (
            <div className="flex gap-3">
              <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
              <Button onClick={() => navigate('/assignment-evaluation')}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Evaluate
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Assignments" value={counts.total} icon={FileText} />
        <StatCard title="Pending" value={counts.pending} icon={Clock} />
        <StatCard title="Submitted" value={counts.submitted} icon={CheckCircle2} />
        <StatCard title="Late / Missing" value={counts.late} icon={AlertCircle} />
      </div>

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <label htmlFor="assignments-search" className="sr-only">Search assignments</label>
            <input 
              id="assignments-search"
              name="assignments-search"
              type="text" 
              autoComplete="off"
              placeholder="Search assignments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <label htmlFor="assignments-status-filter" className="sr-only">Filter by status</label>
            <select 
              id="assignments-status-filter"
              name="assignments-status-filter"
              autoComplete="off"
              className="w-full sm:w-auto h-10 pl-10 pr-8 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Late">Late</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-x-auto overflow-y-hidden custom-scrollbar w-full">
        <table className="w-full min-w-[700px] text-sm text-left">
          <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
            <tr>
              <th className="px-6 py-4">Assignment</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.map(({ assignment, status }) => {
              const cls = classes.find(c => c._id === assignment.classId?._id || c._id === assignment.classId);
              return (
                <tr key={assignment._id} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-surface border border-surface-border shrink-0">
                        <RenderIcon name={assignment.iconName} color={assignment.iconColor} className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{assignment.title}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="default" className="text-[10px] py-0.5">{assignment.submissionType}</Badge>
                          <span className="text-xs text-slate-500">{assignment.maxMarks} Marks</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {cls ? (
                      <Badge variant="default" className="text-xs bg-slate-50">{cls.subjectCode || cls.subjectName}</Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">Unknown</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(assignment.dueDate).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={
                        status === 'Evaluated' ? 'success' : 
                        status === 'Submitted' ? 'info' : 
                        status === 'Late' ? 'error' : 'warning'
                      }
                    >
                      {status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setSelectedAssignment(assignment)}
                        className="inline-flex items-center text-primary hover:text-primary-hover font-medium text-sm px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        View Details
                      </button>
                      {user?.role === 'Faculty' && (
                        <>
                          <button 
                            onClick={() => setEditingAssignment(assignment)}
                            className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium text-sm p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAssignment(assignment._id || assignment.id)}
                            className="inline-flex items-center text-red-600 hover:text-red-700 font-medium text-sm p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No assignments found</h3>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters.</p>
          </div>
        )}
      </div>

      <AssignmentDetailsDrawer 
        isOpen={selectedAssignment !== null} 
        onClose={() => setSelectedAssignment(null)}
        assignment={selectedAssignment}
        submission={(selectedAssignment as any)?.submission || null}
        onSuccess={handleAssignmentCreated}
        onEdit={() => {
          setEditingAssignment(selectedAssignment);
          setSelectedAssignment(null);
        }}
        onDelete={() => handleDeleteAssignment(selectedAssignment?._id || selectedAssignment?.id || '')}
      />

      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleAssignmentCreated}
      />

      <EditAssignmentModal
        isOpen={editingAssignment !== null}
        onClose={() => setEditingAssignment(null)}
        onSuccess={handleAssignmentCreated}
        assignment={editingAssignment}
      />
    </div>
  );
}
