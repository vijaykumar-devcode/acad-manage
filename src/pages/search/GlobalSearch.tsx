import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeletons';
import { 
  Search, 
  BookOpen, 
  FileText, 
  ClipboardList, 
  GraduationCap,
  Bell,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

type Category = 'All' | 'Classes' | 'Assignments' | 'Quizzes' | 'Materials' | 'Notices';

export function GlobalSearch() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isFaculty = user?.role === 'Faculty';

  // Debounce the query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch search results from the role-aware backend controller
  useEffect(() => {
    const fetchSearchData = async () => {
      // Don't search for 1 character. 0 characters means we want a full directory listing.
      if (debouncedQuery.length === 1) {
        setClasses([]);
        setAssignments([]);
        setQuizzes([]);
        setMaterials([]);
        setNotices([]);
        return;
      }
      
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = res.data?.data || {};
        
        setClasses(data.classes || []);
        setAssignments(data.assignments || []);
        setQuizzes(data.quizzes || []);
        setMaterials(data.materials || []);
        setNotices(data.notices || []);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSearchData();
  }, [debouncedQuery]);

  const results = useMemo(() => {
    if (debouncedQuery.length === 1) return [];

    let rawResults: any[] = [];

    // Search Classes
    if (activeCategory === 'All' || activeCategory === 'Classes') {
      const matchedClasses = classes.map(c => ({
        id: c._id || c.id,
        title: c.name || c.subjectName,
        subtitle: `${c.code || c.subjectCode} • ${c.semester}`,
        type: 'Class',
        icon: GraduationCap,
        link: '/classes', // Classes route handles both
        color: 'text-blue-600 bg-blue-50 border-blue-100'
      }));
      rawResults = [...rawResults, ...matchedClasses];
    }

    // Search Assignments
    if (activeCategory === 'All' || activeCategory === 'Assignments') {
      const matchedAssignments = assignments.map(a => ({
        id: a._id || a.id,
        title: a.title,
        subtitle: `Due: ${new Date(a.dueDate).toLocaleDateString()}`,
        type: 'Assignment',
        icon: FileText,
        link: isFaculty ? '/assignments' : `/assignments`, // Students view assignments on portal
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
      }));
      rawResults = [...rawResults, ...matchedAssignments];
    }

    // Search Quizzes
    if (activeCategory === 'All' || activeCategory === 'Quizzes') {
      const matchedQuizzes = quizzes.map(qz => ({
        id: qz._id || qz.id,
        title: qz.title,
        subtitle: `Duration: ${qz.durationMinutes} mins`,
        type: 'Quiz',
        icon: ClipboardList,
        link: isFaculty ? '/quizzes' : `/quizzes/${qz._id || qz.id}/take`, // Direct routing
        color: 'text-amber-600 bg-amber-50 border-amber-100'
      }));
      rawResults = [...rawResults, ...matchedQuizzes];
    }

    // Search Materials
    if (activeCategory === 'All' || activeCategory === 'Materials') {
      const matchedMaterials = materials.map(m => ({
        id: m._id || m.id,
        title: m.title,
        subtitle: `${m.fileType || 'Doc'}`,
        type: 'Material',
        icon: BookOpen,
        link: '/study-materials',
        color: 'text-purple-600 bg-purple-50 border-purple-100'
      }));
      rawResults = [...rawResults, ...matchedMaterials];
    }

    // Search Notices
    if (activeCategory === 'All' || activeCategory === 'Notices') {
      const matchedNotices = notices.map(n => ({
        id: n._id || n.id,
        title: n.title,
        subtitle: `Posted: ${new Date(n.createdAt).toLocaleDateString()}${n.classId?.subjectCode ? ` • ${n.classId.subjectCode}` : ''}`,
        type: 'Notice',
        icon: Bell,
        link: n.classId ? `/classes/${n.classId._id || n.classId.id || n.classId}` : '/dashboard',
        color: 'text-rose-600 bg-rose-50 border-rose-100'
      }));
      rawResults = [...rawResults, ...matchedNotices];
    }

    return rawResults;
  }, [debouncedQuery, activeCategory, classes, assignments, quizzes, materials, notices, isFaculty]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Global Search</h1>
        <p className="text-slate-500">Find classes, assignments, quizzes, materials, and notices instantly.</p>
      </div>

      {/* Main Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-primary transition-transform group-focus-within:scale-110" />
        </div>
        <label htmlFor="global-search" className="sr-only">Search</label>
        <input
          id="global-search"
          name="global-search"
          type="text"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing to search..."
          className="w-full h-16 pl-14 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-lg shadow-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['All', 'Classes', 'Assignments', 'Quizzes', 'Materials', 'Notices'] as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
              activeCategory === cat 
                ? "bg-primary text-white border-primary" 
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : debouncedQuery.length === 1 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Enter at least 2 characters to search</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-900 font-medium text-lg">No results found {query ? `for "${query}"` : 'in this category'}</p>
            <p className="text-slate-500 mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 text-sm font-medium text-slate-500 flex justify-between">
              <span>Showing {results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {results.map((result, idx) => {
                const Icon = result.icon;
                return (
                  <li key={`${result.id}-${idx}`}>
                    <Link 
                      to={result.link}
                      className="flex items-center p-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center border shrink-0", result.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                          {result.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="default" className="text-[10px] py-0 px-1.5">{result.type}</Badge>
                          <span className="text-xs text-slate-500">{result.subtitle}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
