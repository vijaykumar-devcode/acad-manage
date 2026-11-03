import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EvaluationDrawer } from '../../components/assignments/EvaluationDrawer';
import { CreateAssignmentModal } from '../../components/assignments/CreateAssignmentModal';
import type { Assignment, Submission } from '../../types';
import toast from 'react-hot-toast';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  Monitor,
  FileBox,
  Plus
} from 'lucide-react';

export function AssignmentEvaluation() {
  const { user } = useAuthStore();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submissionList, setSubmissionList] = useState<{ assignment: Assignment; submission: Submission; student: any }[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // drafts mapping: submission._id -> { marksObtained, feedback, status }
  const [draftGrades, setDraftGrades] = useState<Record<string, any>>({});
  const [editingRowIds, setEditingRowIds] = useState<Set<string>>(new Set());
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const fetchEvaluationsAndClasses = async () => {
    try {
      setLoading(true);
      const [evalRes, clsRes] = await Promise.all([
        api.get('/assignments/evaluations'),
        api.get('/classes').catch(() => ({ data: { data: [] } }))
      ]);
      setSubmissionList(evalRes.data || []);
      
      const extract = (res: any) => {
        const d = res.data?.data || res.data;
        return Array.isArray(d) ? d : [];
      };
      setClasses(extract(clsRes));
    } catch (error) {
      console.error(error);
      setSubmissionList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftChange = (submissionId: string, field: string, value: any) => {
    setDraftGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
  };

  const handleBulkSubmit = async () => {
    const payload = Object.entries(draftGrades).map(([subId, data]) => {
      // Find original submission to attach correct student/assignment IDs
      const orig = submissionList.find(s => (s.submission as any)._id === subId || s.submission.id === subId);
      if (!orig) return null;
      
      const parsedMarks = data.marksObtained !== '' ? Number(data.marksObtained) : undefined;
      
      return {
        submissionId: subId,
        studentId: orig.student._id || orig.student.id,
        assignmentId: (orig.assignment as any)._id || orig.assignment.id,
        marksObtained: parsedMarks,
        feedback: data.feedback,
        status: data.status || orig.submission.status
      };
    }).filter(Boolean);

    if (payload.length === 0) {
      toast.error('No changes to save.');
      return;
    }

    setIsSavingBulk(true);
    try {
      await api.post('/assignments/bulk-evaluate', payload);
      toast.success('All grades saved successfully!');
      setDraftGrades({});
      fetchEvaluationsAndClasses();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setIsSavingBulk(false);
      setEditingRowIds(new Set());
    }
  };

  const saveSingleEvaluation = async (subId: string) => {
    const data = draftGrades[subId];
    if (!data) return;

    const orig = submissionList.find(s => (s.submission as any)._id === subId || s.submission.id === subId);
    if (!orig) return;

    const parsedMarks = data.marksObtained !== '' ? Number(data.marksObtained) : undefined;
    
    const payload = [{
      submissionId: subId,
      studentId: orig.student._id || orig.student.id,
      assignmentId: (orig.assignment as any)._id || orig.assignment.id,
      marksObtained: parsedMarks,
      feedback: data.feedback,
      status: data.status || orig.submission.status
    }];

    setSavingRowId(subId);
    try {
      await api.post('/assignments/bulk-evaluate', payload);
      toast.success('Evaluation updated!');
      setDraftGrades(prev => {
        const next = { ...prev };
        delete next[subId];
        return next;
      });
      setEditingRowIds(prev => {
        const next = new Set(prev);
        next.delete(subId);
        return next;
      });
      fetchEvaluationsAndClasses();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update evaluation');
    } finally {
      setSavingRowId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvaluationsAndClasses();
    }
  }, [user]);

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const filteredList = useMemo(() => {
    return submissionList.filter(item => {
      const clsId = (item.assignment as any).classId?._id || (item.assignment as any).classId;
      
      const matchesSearch = item.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.assignment?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter ? item.submission?.status === statusFilter : true;
      const matchesClass = classFilter ? clsId === classFilter : true;
      
      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [submissionList, searchQuery, statusFilter, classFilter]);

  const counts = useMemo(() => {
    return {
      pendingEval: submissionList.filter(i => i.submission?.status === 'Submitted' || i.submission?.status === 'Late').length,
      evaluated: submissionList.filter(i => i.submission?.status === 'Evaluated').length,
      online: submissionList.filter(i => i.assignment?.submissionType === 'Online').length,
      offline: submissionList.filter(i => i.assignment?.submissionType === 'Offline').length,
    };
  }, [submissionList]);

  const handleEvaluationSaved = () => {
    fetchEvaluationsAndClasses();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading evaluations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignment Evaluation</h1>
          <p className="text-slate-500 text-sm mt-1">Review and grade student submissions.</p>
        </div>
        <div>
          {user?.role === 'Faculty' && (
            <div className="flex gap-3">
              <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
              <Button onClick={handleBulkSubmit} isLoading={isSavingBulk} disabled={Object.keys(draftGrades).length === 0}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save All Grades
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Evaluations" value={counts.pendingEval} icon={AlertCircle} />
        <StatCard title="Evaluated" value={counts.evaluated} icon={CheckCircle2} />
        <StatCard title="Online Submissions" value={counts.online} icon={Monitor} />
        <StatCard title="Offline Assignments" value={counts.offline} icon={FileBox} />
      </div>

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by student name or assignment..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              className="w-full sm:w-auto h-10 pl-10 pr-8 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id || cls.id} value={cls._id || cls.id}>
                  {cls.subjectName} ({cls.subjectCode})
                </option>
              ))}
            </select>
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              className="w-full sm:w-auto h-10 pl-10 pr-8 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Pending Evaluation</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Late">Late Submissions</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Assignment & Type</th>
              <th className="px-6 py-4">Submitted At</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 w-32">Marks</th>
              <th className="px-6 py-4 w-64">Feedback</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(({ assignment, submission, student }) => {
              const subId = (submission as any)._id || submission.id;
              const draft = draftGrades[subId] || {};
              const currentMarks = draft.marksObtained !== undefined ? draft.marksObtained : (submission.marksObtained || submission.marks || '');
              const currentFeedback = draft.feedback !== undefined ? draft.feedback : (submission.feedback || '');
              const currentStatus = draft.status !== undefined ? draft.status : submission.status;
              
              const gDriveLink = (submission as any).gDriveUrl || submission.fileUrl;
              
              const isEditing = editingRowIds.has(subId);
              const isEvaluated = currentStatus === 'Evaluated';
              const isRowEditable = !isEvaluated || isEditing;

              return (
                <tr key={subId} className={`border-b border-surface-border last:border-0 hover:bg-canvas/50 ${draftGrades.hasOwnProperty(subId) ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.rollNumber || student.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{assignment.title}</p>
                    {assignment.submissionType === 'Offline' ? (
                      <Badge variant="default" className="text-[10px] py-0.5 mt-1 bg-slate-100 text-slate-600 border-slate-200">
                        Physical Copy Submission
                      </Badge>
                    ) : gDriveLink ? (
                      <a href={gDriveLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center mt-1">
                        <FileText className="h-3 w-3 mr-1" /> View Work
                      </a>
                    ) : (
                      <Badge variant="default" className="text-[10px] py-0.5 mt-1">Pending Link</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {submission.status === 'Pending' ? '-' : new Date(submission.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {assignment.submissionType === 'Offline' ? (
                      <select
                        className="text-xs h-8 px-2 rounded-md border border-surface-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        value={currentStatus}
                        onChange={(e) => handleDraftChange(subId, 'status', e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Evaluated">Received</option>
                        <option value="Late">Late</option>
                      </select>
                    ) : (
                      <Badge 
                        variant={
                          currentStatus === 'Evaluated' ? 'success' : 
                          currentStatus === 'Submitted' ? 'info' : 
                          currentStatus === 'Late' ? 'warning' : 'default'
                        }
                      >
                        {currentStatus === 'Submitted' ? 'Pending Eval' : currentStatus}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      min="0"
                      max={assignment.maxMarks || (assignment as any).totalMarks}
                      disabled={!isRowEditable || currentStatus === 'Pending'}
                      className="w-20 h-8 px-2 text-sm rounded-md border border-surface-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      placeholder={`/ ${assignment.maxMarks || (assignment as any).totalMarks}`}
                      value={currentMarks}
                      onChange={(e) => handleDraftChange(subId, 'marksObtained', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text"
                      disabled={!isRowEditable || currentStatus === 'Pending'}
                      className="w-full h-8 px-2 text-sm rounded-md border border-surface-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      placeholder="Add feedback..."
                      value={currentFeedback}
                      onChange={(e) => handleDraftChange(subId, 'feedback', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isEvaluated && !isEditing ? (
                      <button 
                        onClick={() => setEditingRowIds(prev => new Set(prev).add(subId))}
                        className="inline-flex items-center text-primary hover:text-primary-hover font-medium text-sm px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        Re-evaluate
                      </button>
                    ) : (currentStatus !== 'Pending') ? (
                      <button 
                        onClick={() => saveSingleEvaluation(subId)}
                        disabled={savingRowId === subId || !draftGrades[subId]}
                        className="inline-flex items-center text-green-600 hover:text-green-700 font-medium text-sm px-3 py-1.5 rounded-md bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {savingRowId === subId ? 'Saving...' : 'Save'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredList.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No submissions found</h3>
            <p className="text-slate-500 text-sm mt-1">Check back later for student submissions.</p>
          </div>
        )}
      </div>

      <EvaluationDrawer 
        isOpen={selectedSubmission !== null} 
        onClose={() => {
          setSelectedSubmission(null);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        submission={selectedSubmission}
        onEvaluationSaved={handleEvaluationSaved}
      />

      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          // You could fetchEvaluations here, but a new assignment has no submissions yet.
          // Still, good practice if they navigate to /assignments afterwards
        }}
      />
    </div>
  );
}
