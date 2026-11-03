import { useAuthStore } from '../../store/authStore';
import { FacultyDashboard } from './FacultyDashboard';
import { StudentDashboard } from './StudentDashboard';

export function Dashboard() {
  const { user } = useAuthStore();

  if (!user) return null;

  if (user.role === 'Faculty' || user.role === 'Admin') {
    return <FacultyDashboard />;
  }

  return <StudentDashboard />;
}
