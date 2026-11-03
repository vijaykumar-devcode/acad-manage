import { useState, useEffect } from 'react';
import { SlideDrawer } from '../ui/SlideDrawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Assignment, Submission } from '../../types';
import api from '../../services/api';
import { 
  FileText, 

  UploadCloud, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';


interface AssignmentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  submission: Submission | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onSuccess?: () => void;
}

export function AssignmentDetailsDrawer({ isOpen, onClose, assignment, submission, onEdit, onDelete, onSuccess }: AssignmentDetailsDrawerProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [cls, setCls] = useState<any>(null);

  useEffect(() => {
    if (assignment?.classId) {
      api.get(`/classes/${assignment.classId}`).then(res => setCls(res.data)).catch(() => setCls({ code: 'N/A', name: 'Unknown' }));
    }
  }, [assignment]);

  if (!assignment) return null;

  const isPastDue = new Date(assignment.dueDate) < new Date();
  
  const status = submission?.status || (isPastDue ? 'Late' : 'Pending');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignment.submissionType === 'Online' && !driveUrl) return;

    setIsSubmitting(true);
    try {
      const payload = {
        assignmentId: (assignment as any)._id || assignment.id,
        gDriveUrl: driveUrl,
      };
      await api.post('/assignments/submit', payload);
      toast.success("Assignment submitted successfully!");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SlideDrawer isOpen={isOpen} onClose={onClose} title="Assignment Details" width="max-w-xl">
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-start mb-2">
            <Badge variant="info">{cls?.code}</Badge>
            <Badge 
              variant={
                status === 'Evaluated' ? 'success' : 
                status === 'Submitted' ? 'info' : 
                status === 'Late' ? 'error' : 'warning'
              }
            >
              {status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{assignment.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{cls?.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Due Date</p>
            <p className="font-medium text-slate-900">{new Date(assignment.dueDate).toLocaleString()}</p>
          </div>
          <div className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Max Marks</p>
            <p className="font-medium text-slate-900">{assignment.maxMarks || (assignment as any).totalMarks || 'N/A'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Description</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{assignment.description}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Instructions</h3>
          {assignment.instructions ? (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
              <p className="text-sm text-orange-800 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{assignment.instructions}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No specific instructions provided for this assignment.</p>
          )}
        </div>

        <hr className="border-surface-border" />

        {user?.role === 'Faculty' ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Faculty Actions</h3>
            <div className="flex gap-3">
              <Button onClick={() => { onClose(); onEdit?.(); }} variant="secondary" className="flex-1">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Assignment
              </Button>
              <Button onClick={() => { onClose(); onDelete?.(); }} variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Assignment
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Submission</h3>
            
            {submission?.status === 'Evaluated' ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <h4 className="font-bold text-green-900 text-lg mb-1">Evaluated</h4>
                <p className="text-green-700 text-sm mb-4">You received {submission.marks} out of {assignment.maxMarks || (assignment as any).totalMarks || 'N/A'} marks.</p>
                
                {submission.feedback && (
                  <div className="text-left bg-white/60 p-4 rounded-md border border-green-200/50 mt-4">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Feedback</p>
                    <p className="text-sm text-green-900">{submission.feedback}</p>
                  </div>
                )}
              </div>
            ) : submission?.status === 'Submitted' ? (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
                <CheckCircle2 className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                <h4 className="font-bold text-blue-900 text-lg mb-1">Successfully Submitted</h4>
                <p className="text-blue-700 text-sm">Your assignment has been sent to faculty for evaluation.</p>
                <p className="text-xs text-blue-600 mt-2">Submitted on {new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
            ) : isPastDue ? (
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <h4 className="font-bold text-red-900 text-lg mb-1">Deadline Passed</h4>
                <p className="text-red-700 text-sm">Submissions closed on {new Date(assignment.dueDate).toLocaleString()}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {assignment.submissionType === 'Online' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">Google Drive Link to Your Work</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://drive.google.com/..." 
                      className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Ensure the file is set to "Anyone with the link".</p>
                  </div>
                ) : assignment.submissionType === 'PDF' ? (
                  <div className="bg-canvas-alt border border-surface-border border-dashed p-6 rounded-lg text-center">
                    <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">PDF Upload Required</p>
                    <p className="text-xs text-slate-500 mt-1">Please provide the Google Drive link to your PDF.</p>
                    <input 
                      type="url" 
                      required
                      placeholder="https://drive.google.com/..." 
                      className="w-full h-10 px-3 mt-4 rounded-lg border border-surface-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg text-center">
                    <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-orange-800">Offline Submission</p>
                    <p className="text-xs text-orange-700 mt-1">Please hand in your physical assignment directly to your faculty in class. Submission status will be updated by your faculty.</p>
                  </div>
                )}

                {assignment.submissionType !== 'Offline' && (
                  <Button type="submit" className="w-full" isLoading={isSubmitting}>
                    Submit Assignment
                  </Button>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}
