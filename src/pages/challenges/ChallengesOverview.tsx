import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChallenges, useCreateChallenge, useUpdateChallenge, useResetChallenge } from '../../hooks/queries/useChallenges';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Trophy, Search, ChevronLeft, ChevronRight, Plus, Activity, Clock, CheckCircle, Pencil, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { SkeletonCard } from '../../components/ui/Skeletons';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export function ChallengesOverview() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Active' | 'Ended' | 'Draft' | 'Published'>('Published');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isStudent = user?.role === 'Student';

  // Filters for the query based on tabs
  const filters = useMemo(() => {
    const f: Record<string, any> = {};
    if (isStudent) {
      if (activeTab === 'Upcoming') f.status = 'Upcoming';
      if (activeTab === 'Active') f.status = 'Active';
      if (activeTab === 'Ended') f.status = 'Ended';
    } else {
      if (activeTab === 'Draft') f.publicationStatus = 'Draft';
      if (activeTab === 'Published') f.publicationStatus = 'Published';
    }
    return f;
  }, [activeTab, isStudent]);

  const { data, isLoading, error } = useChallenges(page, 10, filters);

  const filteredChallenges = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data?.data, searchQuery]);

  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge();
  const resetMutation = useResetChallenge();

  const [createData, setCreateData] = useState({
    title: '',
    platform: 'codeforces',
    externalContestId: '',
    externalUrl: '',
    startTime: '',
    endTime: '',
    classId: '',
  });
  const [availableClasses, setAvailableClasses] = useState<{ _id: string; subjectName: string; subjectCode: string }[]>([]);

  // Edit modal state
  const [editingChallenge, setEditingChallenge] = useState<any | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    externalContestId: '',
    externalUrl: '',
    startTime: '',
    endTime: '',
  });

  // Helper: format a Date/ISO string to datetime-local input value
  const toDatetimeLocal = (val: string | Date) => {
    const d = new Date(val);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditModal = (challenge: any, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    setEditingChallenge(challenge);
    setEditData({
      title: challenge.title,
      externalContestId: challenge.externalContestId || '',
      externalUrl: challenge.externalUrl || '',
      startTime: challenge.startTime ? toDatetimeLocal(challenge.startTime) : '',
      endTime: challenge.endTime ? toDatetimeLocal(challenge.endTime) : '',
    });
  };

  const hasParticipants = editingChallenge && (editingChallenge.participantCount ?? 0) > 0;

  // Fetch the faculty's classes when the create modal opens
  useEffect(() => {
    if (isCreateModalOpen && !isStudent) {
      api.get('/classes')
        .then(res => setAvailableClasses(res.data.data || []))
        .catch(() => setAvailableClasses([]));
    }
  }, [isCreateModalOpen, isStudent]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...createData };
      if (!payload.classId) delete payload.classId;
      const result = await createMutation.mutateAsync(payload);
      toast.success('Challenge created successfully');
      setIsCreateModalOpen(false);
      setCreateData({ title: '', platform: 'codeforces', externalContestId: '', externalUrl: '', startTime: '', endTime: '', classId: '' });
      navigate(`/challenges/${result._id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create challenge');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    try {
      // Only send mutable fields — backend will reject locked ones if participants exist
      const payload: Record<string, any> = { title: editData.title, externalUrl: editData.externalUrl };
      if (!hasParticipants) {
        payload.externalContestId = editData.externalContestId;
        payload.startTime = editData.startTime;
        payload.endTime = editData.endTime;
      }
      await updateMutation.mutateAsync({ id: editingChallenge._id, data: payload });
      toast.success('Challenge updated successfully');
      setEditingChallenge(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update challenge');
    }
  };

  const handleReset = async () => {
    if (!editingChallenge) return;
    const confirmed = window.confirm(
      `This will permanently delete all participant registrations and leaderboard results for "${editingChallenge.title}". This cannot be undone. Proceed?`
    );
    if (!confirmed) return;
    try {
      await resetMutation.mutateAsync(editingChallenge._id);
      toast.success('Challenge reset — all result data cleared. Ready for reuse.');
      setEditingChallenge(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset challenge');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-2">Error loading challenges</h2>
        <p>{(error as any).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coding Challenges</h1>
          <p className="text-slate-500 text-sm mt-1">Compete in algorithmic challenges and improve your skills.</p>
        </div>
        <div>
          {!isStudent && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Challenges" value={data?.total || 0} icon={Trophy} />
        <StatCard title={isStudent ? "Active Now" : "Published"} value="-" icon={Activity} />
        <StatCard title="Ended" value="-" icon={CheckCircle} />
      </div>

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search challenges by title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div className="flex bg-canvas-alt rounded-lg p-1 border border-surface-border">
            {isStudent ? (
              <>
                <button onClick={() => { setActiveTab('Upcoming'); setPage(1); }} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", activeTab === 'Upcoming' ? "bg-surface shadow-sm text-primary font-medium" : "text-slate-600 hover:text-slate-900")}>Upcoming</button>
                <button onClick={() => { setActiveTab('Active'); setPage(1); }} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", activeTab === 'Active' ? "bg-surface shadow-sm text-primary font-medium" : "text-slate-600 hover:text-slate-900")}>Active</button>
                <button onClick={() => { setActiveTab('Ended'); setPage(1); }} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", activeTab === 'Ended' ? "bg-surface shadow-sm text-primary font-medium" : "text-slate-600 hover:text-slate-900")}>Ended</button>
              </>
            ) : (
              <>
                <button onClick={() => { setActiveTab('Published'); setPage(1); }} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", activeTab === 'Published' ? "bg-surface shadow-sm text-primary font-medium" : "text-slate-600 hover:text-slate-900")}>Published</button>
                <button onClick={() => { setActiveTab('Draft'); setPage(1); }} className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", activeTab === 'Draft' ? "bg-surface shadow-sm text-primary font-medium" : "text-slate-600 hover:text-slate-900")}>Drafts</button>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-xl border border-surface-border border-dashed">
          <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No challenges found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or tab filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredChallenges.map(challenge => (
            <div key={challenge._id} className="relative group">
              <Link
                to={`/challenges/${challenge._id}`}
                className="bg-surface rounded-xl border border-surface-border overflow-hidden hover:border-primary hover:shadow-md transition-all flex flex-col h-full relative block"
              >
                <div className={cn("absolute top-0 left-0 w-full h-1",
                  challenge.status === 'Active' ? 'bg-green-500' :
                  challenge.status === 'Upcoming' ? 'bg-yellow-500' : 'bg-slate-300'
                )}></div>

                <div className="p-6 flex-1 flex flex-col mt-2">
                  <div className="flex justify-between items-start mb-4">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md",
                      challenge.status === 'Active' ? 'bg-green-100 text-green-700' :
                      challenge.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                    )}>
                      {challenge.status}
                    </span>
                    {!isStudent && challenge.publicationStatus === 'Draft' && (
                      <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Draft</span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {challenge.title}
                  </h3>

                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center text-sm text-slate-600 gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {new Date(challenge.startTime).toLocaleString()}
                    </div>
                    <div className="flex items-center text-sm text-slate-600 gap-2">
                      <Trophy className="w-4 h-4 text-slate-400" />
                      Platform: <span className="capitalize">{challenge.platform}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Edit button — Faculty/Admin only, floats over the card */}
              {!isStudent && (
                <button
                  onClick={(e) => openEditModal(challenge, e)}
                  title="Edit challenge"
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-500 hover:text-primary hover:border-primary hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <span className="text-sm font-medium text-slate-600">
            Page {page} of {data.pages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editingChallenge} onClose={() => setEditingChallenge(null)} title="Edit Challenge">
        {editingChallenge && (
          <form onSubmit={handleEdit} className="space-y-4">
            {/* Locked fields notice */}
            {hasParticipants && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <span>This challenge has <strong>{editingChallenge.participantCount} participant(s)</strong>. Platform, Contest ID, and timings are locked. Use <strong>Reset Results</strong> below to unlock them for reuse.</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input required type="text" value={editData.title} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">External Contest URL</label>
              <input required type="url" value={editData.externalUrl} onChange={e => setEditData(p => ({ ...p, externalUrl: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className={cn("block text-sm font-medium mb-1", hasParticipants ? 'text-slate-400' : 'text-slate-700')}>
                External Contest ID {hasParticipants && <span className="text-xs font-normal">(locked)</span>}
              </label>
              <input
                type="text"
                value={editData.externalContestId}
                onChange={e => setEditData(p => ({ ...p, externalContestId: e.target.value }))}
                disabled={hasParticipants}
                className={cn("w-full h-10 px-3 rounded-lg border border-surface-border text-sm outline-none", hasParticipants ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-canvas-alt focus:ring-2 focus:ring-primary')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1", hasParticipants ? 'text-slate-400' : 'text-slate-700')}>
                  Start Time {hasParticipants && <span className="text-xs font-normal">(locked)</span>}
                </label>
                <input
                  type="datetime-local"
                  value={editData.startTime}
                  onChange={e => setEditData(p => ({ ...p, startTime: e.target.value }))}
                  disabled={hasParticipants}
                  className={cn("w-full h-10 px-3 rounded-lg border border-surface-border text-sm outline-none", hasParticipants ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-canvas-alt focus:ring-2 focus:ring-primary')}
                />
              </div>
              <div>
                <label className={cn("block text-sm font-medium mb-1", hasParticipants ? 'text-slate-400' : 'text-slate-700')}>
                  End Time {hasParticipants && <span className="text-xs font-normal">(locked)</span>}
                </label>
                <input
                  type="datetime-local"
                  value={editData.endTime}
                  onChange={e => setEditData(p => ({ ...p, endTime: e.target.value }))}
                  disabled={hasParticipants}
                  className={cn("w-full h-10 px-3 rounded-lg border border-surface-border text-sm outline-none", hasParticipants ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-canvas-alt focus:ring-2 focus:ring-primary')}
                />
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t border-surface-border">
              {/* Danger zone: Reset Results */}
              <button
                type="button"
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 px-3 py-2 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {resetMutation.isPending ? 'Resetting…' : 'Reset Results'}
              </button>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setEditingChallenge(null)}>Cancel</Button>
                <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Challenge">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required type="text" value={createData.title} onChange={e => setCreateData(prev => ({...prev, title: e.target.value}))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
            <select value={createData.platform} onChange={e => setCreateData(prev => ({...prev, platform: e.target.value}))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="codeforces">Codeforces</option>
              <option value="atcoder">AtCoder</option>
              <option value="codechef">CodeChef</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">External Contest ID</label>
            <input required type="text" value={createData.externalContestId} onChange={e => setCreateData(prev => ({...prev, externalContestId: e.target.value}))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. 1950" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">External Contest URL</label>
            <input required type="url" value={createData.externalUrl} onChange={e => setCreateData(prev => ({...prev, externalUrl: e.target.value}))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="https://codeforces.com/contests/1950" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input required type="datetime-local" value={createData.startTime} onChange={e => setCreateData(prev => ({...prev, startTime: e.target.value}))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input required type="datetime-local" value={createData.endTime} onChange={e => setCreateData(prev => ({...prev, endTime: e.target.value}))} className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class <span className="text-slate-400 font-normal">(optional — leave as Global for all students)</span></label>
            <select
              value={createData.classId}
              onChange={e => setCreateData(prev => ({ ...prev, classId: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">— None / Global (all students) —</option>
              {availableClasses.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {cls.subjectName} ({cls.subjectCode})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
