import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

import { SkeletonCard } from '../../components/ui/Skeletons';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Archive, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  ExternalLink,
  BookOpen,
  Calendar,
  Building2,
  FileText
} from 'lucide-react';
import { UploadPYQModal } from '../../components/pyq/UploadPYQModal';
import type { PYQ } from '../../types';

export function PYQPortal() {
  const { user } = useAuthStore();
  const isFaculty = user?.role === 'Faculty';
  const isAdmin = user?.role === 'Admin';
  
  const [pyqs, setPyqs] = useState<PYQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const fetchPYQs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pyq');
      setPyqs(res.data.data);
    } catch (error) {
      console.error('Failed to fetch PYQs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPYQs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this PYQ?')) return;
    try {
      await api.delete(`/pyq/${id}`);
      setPyqs(pyqs.filter(p => (p._id || p.id) !== id));
    } catch (error) {
      console.error('Failed to delete PYQ:', error);
      alert('Failed to delete PYQ');
    }
  };

  const filteredPYQs = useMemo(() => {
    return pyqs.filter(pyq => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        pyq.subjectName.toLowerCase().includes(q) || 
        pyq.subjectCode.toLowerCase().includes(q) ||
        (pyq.facultyId?.name || '').toLowerCase().includes(q) ||
        (pyq.description || '').toLowerCase().includes(q);
      
      const matchesDept = departmentFilter ? pyq.department === departmentFilter : true;
      const matchesSem = semesterFilter ? pyq.semester === semesterFilter : true;
      const matchesType = examTypeFilter ? pyq.examType === examTypeFilter : true;
      const matchesYear = yearFilter ? pyq.academicYear === yearFilter : true;

      return matchesSearch && matchesDept && matchesSem && matchesType && matchesYear;
    });
  }, [pyqs, searchQuery, departmentFilter, semesterFilter, examTypeFilter, yearFilter]);

  // Extract unique values for filter dropdowns
  const uniqueDepartments = Array.from(new Set(pyqs.map(p => p.department))).sort();
  const uniqueSemesters = Array.from(new Set(pyqs.map(p => p.semester))).sort();
  const uniqueYears = Array.from(new Set(pyqs.map(p => p.academicYear))).sort();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center border border-indigo-200">
            <Archive className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">PYQ Archive</h1>
            <p className="text-slate-500 font-medium">Browse and download Previous Year Question Papers</p>
          </div>
        </div>
        {isFaculty && (
          <Button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Upload PYQ
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search subjects, faculty, codes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 pl-10 pr-8 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="">All Depts</option>
              {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <select 
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="">All Semesters</option>
            {uniqueSemesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>
          <select 
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={examTypeFilter}
            onChange={(e) => setExamTypeFilter(e.target.value)}
            className="h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            <option value="">All Exam Types</option>
            <option value="Mid Semester">Mid Semester</option>
            <option value="End Semester">End Semester</option>
            <option value="Internal">Internal</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredPYQs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Archive className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-900 font-medium text-lg">No PYQs found</p>
          <p className="text-slate-500">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPYQs.map((pyq) => {
            const pyqId = pyq._id || pyq.id;
            const canDelete = isAdmin || (isFaculty && pyq.facultyId?._id === user?._id) || (isFaculty && pyq.facultyId === user?._id);
            return (
              <div key={pyqId} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative group">
                
                {canDelete && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(pyqId)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Delete PYQ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 pr-8">
                  <Badge variant="info" className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">
                    {pyq.subjectCode}
                  </Badge>
                  <Badge variant="default">{pyq.examType}</Badge>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{pyq.subjectName}</h3>
                
                <div className="space-y-2 mb-6 mt-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>{pyq.department} • Sem {pyq.semester}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{pyq.academicYear}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span>Uploaded by {pyq.facultyId?.name || 'Faculty'}</span>
                  </div>
                  {pyq.description && (
                    <div className="flex items-start gap-2 text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{pyq.description}</span>
                    </div>
                  )}
                </div>

                <a 
                  href={pyq.gDriveUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {pyq.fileType}
                </a>
              </div>
            );
          })}
        </div>
      )}

      {isFaculty && (
        <UploadPYQModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={fetchPYQs}
        />
      )}
    </div>
  );
}
