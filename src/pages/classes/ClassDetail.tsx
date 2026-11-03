import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";
import { Button } from "../../components/ui/Button";
import { RosterModal } from "../../components/classes/RosterModal";
import { AddMaterialModal } from "../../components/materials/AddMaterialModal";
import { CreateAssignmentModal } from "../../components/assignments/CreateAssignmentModal";
import { AssignmentDetailsDrawer } from "../../components/assignments/AssignmentDetailsDrawer";
import { CreateQuizModal } from "../../components/quizzes/CreateQuizModal";
import { QuizDetailsDrawer } from "../../components/quizzes/QuizDetailsDrawer";
import { ResultTable } from "../../components/results/ResultTable";
import { PerformanceAnalytics } from "../../components/results/PerformanceAnalytics";
import { StatCard } from "../../components/ui/StatCard";
import { UserAvatar } from "../../components/common/UserAvatar";
import { CreateNoticeModal } from "../../components/notices/CreateNoticeModal";
import { cn } from "../../lib/utils";
import toast from "react-hot-toast";
import {
  Users,
  Copy,
  CheckCircle2,
  BookOpen,
  FileText,
  ClipboardList,
  GraduationCap,
  ArrowLeft,
  Plus,
  Bell,
  BarChart2,
  StickyNote,
  ExternalLink,
  Trash2,
  Link2,
} from "lucide-react";
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonStatCard, SkeletonResultSheet, SkeletonNotice } from "../../components/ui/Skeletons";

type TabType =
  | "overview"
  | "students"
  | "materials"
  | "assignments"
  | "quizzes"
  | "marks"
  | "results"
  | "analytics"
  | "notices"
  | "notes";

export function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [gradeRules, setGradeRules] = useState<any[]>([]);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);

  const [cls, setCls] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tabData, setTabData] = useState<Record<TabType, any>>({
    overview: null,
    students: null,
    materials: null,
    assignments: null,
    quizzes: null,
    marks: null,
    results: null,
    analytics: null,
    notices: null,
    notes: null,
  });
  const [tabLoading, setTabLoading] = useState(false);

  // Notes add-form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDriveUrl, setNoteDriveUrl] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const response = await api.get(`/classes/${classId}`);
        setCls(response.data.data || response.data);
      } catch (error) {
        console.error("Error fetching class details:", error);
      } finally {
        setLoading(false);
      }
    };
    if (classId) fetchClass();
  }, [classId]);

  useEffect(() => {
    const fetchTabData = async () => {
      if (!classId) return;
      if (activeTab === "overview") {
        const needsMaterials = tabData.materials === null;
        const needsAssignments = tabData.assignments === null;
        const needsQuizzes = tabData.quizzes === null;

        if (needsMaterials || needsAssignments || needsQuizzes) {
          setTabLoading(true);
          try {
            const [matRes, assRes, quizRes] = await Promise.all([
              needsMaterials
                ? api
                    .get(`/materials/class/${classId}`)
                    .catch(() => ({ data: [] }))
                : Promise.resolve({ data: tabData.materials }),
              needsAssignments
                ? api
                    .get(`/assignments/class/${classId}`)
                    .catch(() => ({ data: [] }))
                : Promise.resolve({ data: tabData.assignments }),
              needsQuizzes
                ? api
                    .get(`/quizzes/class/${classId}`)
                    .catch(() => ({ data: [] }))
                : Promise.resolve({ data: tabData.quizzes }),
            ]);

            setTabData((prev) => ({
              ...prev,
              students: cls?.students || prev.students || [],
              materials:
                prev.materials !== null
                  ? prev.materials
                  : Array.isArray(matRes.data?.data)
                    ? matRes.data.data
                    : matRes.data?.materials || matRes.data?.data || [],
              assignments:
                prev.assignments !== null
                  ? prev.assignments
                  : Array.isArray(assRes.data?.data)
                    ? assRes.data.data
                    : assRes.data?.assignments || assRes.data?.data || [],
              quizzes:
                prev.quizzes !== null
                  ? prev.quizzes
                  : Array.isArray(quizRes.data?.data)
                    ? quizRes.data.data
                    : quizRes.data?.quizzes || quizRes.data?.data || [],
            }));
          } catch (error) {
            console.error("Error fetching overview data:", error);
          } finally {
            setTabLoading(false);
          }
        }
        return;
      }

      if (tabData[activeTab] !== null) return;
      setTabLoading(true);
      try {
        let res: any;
        switch (activeTab) {
          case "students":
            res = await api.get(`/classes/${classId}/roster`);
            setTabData((prev) => ({
              ...prev,
              students: Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray(res.data)
                  ? res.data
                  : [],
            }));
            break;
          case "materials":
            res = await api.get(`/materials/class/${classId}`);
            setTabData((prev) => ({
              ...prev,
              materials: Array.isArray(res.data.data)
                ? res.data.data
                : res.data.materials || res.data.data || res.data || [],
            }));
            break;
          case "assignments":
            res = await api.get(`/assignments/class/${classId}`);
            setTabData((prev) => ({
              ...prev,
              assignments: Array.isArray(res.data.data)
                ? res.data.data
                : res.data.assignments || res.data.data || res.data || [],
            }));
            break;
          case "quizzes":
            res = await api.get(`/quizzes/class/${classId}`);
            setTabData((prev) => ({
              ...prev,
              quizzes: Array.isArray(res.data.data)
                ? res.data.data
                : res.data.quizzes || res.data.data || res.data || [],
            }));
            break;
          case "marks":
            if (user?.role === "Faculty" || user?.role === "Admin") {
              res = await api.get(`/marks/class/${classId}`);
              setTabData((prev) => ({
                ...prev,
                marks: res.data.data?.marks || [],
              }));
            } else {
              setTabData((prev) => ({ ...prev, marks: [] }));
            }
            break;
          case "results":
          case "analytics": {
            const [resData, resGrades] = await Promise.all([
              api.get(`/results/class/${classId}`),
              api.get("/gradescale").catch(() => ({ data: { data: null } })),
            ]);
            res = resData;
            if (resGrades.data?.data?.rules) {
              setGradeRules(resGrades.data.data.rules);
            }
            const resultRows = Array.isArray(res.data.data)
              ? res.data.data
              : res.data.results || res.data.data || res.data || [];
            setTabData((prev) => ({
              ...prev,
              results: resultRows,
              // Store isPublished alongside analytics data
              analytics: { rows: resultRows, isPublished: res.data.isPublished ?? false },
            }));
            break;
          }
          case "notices":
            res = await api.get(`/notices/class/${classId}`);
            setTabData((prev) => ({
              ...prev,
              notices: Array.isArray(res.data.data)
                ? res.data.data
                : res.data.notices || res.data.data || res.data || [],
            }));
            break;
          case "notes":
            res = await api.get(`/notes/class/${classId}`);
            setTabData((prev) => ({
              ...prev,
              notes: Array.isArray(res.data.data) ? res.data.data : [],
            }));
            break;
        }
      } catch (error) {
        console.error(`Error fetching ${activeTab} data:`, error);
        setTabData((prev) => ({ ...prev, [activeTab]: [] }));
      } finally {
        setTabLoading(false);
      }
    };
    fetchTabData();
  }, [activeTab, classId, tabData, user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden shadow-sm">
          <div className="bg-slate-800 p-8 h-48 relative flex items-end">
             <div className="w-full flex justify-between items-end">
               <div>
                 <Skeleton className="h-6 w-32 bg-slate-700 mb-2" />
                 <Skeleton className="h-8 w-64 bg-slate-700 mb-2" />
                 <Skeleton className="h-4 w-48 bg-slate-700" />
               </div>
               <Skeleton className="h-10 w-32 bg-slate-700 rounded-md" />
             </div>
          </div>
          <div className="border-b border-surface-border bg-white px-2">
            <div className="flex gap-2 p-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-24 rounded-md" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const refetchTab = (tab: TabType) => {
    setTabData((prev) => ({ ...prev, [tab]: null }));
  };

  if (!cls) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900">Class not found</h2>
        <Link
          to="/classes"
          className="text-primary hover:underline mt-2 inline-block"
        >
          Return to Classes
        </Link>
      </div>
    );
  }

  const handleCopyJoinLink = () => {
    const joinUrl = `${window.location.origin}/join/${cls.joinCode}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedCode(cls.joinCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const allTabs: { id: TabType; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "students", label: "Students", icon: Users },
    { id: "materials", label: "Materials", icon: FileText },
    { id: "assignments", label: "Assignments", icon: ClipboardList },
    { id: "quizzes", label: "Quizzes", icon: ClipboardList },
    { id: "notices", label: "Notices", icon: Bell },
    { id: "marks", label: "Marks", icon: GraduationCap },
    { id: "results", label: "Results", icon: CheckCircle2 },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ];

  const tabs =
    user?.role === "Student"
      ? allTabs.filter((t) => t.id !== "marks")
      : allTabs;

  const renderEmptyState = (
    title: string,
    message: string,
    actionText?: string,
    onAction?: () => void,
    Icon = BookOpen,
  ) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-16 bg-white rounded-xl border border-dashed border-slate-300">
      <div className="p-4 bg-slate-50 rounded-full mb-4">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">
        {message}
      </p>
      {user?.role === "Faculty" && actionText && onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {actionText}
        </Button>
      )}
    </div>
  );

  const renderContent = () => {
    if (tabLoading) {
      switch (activeTab) {
        case "overview":
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-4">
                   <Skeleton className="h-6 w-32 mb-4" />
                   {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                 </div>
                 <div className="space-y-4">
                   <Skeleton className="h-6 w-32 mb-4" />
                   <SkeletonCard />
                 </div>
              </div>
            </div>
          );
        case "students":
        case "marks":
          return <SkeletonTable rows={10} />;
        case "materials":
        case "assignments":
        case "quizzes":
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          );
        case "notices":
          return (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <SkeletonNotice key={i} />)}
            </div>
          );
        case "notes":
          return (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          );
        case "results":
        case "analytics":
          return <SkeletonResultSheet />;
        default:
          return <SkeletonTable rows={5} />;
      }
    }

    switch (activeTab) {
      case "overview":
        const overviewStudents = cls?.students || tabData.students || [];
        const overviewMaterials = tabData.materials || [];
        const overviewAssignments = tabData.assignments || [];
        const overviewQuizzes = tabData.quizzes || [];

        const recentActivities = [
          ...overviewMaterials.map((m: any) => ({
            ...m,
            activityType: "Material",
            date: new Date(m.createdAt || m.uploadedAt || Date.now()),
          })),
          ...overviewAssignments.map((a: any) => ({
            ...a,
            activityType: "Assignment",
            date: new Date(a.createdAt || a.dueDate || Date.now()),
          })),
          ...overviewQuizzes.map((q: any) => ({
            ...q,
            activityType: "Quiz",
            date: new Date(q.createdAt || q.startTime || Date.now()),
          })),
        ]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Enrolled Students"
                value={overviewStudents.length}
                icon={Users}
              />
              <StatCard
                title="Study Materials"
                value={overviewMaterials.length}
                icon={FileText}
              />
              <StatCard
                title="Active Assignments"
                value={overviewAssignments.length}
                icon={ClipboardList}
              />
              <StatCard
                title="Quizzes"
                value={overviewQuizzes.length}
                icon={CheckCircle2}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Recent Activity
                </h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivities.map((activity, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200"
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0",
                            activity.activityType === "Material"
                              ? "bg-blue-50 text-blue-600"
                              : activity.activityType === "Assignment"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-emerald-50 text-emerald-600",
                          )}
                        >
                          {activity.activityType === "Material" ? (
                            <FileText className="h-5 w-5" />
                          ) : activity.activityType === "Assignment" ? (
                            <ClipboardList className="h-5 w-5" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            New {activity.activityType}: {activity.title}
                          </p>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                            {activity.description ||
                              "Added recently to the class."}
                          </p>
                          <p className="text-xs font-medium text-slate-400 mt-2">
                            {activity.date.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-canvas-alt rounded-xl border border-surface-border border-dashed">
                    <p className="text-slate-500 text-sm">
                      No recent activity found.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Course Instructor
                </h3>
                <div className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center">
                  <UserAvatar
                    name={cls.facultyId?.name}
                    avatarUrl={cls.facultyId?.avatarUrl}
                    className="h-20 w-20 mb-4 text-2xl"
                  />
                  <h4 className="font-bold text-slate-900 text-lg">
                    {cls.facultyId?.name || "Faculty Member"}
                  </h4>
                  <p className="text-sm text-primary font-medium mt-1">
                    {cls.facultyId?.department ||
                      cls.department ||
                      "Department"}
                  </p>
                  <div className="w-full h-px bg-slate-100 my-4"></div>
                  <p className="text-sm text-slate-600 w-full text-left truncate">
                    <span className="font-medium text-slate-900">Email:</span>{" "}
                    {cls.facultyId?.email || "N/A"}
                  </p>
                  <p className="text-sm text-slate-600 w-full text-left truncate mt-2">
                    <span className="font-medium text-slate-900">Role:</span>{" "}
                    Course Instructor
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "students":
        const students = cls?.students || tabData.students || [];
        if (students.length === 0) {
          return renderEmptyState(
            "No students enrolled yet",
            "Share the join code with your students to get started.",
            undefined,
            undefined,
            Users,
          );
        }

        const sortedStudents = [...students].sort((a, b) => {
          const aRoll = a.rollNo || a.rollNumber || "";
          const bRoll = b.rollNo || b.rollNumber || "";
          return String(aRoll).localeCompare(String(bRoll), undefined, {
            numeric: true,
          });
        });

        return (
          <div className="bg-surface rounded-xl border border-surface-border overflow-x-auto overflow-y-hidden custom-scrollbar w-full">
            <table className="w-full min-w-[650px] text-sm text-left">
              <thead className="text-xs text-slate-500 bg-canvas-alt uppercase border-b border-surface-border">
                <tr>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s: any) => (
                  <tr
                    key={s._id || s.id}
                    className="border-b border-surface-border last:border-0 hover:bg-canvas/50"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {s.rollNo || s.rollNumber || "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <UserAvatar name={s.name} avatarUrl={s.avatarUrl} />
                      {s.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.department || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                        Student
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "materials":
        const materials = tabData.materials || [];
        if (materials.length === 0) {
          return renderEmptyState(
            "No study materials",
            user?.role === "Faculty"
              ? "Upload documents, links, or notes for your students."
              : "No study materials uploaded yet for this class.",
            "Upload Material",
            () => setIsAddMaterialOpen(true),
            FileText,
          );
        }
        return (
          <div className="space-y-3">
            {materials.map((m: any) => (
              <div
                key={m._id || m.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {m.type} • Added recently
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(m.gDriveUrl, "_blank")}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        );

      case "assignments":
        const assignments = tabData.assignments || [];
        if (assignments.length === 0) {
          return renderEmptyState(
            "No assignments created yet",
            user?.role === "Faculty"
              ? "Create an assignment to evaluate your students."
              : "No assignments have been posted for this class.",
            "Create Assignment",
            () => setIsCreateAssignmentOpen(true),
            ClipboardList,
          );
        }
        return (
          <div className="space-y-3">
            {assignments.map((a: any) => (
              <div
                key={a._id || a.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow gap-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                    {a.description}
                  </p>
                  <p className="text-xs font-medium text-slate-400 mt-2">
                    Due: {new Date(a.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedAssignment(a)}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        );

      case "quizzes":
        const quizzes = tabData.quizzes || [];
        if (quizzes.length === 0) {
          return renderEmptyState(
            "No quizzes available",
            user?.role === "Faculty"
              ? "Create a quiz to test student knowledge."
              : "No quizzes have been scheduled.",
            "Create Quiz",
            () => setIsCreateQuizOpen(true),
            ClipboardList,
          );
        }
        return (
          <div className="space-y-3">
            {quizzes.map((q: any) => (
              <div
                key={q._id || q.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow gap-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{q.title}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {q.questions?.length || 0} Questions • {q.durationMinutes}{" "}
                    Minutes
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedQuiz(q)}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        );

      case "marks":
        const marks = tabData.marks || [];
        if (marks.length === 0) {
          return renderEmptyState(
            "No marks entered",
            "Marks for internal, mid-sem, and end-sem exams will appear here.",
            "Enter Marks",
            () => navigate(`/marks?classId=${classId || cls?._id || ''}`),
            GraduationCap,
          );
        }
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200">
            <GraduationCap className="h-10 w-10 text-primary mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {marks.length} Mark Entries
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Manage and view all detailed marks in the Marks Portal.
            </p>
            <Button onClick={() => navigate(`/marks?classId=${classId || cls?._id || ''}`)}>
              Go to Marks Portal
            </Button>
          </div>
        );

      case "results":
        const results = tabData.results || [];
        if (results.length === 0) {
          return renderEmptyState(
            "No results published",
            user?.role === "Faculty"
              ? "Generate and publish  Result Sheets."
              : "No official results have been published yet.",
            "Manage Results",
            () => navigate("/results"),
            CheckCircle2,
          );
        }
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900"> Result Sheet</h3>
                <p className="text-sm text-slate-500">
                  View detailed marks and grades for this class.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/results")}
              >
                View in Portal
              </Button>
            </div>
            <div className="p-4">
              <ResultTable
                data={results}
                gradeRules={gradeRules}
                isFaculty={user?.role === "Faculty"}
                headerData={{
                  collegeName: "ABC COLLEGE OF ENGINEERING", // Default, could be made configurable later
                  subjectName: cls?.subjectName || cls?.name,
                  subjectCode: cls?.subjectCode || cls?.code || "N/A",
                  semester: cls?.semester,
                  section: cls?.section,
                  academicYear: cls?.academicYear || "2025-2026",
                  instructorName: cls?.facultyId?.name || "Faculty Member",
                }}
              />
            </div>
          </div>
        );

      case "analytics": {
        const analyticsData = tabData.analytics;
        const analyticsRows = analyticsData?.rows || [];
        const isPublished = analyticsData?.isPublished ?? false;
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-6 pb-6">
            <PerformanceAnalytics results={analyticsRows} isPublished={isPublished} type="overall" />
            <div className="border-t border-slate-100 pt-6">
              <PerformanceAnalytics results={analyticsRows} isPublished={isPublished} type="lab" />
            </div>
          </div>
        );
      }

      case "notices":
        const classNotices = tabData.notices || [];
        if (classNotices.length === 0) {
          return renderEmptyState(
            "No notices yet",
            user?.role === "Faculty"
              ? "Post an announcement or notice for your students."
              : "No notices have been posted for this class.",
            "Post Notice",
            () => setIsCreateNoticeOpen(true),
            Bell,
          );
        }
        return (
          <div className="space-y-4">
            {user?.role === "Faculty" && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateNoticeOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Notice
                </Button>
              </div>
            )}
            {classNotices.map((n: any) => (
              <div
                key={n._id || n.id}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">{n.title}</h4>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {n.content}
                </p>
                {n.createdBy && (
                  <p className="text-xs text-slate-400 mt-3 font-medium">
                    Posted by: {n.createdBy.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      case "notes": {
        const myNotes: any[] = tabData.notes || [];

        const handleAddNote = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!noteTitle.trim() || !noteDriveUrl.trim()) return;
          setNoteSaving(true);
          try {
            await api.post(`/notes/class/${classId}`, {
              title: noteTitle.trim(),
              driveUrl: noteDriveUrl.trim(),
            });
            setNoteTitle("");
            setNoteDriveUrl("");
            // Refetch notes
            setTabData((prev) => ({ ...prev, notes: null }));
            toast.success("Note added!");
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add note.");
          } finally {
            setNoteSaving(false);
          }
        };

        const handleDeleteNote = async (noteId: string) => {
          try {
            await api.delete(`/notes/${noteId}`);
            setTabData((prev) => ({
              ...prev,
              notes: (prev.notes || []).filter((n: any) => n._id !== noteId),
            }));
            toast.success("Note deleted.");
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete note.");
          }
        };

        return (
          <div className="space-y-6">
            {/* Add note form */}
            <div className="bg-surface rounded-xl border border-surface-border p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Add a Note
              </h3>
              <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Note title (e.g. Week 3 Lecture Notes)"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                  className="flex-1 h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="url"
                  placeholder="Google Drive URL"
                  value={noteDriveUrl}
                  onChange={(e) => setNoteDriveUrl(e.target.value)}
                  required
                  className="flex-1 h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Button type="submit" isLoading={noteSaving} className="shrink-0">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Note
                </Button>
              </form>
            </div>

            {/* Notes list */}
            {myNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <StickyNote className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">No notes yet</h3>
                <p className="text-sm text-slate-400">Add a Google Drive link above to save your first note.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myNotes.map((note: any) => (
                  <div
                    key={note._id}
                    className="flex items-center justify-between gap-4 p-4 bg-white rounded-xl border border-surface-border hover:border-primary/30 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <StickyNote className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{note.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Added {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={note.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        title="Delete note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/classes"
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Classes
      </Link>

      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden shadow-sm">
        <div className="bg-sidebar p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BookOpen className="h-32 w-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-primary/20 text-primary-100 rounded-md border border-primary/30">
                  {cls.subjectCode}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 bg-white/10 rounded-md">
                  Sem {cls.semester} • Sec {cls.section}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{cls.subjectName}</h1>
              <p className="text-sidebar-300 text-sm opacity-80">
                {cls.department} • {cls.academicYear}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                onClick={() => setIsRosterOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Roster
              </Button>

              {user?.role === "Faculty" && (
                <Button
                  variant="primary"
                  onClick={handleCopyJoinLink}
                  className={
                    copiedCode
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : ""
                  }
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" /> Copy Join Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-surface-border bg-canvas-alt overflow-x-auto">
          <div className="flex min-w-max px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'marks') {
                    navigate(`/marks?classId=${classId || cls?._id || ''}`);
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary bg-surface"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-surface/50",
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 min-h-[400px]">{renderContent()}</div>
      </div>

      <RosterModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        students={cls.students || []}
        className={cls.subjectName}
      />
      <AddMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
        onSuccess={() => refetchTab("materials")}
      />
      <CreateAssignmentModal
        isOpen={isCreateAssignmentOpen}
        onClose={() => setIsCreateAssignmentOpen(false)}
        onSuccess={() => refetchTab("assignments")}
      />
      <AssignmentDetailsDrawer
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        assignment={selectedAssignment}
        submission={null}
        onSuccess={() => refetchTab("assignments")}
      />
      <CreateQuizModal
        isOpen={isCreateQuizOpen}
        onClose={() => setIsCreateQuizOpen(false)}
        onSuccess={() => refetchTab("quizzes")}
      />
      <QuizDetailsDrawer
        isOpen={!!selectedQuiz}
        onClose={() => setSelectedQuiz(null)}
        quiz={selectedQuiz}
        onSuccess={() => refetchTab("quizzes")}
      />
      <CreateNoticeModal
        isOpen={isCreateNoticeOpen}
        onClose={() => setIsCreateNoticeOpen(false)}
        onSuccess={() => refetchTab("notices")}
        classes={[cls]}
        initialClassId={cls._id || cls.id}
      />
    </div>
  );
}
