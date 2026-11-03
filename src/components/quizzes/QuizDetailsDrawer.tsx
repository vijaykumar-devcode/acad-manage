import { SlideDrawer } from '../ui/SlideDrawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Quiz } from '../../types';
import api from '../../services/api';
import { 
  Trash2, 
  Users,
  Eye,
  AlertTriangle,
  Calendar,
  Save,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface QuizDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz | null;
  onSuccess?: () => void;
}

export function QuizDetailsDrawer({ isOpen, onClose, quiz, onSuccess }: QuizDetailsDrawerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  
  const [scheduleData, setScheduleData] = useState({
    startTime: '',
    endTime: '',
    durationMinutes: 0
  });

  const [cls, setCls] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (quiz) {
      const formatLocal = (d: string | Date) => {
        const dt = new Date(d);
        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
        return dt.toISOString().slice(0, 16);
      };
      setScheduleData({
        startTime: formatLocal(quiz.startTime),
        endTime: formatLocal(quiz.endTime),
        durationMinutes: quiz.durationMinutes
      });
    }
  }, [quiz]);

  useEffect(() => {
    if (isOpen && quiz) {
      api.get(`/classes/${quiz.classId}`).then(res => setCls(res.data?.data || res.data)).catch(() => {});
      api.get(`/quizzes/${(quiz as any)._id || quiz.id}/attempts`).then(res => setAttempts(res.data?.data || res.data || [])).catch(() => {});
      api.get('/users').then(res => setUsers(res.data?.data || res.data || [])).catch(() => {});
    }
  }, [isOpen, quiz]);

  const handleDelete = async () => {
    if (!quiz) return;
    try {
      setIsDeleting(true);
      await api.delete(`/quizzes/${(quiz as any)._id || quiz.id}`);
      toast.success("Quiz deleted successfully!");
      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete quiz");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReschedule = async () => {
    if (!quiz) return;
    try {
      setIsSavingSchedule(true);
      await api.patch(`/quizzes/${(quiz as any)._id || quiz.id}/reschedule`, {
        startTime: new Date(scheduleData.startTime).toISOString(),
        endTime: new Date(scheduleData.endTime).toISOString(),
        durationMinutes: Number(scheduleData.durationMinutes)
      });
      toast.success("Quiz rescheduled successfully!");
      setIsRescheduling(false);
      onSuccess?.();
      onClose(); // Optional: Close the drawer entirely, or we can just exit edit mode and refresh. Let's just onClose and onSuccess for a clean UX.
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reschedule quiz");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  if (!quiz) return null;

  return (
    <SlideDrawer isOpen={isOpen} onClose={() => { onClose(); setShowDeleteConfirm(false); setIsDeleting(false); setIsRescheduling(false); }} title="Quiz Details" width="max-w-2xl">
      <div className="space-y-6">
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="info">{cls?.code}</Badge>
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
            <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{quiz.totalMarks}</p>
            <p className="text-xs text-slate-500 font-medium">Total Marks</p>
          </div>
        </div>

        {isRescheduling ? (
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-primary-900">Reschedule Quiz</h3>
              <button onClick={() => setIsRescheduling(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <input 
                  type="datetime-local" 
                  value={scheduleData.startTime}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-surface-border text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <input 
                  type="datetime-local" 
                  value={scheduleData.endTime}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-surface-border text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={scheduleData.durationMinutes}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                  className="w-full h-10 px-3 rounded-lg border border-surface-border text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleReschedule} isLoading={isSavingSchedule} className="bg-primary hover:bg-primary-hover text-white">
                <Save className="h-4 w-4 mr-2" /> Save Schedule
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
              <p className="text-xs text-slate-500 mb-1">Duration</p>
              <p className="font-medium text-slate-900">{quiz.durationMinutes} Minutes</p>
            </div>
            <div className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
              <p className="text-xs text-slate-500 mb-1">Participants</p>
              <p className="font-medium text-slate-900 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                {attempts.length} / {cls?.studentIds?.length || 0}
              </p>
            </div>
            <div className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
              <p className="text-xs text-slate-500 mb-1">Start Time</p>
              <p className="font-medium text-slate-900">{new Date(quiz.startTime).toLocaleString()}</p>
            </div>
            <div className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
              <p className="text-xs text-slate-500 mb-1">End Time</p>
              <p className="font-medium text-slate-900">{new Date(quiz.endTime).toLocaleString()}</p>
            </div>
          </div>
        )}

        <hr className="border-surface-border" />

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quiz Attempts</h3>
          
          <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  attempts.map(attempt => {
                    const student = attempt.studentId?.name ? attempt.studentId : users.find(u => (u._id || u.id) === attempt.studentId);
                    return (
                      <tr key={attempt._id || attempt.id} className="border-b border-surface-border last:border-0 hover:bg-canvas/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{student?.name}</p>
                          <p className="text-xs text-slate-500">{student?.rollNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={attempt.status === 'Completed' ? 'success' : 'warning'}>
                            {attempt.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {attempt.status === 'Completed' ? `${attempt.score} / ${quiz.totalMarks}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-slate-400 hover:text-primary transition-colors p-1">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-8 mt-auto">
          {showDeleteConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Are you sure you want to delete this quiz?</h4>
                  <p className="text-sm text-red-700 mt-1 mb-3">This action cannot be undone and all attempts will be lost.</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" isLoading={isDeleting} onClick={handleDelete}>Yes, Delete</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                className="text-slate-600 hover:bg-slate-100 border-slate-200 flex-1"
                onClick={() => setIsRescheduling(true)}
              >
                <Calendar className="h-4 w-4 mr-2" /> Reschedule Quiz
              </Button>
              <Button 
                variant="secondary" 
                className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 flex-1"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Quiz
              </Button>
            </div>
          )}
        </div>

      </div>
    </SlideDrawer>
  );
}
