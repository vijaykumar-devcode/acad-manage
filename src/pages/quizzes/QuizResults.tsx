import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  Calendar
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function QuizResults() {
  const { quizId } = useParams();
  
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  const [quiz, setQuiz] = useState<any>(null);
  const [cls, setCls] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const [qRes, qsRes, aRes] = await Promise.all([
          api.get(`/quizzes/${quizId}`).catch(() => ({ data: null })),
          api.get(`/quizzes/${quizId}/questions`).catch(() => ({ data: [] })),
          api.get(`/quizzes/${quizId}/result`).catch(() => ({ data: null }))
        ]);
        const fetchedAttempt = aRes.data?.attempt || aRes.data?.data || aRes.data;
        setAttempt(fetchedAttempt);
        
        // Extract quiz and questions either from individual endpoints or from the populated attempt object
        const finalQuiz = qRes.data?.quiz || qRes.data || fetchedAttempt?.quiz;
        // If qsRes.data is [] (default on failure), we must properly fall back to the attempt's quiz questions
        const fetchedQuestions = qsRes.data?.data || qsRes.data;
        const finalQuestions = (Array.isArray(fetchedQuestions) && fetchedQuestions.length > 0) 
            ? fetchedQuestions 
            : (fetchedAttempt?.quiz?.questions || []);
        
        setQuiz(finalQuiz);
        setQuestions(Array.isArray(finalQuestions) ? finalQuestions : []);
        
        if (finalQuiz?.classId) {
          api.get(`/classes/${finalQuiz.classId}`).then(res => setCls(res.data?.data || res.data)).catch(() => {});
        }
      } catch (err) {}
      setLoading(false);
    };
    if (quizId) fetchResults();
  }, [quizId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading results...</div>;
  }

  if (!quiz || !attempt) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-900">Results not found</h2>
        <p className="text-slate-500 mt-2">We couldn't find the results for this quiz attempt.</p>
        <Link to="/quizzes" className="text-primary hover:underline mt-4 inline-block font-medium">
          Return to Quizzes
        </Link>
      </div>
    );
  }

  // Calculate metrics
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const reviewedQuestions = questions.map(q => {
    const studentAnswerIndex = attempt.answers ? attempt.answers[q._id || q.id] : undefined;
    const isCorrect = studentAnswerIndex === q.correctOptionIndex;
    const isUnattempted = studentAnswerIndex === undefined;

    if (isUnattempted) unattemptedCount++;
    else if (isCorrect) correctCount++;
    else incorrectCount++;

    return { ...q, studentAnswerIndex, isCorrect, isUnattempted };
  });

  const total = attempt.totalPossibleMarks || quiz.totalMarks || 1;
  const percentage = Math.round(((attempt.score || 0) / total) * 100);

  const filteredQuestions = reviewedQuestions.filter(q => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return !q.isCorrect && !q.isUnattempted;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/quizzes" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Quizzes
      </Link>

      {/* Header Panel */}
      <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="info">{cls?.code}</Badge>
              <Badge variant="success">Completed</Badge>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">{quiz.title}</h1>
            <p className="text-slate-500">{cls?.name}</p>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-canvas-alt px-3 py-1.5 rounded-lg border border-surface-border">
                <Calendar className="h-4 w-4" />
                Submitted {attempt.completedAt || attempt.startedAt ? new Date(attempt.completedAt || attempt.startedAt).toLocaleString() : 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-canvas-alt px-3 py-1.5 rounded-lg border border-surface-border">
                <Clock className="h-4 w-4" />
                Duration: {quiz.durationMinutes} mins
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 shrink-0">
            <div className="relative h-24 w-24 shrink-0">
              {/* Simple CSS Circle Chart */}
              <svg viewBox="0 0 36 36" className="h-24 w-24 transform -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={percentage >= 75 ? "#10B981" : percentage >= 50 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="3"
                  strokeDasharray={`${percentage}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-xl font-bold text-slate-900">{percentage}%</span>
              </div>
            </div>
            
            <div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{attempt.score} <span className="text-lg text-slate-400 font-medium">/ {quiz.totalMarks}</span></p>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Marks Obtained</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-surface-border">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-900">{correctCount}</p>
              <p className="text-sm font-medium text-emerald-700">Correct</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">{incorrectCount}</p>
              <p className="text-sm font-medium text-red-700">Incorrect</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{unattemptedCount}</p>
              <p className="text-sm font-medium text-slate-600">Unattempted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Question Review
          </h2>
          
          <div className="flex bg-canvas-alt p-1 rounded-lg border border-surface-border inline-flex">
            <button 
              onClick={() => setFilter('all')}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", filter === 'all' ? "bg-surface shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
            >
              All ({questions.length})
            </button>
            <button 
              onClick={() => setFilter('correct')}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", filter === 'correct' ? "bg-surface shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700")}
            >
              Correct ({correctCount})
            </button>
            <button 
              onClick={() => setFilter('incorrect')}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", filter === 'incorrect' ? "bg-surface shadow-sm text-red-700" : "text-slate-500 hover:text-slate-700")}
            >
              Incorrect ({incorrectCount})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-xl border border-surface-border">
              <p className="text-slate-500">No questions match this filter.</p>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => (
              <div key={q._id || q.id} className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500">Q{idx + 1}.</span>
                    <Badge variant={q.isUnattempted ? 'default' : q.isCorrect ? 'success' : 'error'}>
                      {q.isUnattempted ? 'Unattempted' : q.isCorrect ? `+${q.marks} Marks` : '0 Marks'}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-lg font-medium text-slate-900 mb-6">{q.questionText}</p>

                <div className="space-y-3">
                  {q.options.map((option: string, optIdx: number) => {
                    const isStudentSelection = q.studentAnswerIndex === optIdx;
                    const isCorrectOption = q.correctOptionIndex === optIdx;
                    
                    let bgClass = "border-slate-200 bg-white";
                    let icon = null;

                    if (isCorrectOption) {
                      bgClass = "border-emerald-500 bg-emerald-50";
                      icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
                    } else if (isStudentSelection && !isCorrectOption) {
                      bgClass = "border-red-300 bg-red-50";
                      icon = <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
                    }

                    return (
                      <div key={optIdx} className={cn("p-4 rounded-lg border-2 flex items-center justify-between gap-4", bgClass)}>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "font-semibold text-sm",
                            isCorrectOption ? "text-emerald-700" : isStudentSelection ? "text-red-700" : "text-slate-500"
                          )}>
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className={cn(
                            "text-sm font-medium",
                            isCorrectOption ? "text-emerald-900" : isStudentSelection ? "text-red-900" : "text-slate-700"
                          )}>
                            {option}
                          </span>
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
