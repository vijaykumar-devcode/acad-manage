import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { Users, BookOpen, FileText, ClipboardList, Shield, Trash2, Plus, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { AddUserModal } from './AddUserModal';
import { GradeScaleSettings } from './GradeScaleSettings';

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'support' | 'gradescale' | 'approvals'>('users');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    students: 0,
    faculty: 0,
    classes: 0,
    assignments: 0,
    quizzes: 0
  });

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Classes
  const [classes, setClasses] = useState<any[]>([]);

  // Support Tickets
  const [tickets, setTickets] = useState<any[]>([]);

  // Pending Faculty Approvals
  const [pendingFaculty, setPendingFaculty] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchClasses();
    fetchTickets();
    fetchPendingFaculty();
  }, [roleFilter]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (error) {
      toast.error('Failed to load stats');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get(`/admin/users?role=${roleFilter}&search=${search}&limit=50`);
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(Array.isArray(data.data || data) ? (data.data || data) : []);
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/support');
      setTickets(data.data || []);
    } catch (error) {
      toast.error('Failed to load support tickets');
    }
  };

  const fetchPendingFaculty = async () => {
    try {
      const { data } = await api.get('/admin/faculty/pending');
      setPendingFaculty(data.data || []);
    } catch {
      // Non-critical, silently ignore
    }
  };

  const handleApproveFaculty = async (id: string, name: string) => {
    try {
      await api.patch(`/admin/users/${id}/approve`);
      toast.success(`${name}'s Faculty account has been approved.`);
      fetchPendingFaculty();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve account.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleResolveTicket = async (id: string) => {
    try {
      await api.put(`/support/${id}/status`, { status: 'resolved' });
      toast.success('Ticket marked as resolved');
      fetchTickets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resolve ticket');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        await api.delete(`/support/${id}`);
        toast.success('Ticket deleted successfully');
        fetchTickets();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete ticket');
      }
    }
  };

  // Group classes by department
  const classesByDept = classes.reduce((acc: any, cls: any) => {
    const dept = cls.department || 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(cls);
    return acc;
  }, {});

  if (user?.role !== 'Admin' && user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Unauthorized Access</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Console</h1>
          <p className="text-slate-500 text-sm">Manage platform users, content, and metrics.</p>
        </div>
      </div>

      {/* Stats Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Students" value={stats.students} icon={Users} />
        <StatCard title="Faculty" value={stats.faculty} icon={Users} />
        <StatCard title="Classes" value={stats.classes} icon={BookOpen} />
        <StatCard title="Assignments" value={stats.assignments} icon={FileText} />
        <StatCard title="Quizzes" value={stats.quizzes} icon={ClipboardList} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'users' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'classes' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Department &amp; Class Overview
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'support' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Support Requests
        </button>
        <button
          onClick={() => setActiveTab('gradescale')}
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'gradescale' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Grade Scale
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-2 px-1 text-sm font-medium flex items-center gap-1.5 ${activeTab === 'approvals' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Pending Approvals
          {pendingFaculty.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingFaculty.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-surface rounded-xl border border-surface-border p-6">
        {activeTab === 'users' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, roll..." 
                  className="px-3 py-2 border border-surface-border rounded-lg text-sm flex-1 min-w-[200px]"
                />
                <Button type="submit" variant="outline">Search</Button>
              </form>
              <div className="flex gap-2">
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-surface-border rounded-lg text-sm bg-white"
                >
                  <option value="All">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
                <Button onClick={() => setIsAddUserOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-surface-border hover:bg-canvas/50">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          u.role.toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'Faculty' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.department || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDeleteUser(u._id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'classes' ? (
          <div className="space-y-6">
            {Object.keys(classesByDept).map(dept => (
              <div key={dept} className="bg-canvas-alt p-4 rounded-lg border border-surface-border">
                <h3 className="font-bold text-lg mb-3 text-slate-800">{dept} <span className="text-sm font-normal text-slate-500">({classesByDept[dept].length} classes)</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classesByDept[dept].map((cls: any) => (
                    <div key={cls._id} className="bg-white p-3 rounded-md border border-surface-border shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{cls.subjectName}</p>
                        <p className="text-xs text-slate-500">{cls.subjectCode} • Sem {cls.semester}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(classesByDept).length === 0 && (
              <p className="text-center text-slate-500 py-8">No active classes available.</p>
            )}
          </div>
        ) : activeTab === 'support' ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t._id} className="border-b border-surface-border hover:bg-canvas/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{t.userId?.email}</p>
                        <span className="text-[10px] uppercase text-slate-400 font-semibold">{t.userId?.role}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{t.category}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={t.description}>{t.description}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          t.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          t.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {t.status !== 'resolved' && (
                          <button 
                            onClick={() => handleResolveTicket(t._id)}
                            className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 transition-colors mr-2"
                            title="Mark as Resolved"
                          >
                            <span className="text-xs font-semibold">Resolve</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteTicket(t._id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Ticket"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No support requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'gradescale' ? (
          <GradeScaleSettings />
        ) : activeTab === 'approvals' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Pending Faculty Approvals</h3>
                <p className="text-sm text-slate-500 mt-0.5">Review and approve newly registered Faculty accounts.</p>
              </div>
            </div>
            {pendingFaculty.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                <p className="text-slate-600 font-medium">All caught up!</p>
                <p className="text-slate-400 text-sm mt-1">No Faculty accounts are pending approval.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingFaculty.map((u: any) => (
                  <div key={u._id} className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-amber-700 font-bold text-sm">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{u.department} &bull; Registered {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full font-medium">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                      <button
                        onClick={() => handleApproveFaculty(u._id, u.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {isAddUserOpen && (
        <AddUserModal onClose={() => setIsAddUserOpen(false)} onSuccess={fetchUsers} />
      )}
    </div>
  );
}
