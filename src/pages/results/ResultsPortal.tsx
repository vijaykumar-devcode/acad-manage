import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Badge } from '../../components/ui/Badge';

import { SkeletonCard, SkeletonResultSheet } from '../../components/ui/Skeletons';
import { Button } from '../../components/ui/Button';
import { ResultTable } from '../../components/results/ResultTable';
import { exportToCSV } from '../../utils/exportUtils';
import { 
  FileText, 
  Printer, 
  CheckCircle2,  
  XCircle,
  Building,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function ResultsPortal() {
  const { user } = useAuthStore();
  // 'all' means show combined results
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const isFaculty = user?.role === 'Faculty';

  const [classes, setClasses] = useState<any[]>([]);
  // myFeedResults contains the combined actual result rows from the backend
  const [myFeedResults, setMyFeedResults] = useState<any[]>([]);
  // activeClassResultData is used when viewing a specific class
  const [activeClassResultData, setActiveClassResultData] = useState<any[]>([]);
  
  const [classInfo, setClassInfo] = useState<any>(null);
  const [sheetType, setSheetType] = useState<'mid-sem' | 'end-sem' | 'full'>('full');
  const [classPublishStatus, setClassPublishStatus] = useState({
    isPublished: false,
    isMidSemPublished: false,
    isEndSemPublished: false
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [collegeName, setCollegeName] = useState('ABC COLLEGE OF ENGINEERING');
  const [isEditingCollege, setIsEditingCollege] = useState(false);
  const [gradeRules, setGradeRules] = useState<any[]>([]);

  const fetchResultsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, fRes, gRes] = await Promise.all([
        api.get('/classes').catch(() => ({ data: { data: [] } })),
        api.get('/results/my-feed').catch(() => ({ data: { data: [] } })),
        api.get('/gradescale').catch(() => ({ data: { data: null } }))
      ]);

      const extract = (res: any) => {
        const d = res.data?.data || res.data;
        return Array.isArray(d) ? d : [];
      };

      setClasses(extract(cRes));
      setMyFeedResults(extract(fRes));
      if (gRes.data?.data?.rules) {
        setGradeRules(gRes.data.data.rules);
      }
    } catch (err) {
      setError('Failed to load results data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResultsData();
  }, []);

  // For faculty, relevant classes are those they teach.
  // For students, relevant classes are those where a result is published (found in myFeedResults).
  const relevantClasses = useMemo(() => {
    if (isFaculty) {
      return classes.filter(c => {
        const facId = c.facultyId?._id || c.facultyId;
        const matchesFac = facId === user?.id || facId === (user as any)?._id;
        const matchesSearch = c.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) || c.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFac && matchesSearch;
      });
    } else {
      const publishedClassIds = Array.from(new Set(myFeedResults.map(p => String(p.classId))));
      return classes.filter(c => {
        const isPub = publishedClassIds.includes(String(c.id || c._id));
        const matchesSearch = c.subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) || c.subjectCode?.toLowerCase().includes(searchQuery.toLowerCase());
        return isPub && matchesSearch;
      });
    }
  }, [isFaculty, user, classes, myFeedResults, searchQuery]);

  const activeClass = useMemo(() => {
    if (selectedClassId === 'all') return null;
    return classes.find(c => String(c.id || c._id) === selectedClassId) || null;
  }, [selectedClassId, classes]);

  useEffect(() => {
    if (selectedClassId === 'all' && relevantClasses.length > 0) {
      if (relevantClasses.length === 1) {
        setSelectedClassId(String(relevantClasses[0].id || relevantClasses[0]._id));
      }
    }
  }, [relevantClasses, selectedClassId]);

  useEffect(() => {
    if (activeClass) {
      setTableLoading(true);
      api.get(`/results/class/${activeClass.id || (activeClass as any)._id}`)
        .then(res => {
          setActiveClassResultData(res.data?.data || []);
          setClassPublishStatus({
            isPublished: res.data?.isPublished || false,
            isMidSemPublished: res.data?.isMidSemPublished || false,
            isEndSemPublished: res.data?.isEndSemPublished || false
          });
          setClassInfo(res.data?.classInfo || null);
        })
        .finally(() => setTableLoading(false));
    } else {
      setActiveClassResultData([]);
      setClassPublishStatus({ isPublished: false, isMidSemPublished: false, isEndSemPublished: false });
      setClassInfo(null);
    }
  }, [activeClass]);

  const handleTogglePublish = async () => {
    if (!selectedClassId || selectedClassId === 'all') return;
    try {
      const isStagePublished = 
        sheetType === 'mid-sem' ? classPublishStatus.isMidSemPublished :
        sheetType === 'end-sem' ? classPublishStatus.isEndSemPublished :
        classPublishStatus.isPublished;

      if (isStagePublished) {
        await api.delete(`/results/published/${selectedClassId}?stage=${sheetType}`);
        setMyFeedResults(prev => prev.map(r => r.classId === selectedClassId 
          ? { ...r, 
              isPublished: sheetType === 'full' ? false : r.isPublished,
              isMidSemPublished: sheetType === 'mid-sem' ? false : r.isMidSemPublished,
              isEndSemPublished: sheetType === 'end-sem' ? false : r.isEndSemPublished
            } 
          : r));
        setClassPublishStatus(prev => ({
          ...prev,
          isPublished: sheetType === 'full' ? false : prev.isPublished,
          isMidSemPublished: sheetType === 'mid-sem' ? false : prev.isMidSemPublished,
          isEndSemPublished: sheetType === 'end-sem' ? false : prev.isEndSemPublished
        }));
      } else {
        await api.post('/results/published', { classId: selectedClassId, stage: sheetType });
        setMyFeedResults(prev => prev.map(r => r.classId === selectedClassId 
          ? { ...r, 
              isPublished: sheetType === 'full' ? true : r.isPublished,
              isMidSemPublished: sheetType === 'mid-sem' ? true : r.isMidSemPublished,
              isEndSemPublished: sheetType === 'end-sem' ? true : r.isEndSemPublished
            } 
          : r));
        setClassPublishStatus(prev => ({
          ...prev,
          isPublished: sheetType === 'full' ? true : prev.isPublished,
          isMidSemPublished: sheetType === 'mid-sem' ? true : prev.isMidSemPublished,
          isEndSemPublished: sheetType === 'end-sem' ? true : prev.isEndSemPublished
        }));
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert('Failed to update publish status. Please try again.');
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleDownloadClassExcel = () => {
    if (!activeClass) return;
    
    let headers: string[] = [];
    if (sheetType === 'mid-sem') {
      headers = ['ROLL NO', 'STUDENT NAME', 'MID-SEM'];
    } else if (sheetType === 'end-sem') {
      headers = ['ROLL NO', 'STUDENT NAME', 'END-SEM'];
    } else {
      headers = ['ROLL NO', 'STUDENT NAME', 'INTERNAL', 'MID-SEM', 'END-SEM', 'THEORY TOTAL', 'THEORY GRADE', 'LAB', 'LAB GRADE'];
    }

    const rows = activeClassResultData.map(d => {
      if (sheetType === 'mid-sem') {
        return [d.rollNo, d.name, d.midSemMarks];
      } else if (sheetType === 'end-sem') {
        return [d.rollNo, d.name, d.endSemMarks];
      } else {
        const rowTheory = d.internalMarks + d.midSemMarks + d.endSemMarks;
        return [d.rollNo, d.name, d.internalMarks, d.midSemMarks, d.endSemMarks, rowTheory, d.grade || '', d.labMarks, ''];
      }
    });
    
    const fileNameSuffix = sheetType === 'mid-sem' ? 'Mid_Sem_Results' : sheetType === 'end-sem' ? 'End_Sem_Results' : 'Full_Results';
    exportToCSV(`${activeClass.subjectName || activeClass.name}_${fileNameSuffix}.csv`, headers, rows);
  };

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
        <div className="w-full lg:w-80 shrink-0 space-y-4">
           {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="flex-1 bg-surface rounded-xl border border-surface-border p-8">
           <SkeletonResultSheet />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <FileText className="h-12 w-12 text-red-300 mb-3" />
        <h3 className="text-lg font-medium text-slate-900">{error}</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">There was a problem communicating with the server.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      
      {/* Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isFaculty ? 'Publish and manage official student result sheets.' : 'View your official published result sheets.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 print:block print:w-full print:m-0">
        
        {/* Left Sidebar: Class Selection - Hidden on Print */}
        <div className="w-full lg:w-64 shrink-0 space-y-4 print:hidden">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Available Sheets</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedClassId('all')}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between",
                selectedClassId === 'all'
                  ? "border-primary bg-primary/5 shadow-sm text-primary-900 font-semibold"
                  : "border-surface-border bg-surface hover:border-primary/50 text-slate-700"
              )}
            >
              All Classes
            </button>
            {relevantClasses.map(c => {
              const cId = String(c.id || c._id);
              // For faculty, we check if ANY stage is published. For students it is always published in this list.
              const isPub = isFaculty ? myFeedResults.some(r => r.classId === cId && (r.isPublished || r.isMidSemPublished || r.isEndSemPublished)) : true;
              return (
                <button
                  key={cId}
                  onClick={() => setSelectedClassId(cId)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2",
                    selectedClassId === cId 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-surface-border bg-surface hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <span className={cn(
                      "font-semibold text-sm line-clamp-2",
                      selectedClassId === cId ? "text-primary-900" : "text-slate-900"
                    )}>
                      {c.subjectName || c.name} {c.subjectCode || c.code ? `(${c.subjectCode || c.code})` : ''}
                    </span>
                    {isPub ? (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Published
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-500 flex flex-col gap-1.5 w-full">
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{c.department || 'Dept N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded">Sem {c.semester} • Sec {c.section}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Panel:  Result Sheet */}
        <div className="flex-1 min-w-0 flex flex-col relative bg-surface rounded-xl border border-surface-border print:border-none print:w-full print:rounded-none">
          
          {selectedClassId === 'all' ? (
            <div className="p-8 lg:p-12">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Available Result Sheets</h2>
                <p className="text-slate-500 text-sm">Select a class to view its official result sheet.</p>
              </div>
              
              {relevantClasses.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-900">No Sheets Found</h3>
                  <p className="text-slate-500 text-sm mt-1">There are no published result sheets available right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">Select a Class</h3>
                    <p className="text-slate-500 text-sm mt-1">Please select a class from the left sidebar to view its official result sheet.</p>
                  </div>
                </div>
              )}
            </div>
          ) : activeClass ? (
            <>
              {/* Toolbar - Hidden on Print */}
              <div className="p-4 border-b border-surface-border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden rounded-t-xl">
                
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                  <button
                    onClick={() => setSheetType('mid-sem')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                      sheetType === 'mid-sem' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Mid-Sem
                  </button>
                  <button
                    onClick={() => setSheetType('end-sem')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                      sheetType === 'end-sem' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    End-Sem
                  </button>
                  <button
                    onClick={() => setSheetType('full')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                      sheetType === 'full' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Full Result
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {(() => {
                    const isStagePublished = 
                      sheetType === 'mid-sem' ? classPublishStatus.isMidSemPublished :
                      sheetType === 'end-sem' ? classPublishStatus.isEndSemPublished :
                      classPublishStatus.isPublished;

                    return (
                      <>
                        <Badge variant={isStagePublished ? 'success' : 'warning'} className="mr-2">
                          {isStagePublished ? 'Published' : 'Unpublished'}
                        </Badge>

                        {isFaculty && (
                          <Button 
                            variant={isStagePublished ? 'outline' : 'primary'}
                            onClick={handleTogglePublish}
                            className={isStagePublished ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'bg-emerald-600 hover:bg-emerald-700'}
                          >
                            {isStagePublished ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            {isStagePublished ? 'Unpublish' : 'Publish'}
                          </Button>
                        )}
                        
                        {isStagePublished && (
                          <>
                            <Button variant="secondary" onClick={handleDownloadClassExcel} title="Export Excel" className="mr-2">
                              <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" onClick={handlePrintPDF} title="Print / PDF">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Certificate Canvas */}
              <div className={cn(
                "p-8 lg:p-12 overflow-x-auto print:overflow-visible",
                !(
                  sheetType === 'mid-sem' ? classPublishStatus.isMidSemPublished :
                  sheetType === 'end-sem' ? classPublishStatus.isEndSemPublished :
                  classPublishStatus.isPublished
                ) && !isFaculty ? "blur-sm select-none hidden" : ""
              )}>
                {tableLoading ? (
                  <SkeletonResultSheet />
                ) : (
                  <ResultTable 
                    data={activeClassResultData} 
                    gradeRules={gradeRules} 
                    isFaculty={isFaculty} 
                    sheetType={sheetType}
                    headerData={{
                      collegeName,
                      subjectName: activeClass.subjectName,
                      subjectCode: activeClass.subjectCode || 'N/A',
                      semester: activeClass.semester,
                      section: activeClass.section,
                      academicYear: activeClass.academicYear || '2025-2026',
                      instructorName: classInfo?.instructorName || activeClass.facultyId?.name || 'Faculty Member',
                      isEditingCollege,
                      onCollegeNameChange: setCollegeName,
                      onEditToggle: setIsEditingCollege
                    }}
                  />
                )}
              </div>
              
              {/* Empty state for unpublished for students */}
              {!(
                sheetType === 'mid-sem' ? classPublishStatus.isMidSemPublished :
                sheetType === 'end-sem' ? classPublishStatus.isEndSemPublished :
                classPublishStatus.isPublished
              ) && !isFaculty && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-b-xl print:hidden h-96">
                  <FileText className="h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium text-slate-900">Results Unpublished</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">
                    The {sheetType === 'mid-sem' ? 'Mid-Sem' : sheetType === 'end-sem' ? 'End-Sem' : 'Full'} official result sheet for this class has not been published yet. Check back later.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
