import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

import { Dashboard } from './pages/dashboard/Dashboard';
import { ChallengesOverview } from './pages/challenges/ChallengesOverview';
import { ChallengeDetail } from './pages/challenges/ChallengeDetail';
import { ChallengeLeaderboard } from './pages/challenges/ChallengeLeaderboard';
import { ClassesOverview } from './pages/classes/ClassesOverview';
import { ClassDetail } from './pages/classes/ClassDetail';
import { StudyMaterials } from './pages/materials/StudyMaterials';
import { AssignmentsPortal } from './pages/assignments/AssignmentsPortal';
import { AssignmentEvaluation } from './pages/assignments/AssignmentEvaluation';
import { QuizzesPortal } from './pages/quizzes/QuizzesPortal';
import { LiveExam } from './pages/quizzes/LiveExam';
import { QuizResults } from './pages/quizzes/QuizResults';
import { MarksManagement } from './pages/marks/MarksManagement';
import { ResultsPortal } from './pages/results/ResultsPortal';
import { GlobalSearch } from './pages/search/GlobalSearch';
import { NoticesPortal } from './pages/notices/NoticesPortal';
import { PYQPortal } from './pages/pyq/PYQPortal';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProfilePortal } from './pages/profile/ProfilePortal';
import { AccountLinking } from './pages/profile/AccountLinking';
import { SkeletonAppShell } from './components/ui/Skeletons';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isInitializing) {
    return <SkeletonAppShell />;
  }

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Distraction-Free Exam Route outside AppLayout */}
          <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
            <Route path="/quizzes/:quizId/take" element={<LiveExam />} />
          </Route>

          {/* Authenticated routes — any role */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/challenges" element={<ChallengesOverview />} />
            <Route path="/challenges/:id" element={<ChallengeDetail />} />
            <Route path="/challenges/:id/leaderboard" element={<ChallengeLeaderboard />} />
            <Route path="/classes" element={<ClassesOverview />} />
            <Route path="/classes/:classId" element={<ClassDetail />} />
            <Route path="/study-materials" element={<StudyMaterials />} />
            <Route path="/assignments" element={<AssignmentsPortal />} />
            <Route path="/quizzes" element={<QuizzesPortal />} />
            <Route path="/quizzes/:quizId/result" element={<QuizResults />} />
            <Route path="/results" element={<ResultsPortal />} />
            <Route path="/search" element={<GlobalSearch />} />
            <Route path="/notices" element={<NoticesPortal />} />
            <Route path="/pyqs" element={<PYQPortal />} />
            <Route path="/profile" element={<ProfilePortal />} />
            <Route path="/profile/accounts" element={<AccountLinking />} />

            {/* Faculty + Admin only routes */}
            <Route element={<ProtectedRoute allowedRoles={['Faculty', 'Admin']} />}>
              <Route path="/assignment-evaluation" element={<AssignmentEvaluation />} />
              <Route path="/marks" element={<MarksManagement />} />
            </Route>

            {/* Admin only routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
