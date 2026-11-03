import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { SkeletonNotice } from '../../components/ui/Skeletons';
import { Bell, Plus, Trash2, GraduationCap, Calendar, User as UserIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { CreateNoticeModal } from '../../components/notices/CreateNoticeModal';

export function NoticesPortal() {
  const { user } = useAuthStore();
  const isFaculty = user?.role === 'Faculty';
  
  const [notices, setNotices] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchNotices = async () => {
    try {
      const endpoint = isFaculty ? '/notices' : '/notices/student';
      const res = await api.get(endpoint);
      setNotices(res.data.data);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    }
  };

  const fetchClasses = async () => {
    if (!isFaculty) return;
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchNotices(), fetchClasses()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      setNotices(notices.filter(n => n._id !== id));
    } catch (error) {
      console.error('Failed to delete notice:', error);
      alert('Failed to delete notice');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center border border-rose-200">
            <Bell className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Class Notices</h1>
            <p className="text-slate-500 font-medium">Important announcements and updates</p>
          </div>
        </div>
        {isFaculty && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Notice
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <SkeletonNotice key={i} />)}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Bell className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-900 font-medium text-lg">No notices available</p>
          <p className="text-slate-500">
            {isFaculty ? "You haven't published any notices yet." : "There are no announcements for your classes."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {notices.map((notice) => (
            <div key={notice._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
              {isFaculty && (
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(notice._id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 mt-1">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{notice.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        {notice.createdBy?.name || 'Faculty'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(notice.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {notice.classId && (
                        <Badge variant="default" className="flex items-center gap-1 bg-slate-50 text-slate-700">
                          <GraduationCap className="h-3 w-3" />
                          {notice.classId.subjectCode} - Sem {notice.classId.semester}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="prose prose-slate prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {notice.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFaculty && (
        <CreateNoticeModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={fetchNotices}
          classes={classes}
        />
      )}
    </div>
  );
}
