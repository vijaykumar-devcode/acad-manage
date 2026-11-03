import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function LiveExam() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [cls, setCls] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Guard check: Fetch attempts to ensure student hasn't already completed it
        const attemptsRes = await api.get('/quizzes/attempts/all').catch(() => ({ data: [] }));
        const attempts = attemptsRes.data?.data || attemptsRes.data || [];
        const existingAttempt = attempts.find((a: any) => 
          (a.quizId === quizId || (a.quizId as any)?._id === quizId) && 
          (a.studentId === user?.id || a.studentId === (user as any)?._id)
        );

        if (existingAttempt && (existingAttempt.status === 'Completed' || existingAttempt.status === 'Evaluated')) {
          navigate(`/quizzes/${quizId}/result`, { replace: true });
          return;
        }

        const res = await api.get(`/quizzes/${quizId}`);
        const quizData = res.data?.quiz || res.data;
        if (quizData && quizData.questions && quizData.questions.length > 0) {
          setQuiz(quizData);
          setQuestions(quizData.questions);
          if (quizData.classId) {
            api.get(`/classes/${quizData.classId}`).then(clsRes => setCls(clsRes.data)).catch(() => {});
          }
        } else {
          setErrorMsg("Quiz not found or has no questions.");
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || "Failed to load quiz.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (quizId) fetchExamData();
  }, [quizId, navigate, user]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (quiz?.durationMinutes && quiz?.startTime) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(quiz.startTime).getTime()) / 1000);
      const totalSeconds = quiz.durationMinutes * 60;
      setTimeLeft(Math.max(0, totalSeconds - elapsedSeconds));
    }
  }, [quiz]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !quiz) return;
    setIsSubmitting(true);
    
    try {
      await api.post(`/quizzes/${quizId}/submit`, { answers });
    } catch(e) {}
    
    navigate(`/quizzes/${quiz._id || quiz.id}/result`, { replace: true });
  }, [answers, isSubmitting, navigate, quiz, quizId]);

  useEffect(() => {
    if (timeLeft === null || !quiz || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft === null, quiz]);

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitting, handleSubmit]);

  // Anti-cheating safeguards
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      // Optional: Add toast warning here if toast system exists
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Prevent Ctrl/Cmd + C, U
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'u')) {
        e.preventDefault();
      }
      // Prevent Ctrl/Cmd + Shift/Option + I
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
      }
    };

    window.addEventListener('copy', handleCopy);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading exam...</div>;
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Notice</h2>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <Button onClick={() => navigate('/quizzes')} className="w-full">
            Back to Quizzes
          </Button>
        </div>
      </div>
    );
  }

  if (!quiz || !questions.length) {
    return <div className="p-12 text-center text-slate-500">Quiz not found or has no questions.</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = Math.round((answeredCount / questions.length) * 100);
  
  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : 0;
  const seconds = timeLeft !== null ? timeLeft % 60 : 0;
  const isTimeCritical = timeLeft !== null && timeLeft < 300; // less than 5 minutes

  const handleOptionSelect = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion._id || currentQuestion.id]: optionIndex
    }));
  };

  const toggleMarkForReview = () => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      const qId = currentQuestion._id || currentQuestion.id;
      if (newSet.has(qId)) {
        newSet.delete(qId);
      } else {
        newSet.add(qId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-md uppercase tracking-wider">
              {cls?.code}
            </span>
            <h1 className="text-xl font-bold text-slate-900">{quiz.title}</h1>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm text-slate-500 border-l border-slate-200 pl-4">
            <span>{questions.length} Questions</span>
            <span>•</span>
            <span>{quiz.totalMarks} Max Marks</span>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-lg font-mono text-xl font-bold transition-colors",
          isTimeCritical 
            ? "bg-red-50 text-red-600 animate-pulse border border-red-200" 
            : "bg-slate-100 text-slate-700 border border-slate-200"
        )}>
          {isTimeCritical ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          <span>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 lg:p-6 gap-6">
        
        {/* Left Column: Exam Panel */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Progress Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Student" className="h-10 w-10 rounded-full bg-slate-100" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {user?.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.rollNumber} • {cls?.name}</p>
              </div>
            </div>

            <div className="w-full sm:w-1/2 max-w-sm">
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Progress</span>
                <span>{answeredCount} / {questions.length} Answered ({progressPercentage}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col select-none">
            <div className="p-6 lg:p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-bold text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</h2>
                <span className="text-sm font-semibold text-slate-400">[{currentQuestion.marks} Marks]</span>
              </div>
              
              <p className="text-xl font-medium text-slate-900 leading-relaxed mb-8">
                {currentQuestion.questionText}
              </p>

              <div className="space-y-3">
                {currentQuestion.options.map((optionObj: any, idx: number) => {
                  const optionText = typeof optionObj === 'string' ? optionObj : optionObj.text;
                  const optionId = typeof optionObj === 'string' ? idx : optionObj.id;
                  const isSelected = answers[currentQuestion._id || currentQuestion.id] === optionId;
                  return (
                    <button
                      key={optionId}
                      onClick={() => handleOptionSelect(optionId)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "border-primary" : "border-slate-300 group-hover:border-slate-400"
                      )}>
                        {isSelected && <div className="h-3 w-3 rounded-full bg-primary" />}
                      </div>
                      <span className={cn(
                        "text-base font-medium",
                        isSelected ? "text-primary-900" : "text-slate-700"
                      )}>
                        {optionText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="border-t border-slate-200 p-4 lg:p-6 bg-slate-50 flex items-center justify-between rounded-b-xl">
              <Button 
                variant="secondary" 
                onClick={toggleMarkForReview}
                className={cn(
                  "gap-2",
                  markedForReview.has(currentQuestion._id || currentQuestion.id) ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200" : ""
                )}
              >
                <Flag className={cn("h-4 w-4", markedForReview.has(currentQuestion._id || currentQuestion.id) ? "fill-amber-500 text-amber-500" : "")} />
                {markedForReview.has(currentQuestion._id || currentQuestion.id) ? 'Marked' : 'Mark for Review'}
              </Button>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button 
                    onClick={handleSubmit} 
                    isLoading={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white border-transparent"
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Navigator Grid */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-24">
            <h3 className="font-bold text-slate-900 mb-4">Question Navigator</h3>
            
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((q, idx) => {
                const qId = q._id || q.id;
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = answers[qId] !== undefined;
                const isMarked = markedForReview.has(qId);

                return (
                  <button
                    key={qId}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all border-2",
                      isCurrent ? "border-primary ring-2 ring-primary/20 ring-offset-1" : "border-transparent",
                      isMarked 
                        ? "bg-amber-100 text-amber-800" 
                        : isAnswered 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <div className="h-3 w-3 rounded-sm border-2 border-primary" /> Current Question
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <div className="h-3 w-3 rounded-sm bg-emerald-100" /> Answered
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <div className="h-3 w-3 rounded-sm bg-amber-100" /> Marked for Review
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                <div className="h-3 w-3 rounded-sm bg-slate-100" /> Not Answered
              </div>
            </div>

            <Button 
              className="w-full mt-6 bg-green-600 hover:bg-green-700 border-transparent text-white" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Submit Quiz Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
