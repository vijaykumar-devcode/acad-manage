import { useState, useEffect } from 'react';
import { SlideDrawer } from '../ui/SlideDrawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Assignment, Submission } from '../../types';
import api from '../../services/api';
import { 
  FileText, 
  ExternalLink,
  UserCircle2
} from 'lucide-react';

interface EvaluationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  submission: Submission | null;
  onEvaluationSaved: () => void;
}

export function EvaluationDrawer({ isOpen, onClose, assignment, submission, onEvaluationSaved }: EvaluationDrawerProps) {
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('Evaluated');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [student, setStudent] = useState<any>(null);
  const [cls, setCls] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (submission?.studentId) {
        try {
          const res = await api.get(`/users/${submission.studentId}`);
          setStudent(res.data);
        } catch (e) {
          setStudent({ name: 'Unknown Student', rollNumber: 'N/A' });
        }
      }
      if (assignment?.classId) {
        try {
          const res = await api.get(`/classes/${assignment.classId}`);
          setCls(res.data);
        } catch (e) {
          setCls({ code: 'N/A' });
        }
      }
    };
    if (isOpen) fetchData();
  }, [submission, assignment, isOpen]);

  useEffect(() => {
    if (submission) {
      setMarks(submission.marksObtained?.toString() || submission.marks?.toString() || '');
      setFeedback(submission.feedback || '');
      setStatus(submission.status || (assignment?.submissionType === 'Offline' ? 'Pending' : 'Evaluated'));
    }
  }, [submission, assignment]);

  if (!assignment || !submission) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const marksNum = Number(marks);
    const maxM = assignment.maxMarks || (assignment as any).totalMarks;
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxM) {
      setError(`Marks must be a valid number between 0 and ${maxM}`);
      return;
    }

    setIsSaving(true);
    try {
      if (assignment.submissionType === 'Offline') {
        const payload = {
          studentId: student._id || student.id || submission.studentId,
          status: status,
          marksObtained: status === 'Pending' ? undefined : marksNum,
          feedback: feedback
        };
        await api.post(`/assignments/${(assignment as any)._id || assignment.id}/offline-submit`, payload);
      } else {
        await api.put(`/assignments/${(submission as any)._id || submission.id}/evaluate`, {
          marksObtained: marksNum,
          feedback: feedback
        });
      }
      onEvaluationSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save evaluation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SlideDrawer isOpen={isOpen} onClose={onClose} title="Evaluate Submission" width="max-w-md">
      <div className="space-y-6">
        
        <div className="flex items-center gap-3 p-3 bg-canvas-alt rounded-lg border border-surface-border">
          {student?.avatarUrl ? (
            <img src={student.avatarUrl} alt={student?.name} className="h-10 w-10 rounded-full bg-surface" />
          ) : (
            <UserCircle2 className="h-10 w-10 text-slate-400" />
          )}
          <div>
            <p className="font-semibold text-slate-900">{student?.name || 'Loading...'}</p>
            <p className="text-xs text-slate-500">{student?.rollNumber || ''} {cls?.code ? `• ${cls.code}` : ''}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignment Details</h3>
          <p className="font-medium text-slate-900">{assignment.title}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="default">{assignment.submissionType}</Badge>
            <span className="text-xs text-slate-500 font-medium">Max Marks: {assignment.maxMarks || (assignment as any).totalMarks}</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Student Work</h3>
          {assignment.submissionType === 'Online' && submission.fileUrl ? (
            <a 
              href={submission.fileUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 p-3 border border-surface-border rounded-lg bg-surface hover:border-primary hover:text-primary transition-colors text-sm font-medium text-slate-700"
            >
              <FileText className="h-4 w-4" />
              View Submission File <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          ) : (
            <div className="p-4 bg-canvas-alt rounded-lg border border-surface-border text-center">
              <p className="text-sm font-medium text-slate-700">Offline Submission</p>
              <p className="text-xs text-slate-500 mt-1">Evaluate based on physical copy.</p>
            </div>
          )}
        </div>

        <hr className="border-surface-border" />

        <form onSubmit={handleSave} className="space-y-4">
          {assignment.submissionType === 'Offline' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Submission Status</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Pending">Pending (Not Received)</option>
                <option value="Evaluated">Received & Evaluated</option>
                <option value="Late">Received Late</option>
              </select>
            </div>
          )}

          {status !== 'Pending' && (
            <Input
              label={`Marks Obtained (Max ${assignment.maxMarks || (assignment as any).totalMarks})`}
              type="number"
              step="0.5"
              min="0"
              max={assignment.maxMarks || (assignment as any).totalMarks}
              required
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              error={error}
            />
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Feedback (Optional)</label>
            <textarea
              rows={4}
              className="flex w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Provide constructive feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSaving}>
            Save Evaluation
          </Button>
        </form>
      </div>
    </SlideDrawer>
  );
}
