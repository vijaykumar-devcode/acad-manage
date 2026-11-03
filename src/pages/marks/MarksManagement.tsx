import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ImportMarksModal } from "./ImportMarksModal";

import {
  ClipboardList,
  Users,
  Clock,
  CheckCircle2,
  Search,
  Upload,
  Info,
} from "lucide-react";
import { cn } from "../../lib/utils";

type TabType = "Internal" | "Mid-Sem" | "End-Sem" | "Lab";

export function MarksManagement() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClassId = searchParams.get("classId");
  
  const [selectedClassId, setSelectedClassId] = useState<string>(queryClassId || "");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("Internal");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxMarksMap, setMaxMarksMap] = useState<Record<string, number>>({
    Internal: 20,
    "Mid-Sem": 30,
    "End-Sem": 50,
    Lab: 100,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Local state for edits
  const [localMarks, setLocalMarks] = useState<
    Record<string, { value: string; error?: string }>
  >({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [markRecords, setMarkRecords] = useState<any[]>([]);
  const [extraMarks, setExtraMarks] = useState<Record<string, any>>({});

  const fetchClasses = async () => {
    try {
      const res = await api.get("/classes");
      const d = res.data?.data || res.data;
      setClasses(Array.isArray(d) ? d : []);
    } catch (error) {}
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const facultyClasses = useMemo(() => {
    return classes.filter((c) => {
      const classFacultyId = c.facultyId?._id || c.facultyId?.id || c.facultyId;
      const userId = user?.id || (user as any)?._id;
      return (
        classFacultyId === userId ||
        classFacultyId?.toString() === userId?.toString()
      );
    });
  }, [user, classes]);

  const semesters = useMemo(() => {
    const sems = new Set<string>();
    facultyClasses.forEach((c) => {
      if (c.semester) sems.add(c.semester);
    });
    return Array.from(sems).sort();
  }, [facultyClasses]);

  const filteredFacultyClasses = useMemo(() => {
    if (!selectedSemester) return facultyClasses;
    return facultyClasses.filter((c) => c.semester === selectedSemester);
  }, [facultyClasses, selectedSemester]);

  useEffect(() => {
    if (classes.length > 0 && queryClassId) {
      const targetCls = classes.find((c) => (c.id || c._id) === queryClassId);
      if (targetCls) {
        setSelectedSemester(targetCls.semester || "");
        setSelectedClassId(queryClassId);
        
        // Remove from URL so it doesn't force re-select if the user changes classes later
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("classId");
        setSearchParams(newParams, { replace: true });
        return;
      }
    }

    if (filteredFacultyClasses.length > 0) {
      if (
        !selectedClassId ||
        !filteredFacultyClasses.find((c) => (c.id || c._id) === selectedClassId)
      ) {
        setSelectedClassId(
          filteredFacultyClasses[0].id || filteredFacultyClasses[0]._id,
        );
      }
    } else {
      setSelectedClassId("");
    }
  }, [filteredFacultyClasses, selectedClassId, classes, queryClassId, searchParams, setSearchParams]);

  const activeClass = useMemo(() => {
    return facultyClasses.find(
      (c) => c.id === selectedClassId || (c as any)._id === selectedClassId,
    );
  }, [facultyClasses, selectedClassId]);

  useEffect(() => {
    if (activeClass?.maxMarks) {
      setMaxMarksMap({
        Internal: activeClass.maxMarks.internal || 20,
        "Mid-Sem": activeClass.maxMarks.midSem || 30,
        "End-Sem": activeClass.maxMarks.endSem || 50,
        Lab: activeClass.maxMarks.lab || 100,
      });
    } else {
      setMaxMarksMap({
        Internal: 20,
        "Mid-Sem": 30,
        "End-Sem": 50,
        Lab: 100,
      });
    }
  }, [activeClass]);

  const fetchStudentsAndMarks = async () => {
    if (!selectedClassId) return;
    try {
      const res = await api.get(
        `/marks?classId=${selectedClassId}&category=${activeTab}`,
      );
      const data = res.data?.data;
      if (data) {
        setStudents(data.students || []);
        setMarkRecords(data.marks || []);
        setExtraMarks(data.extraMarks || {});
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchStudentsAndMarks();
  }, [selectedClassId, activeTab]);

  const filteredStudents = useMemo(() => {
    let result = students.filter(
      (s) =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.rollNo || s.rollNumber)
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );

    // Sort by roll number ascending
    result.sort((a, b) => {
      const aRoll = a.rollNo || a.rollNumber || "";
      const bRoll = b.rollNo || b.rollNumber || "";
      return aRoll.localeCompare(bRoll, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return result;
  }, [students, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, activeTab, searchQuery, selectedSemester]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Load initial marks into local state when class or tab changes
  useEffect(() => {
    if (!activeClass) return;

    const initialMarks: Record<string, { value: string; error?: string }> = {};
    students.forEach((student) => {
      const sId = student.id || student._id;
      const cId = activeClass.id || activeClass._id;
      const record = markRecords.find(
        (mr) =>
          (mr.studentId === sId || (mr.studentId as any)?._id === sId) &&
          (mr.classId === cId || (mr.classId as any)?._id === cId) &&
          mr.type === activeTab,
      );
      if (
        record &&
        record.marksObtained !== undefined &&
        record.marksObtained !== null
      ) {
        initialMarks[sId] = { value: record.marksObtained.toString() };
      } else if (
        activeTab === "Internal" &&
        extraMarks[sId]?.suggestedInternalScore !== undefined
      ) {
        initialMarks[sId] = {
          value: extraMarks[sId].suggestedInternalScore.toString(),
        };
      } else {
        initialMarks[sId] = { value: "" };
      }
    });
    setLocalMarks(initialMarks);

    // Select first student for preview if none selected
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id || students[0]._id);
    }
  }, [activeClass, activeTab, students, markRecords, extraMarks]);

  const handleMarkChange = (studentId: string, value: string) => {
    let error: string | undefined;

    const currentMax = maxMarksMap[activeTab] || 20;

    if (value.trim() !== "") {
      const numVal = Number(value);
      if (isNaN(numVal)) {
        error = "Must be a number";
      } else if (numVal > currentMax) {
        error = `Marks cannot exceed ${currentMax}`;
      } else if (numVal < 0) {
        error = "Cannot be negative";
      }
    }

    setLocalMarks((prev) => ({
      ...prev,
      [studentId]: { value, error },
    }));
    setSelectedStudentId(studentId);
  };

  const hasErrors = useMemo(() => {
    return Object.values(localMarks).some((m) => m.error !== undefined);
  }, [localMarks]);

  const handleSaveAll = async () => {
    if (hasErrors || !activeClass) return;

    const payload = Object.entries(localMarks).map(([studentId, data]) => ({
      studentId,
      classId: activeClass.id || (activeClass as any)._id,
      type: activeTab,
      marksObtained: data.value.trim() === "" ? null : Number(data.value),
      maxMarks: maxMarksMap[activeTab] || 20,
      status: data.value.trim() === "" ? "Pending" : "Entered",
    }));

    try {
      await api.post("/marks/bulk", { records: payload });
      alert("Marks saved successfully!");
      fetchStudentsAndMarks();
    } catch (err) {
      console.error(err);
      alert("Failed to save marks");
    }
  };

  // Preview logic
  const getPreviewMarks = (studentId: string, type: TabType) => {
    // If it's the active tab, use local state first
    if (
      type === activeTab &&
      localMarks[studentId] &&
      !localMarks[studentId].error &&
      localMarks[studentId].value !== ""
    ) {
      return Number(localMarks[studentId].value);
    }
    // Otherwise look up in mock data
    const record = markRecords.find(
      (r) =>
        (r.studentId === studentId || r.studentId?._id === studentId) &&
        (r.classId === activeClass?.id ||
          r.classId?._id === (activeClass as any)?._id) &&
        r.type === type,
    );
    return record?.marksObtained || 0;
  };

  const selectedStudent = students.find(
    (u) => u.id === selectedStudentId || u._id === selectedStudentId,
  );
  const internal = selectedStudent
    ? getPreviewMarks(selectedStudent.id || selectedStudent._id, "Internal")
    : 0;
  const midSem = selectedStudent
    ? getPreviewMarks(selectedStudent.id || selectedStudent._id, "Mid-Sem")
    : 0;
  const endSem = selectedStudent
    ? getPreviewMarks(selectedStudent.id || selectedStudent._id, "End-Sem")
    : 0;
  const lab = selectedStudent
    ? getPreviewMarks(selectedStudent.id || selectedStudent._id, "Lab")
    : 0;
  const totalPreview = internal + midSem + endSem + lab;
  const totalMaxMarks =
    (maxMarksMap["Internal"] || 20) +
    (maxMarksMap["Mid-Sem"] || 30) +
    (maxMarksMap["End-Sem"] || 50) +
    (maxMarksMap["Lab"] || 100);

  const handleMaxMarksChange = async (val: number) => {
    setMaxMarksMap((prev) => ({ ...prev, [activeTab]: val }));
    if (!activeClass) return;

    const maxMarksPayload = {
      internal: activeTab === "Internal" ? val : maxMarksMap["Internal"],
      midSem: activeTab === "Mid-Sem" ? val : maxMarksMap["Mid-Sem"],
      endSem: activeTab === "End-Sem" ? val : maxMarksMap["End-Sem"],
      lab: activeTab === "Lab" ? val : maxMarksMap["Lab"],
    };

    try {
      await api.put(`/classes/${activeClass.id || activeClass._id}/max-marks`, {
        maxMarks: maxMarksPayload,
      });
      // We don't necessarily need to refresh the classes list just for this background update
    } catch (error) {
      console.error("Failed to update max marks", error);
    }
  };

  // Stats
  const pendingCount = useMemo(() => {
    if (!activeClass) return 0;
    return students.filter((s) => {
      const sId = s.id || s._id;
      const cId = activeClass.id || activeClass._id;
      const internalRec = markRecords.find(
        (r) =>
          (r.studentId === sId || (r.studentId as any)?._id === sId) &&
          (r.classId === cId || (r.classId as any)?._id === cId) &&
          r.type === "Internal",
      );
      const midRec = markRecords.find(
        (r) =>
          (r.studentId === sId || (r.studentId as any)?._id === sId) &&
          (r.classId === cId || (r.classId as any)?._id === cId) &&
          r.type === "Mid-Sem",
      );
      const endRec = markRecords.find(
        (r) =>
          (r.studentId === sId || (r.studentId as any)?._id === sId) &&
          (r.classId === cId || (r.classId as any)?._id === cId) &&
          r.type === "End-Sem",
      );
      const labRec = markRecords.find(
        (r) =>
          (r.studentId === sId || (r.studentId as any)?._id === sId) &&
          (r.classId === cId || (r.classId as any)?._id === cId) &&
          r.type === "Lab",
      );
      return (
        (!internalRec?.marksObtained && internalRec?.marksObtained !== 0) ||
        (!midRec?.marksObtained && midRec?.marksObtained !== 0) ||
        (!endRec?.marksObtained && endRec?.marksObtained !== 0) ||
        (!labRec?.marksObtained && labRec?.marksObtained !== 0)
      );
    }).length;
  }, [activeClass, students, markRecords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Marks Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter and manage student academic marks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Classes"
          value={facultyClasses.length}
          icon={ClipboardList}
        />
        <StatCard title="Total Students" value={students.length} icon={Users} />
        <StatCard
          title="Pending Marks Entry"
          value={pendingCount}
          icon={Clock}
        />
        <StatCard
          title="Completed"
          value={students.length - pendingCount}
          icon={CheckCircle2}
        />
      </div>

      <div className="bg-surface p-4 rounded-xl border border-surface-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 w-full max-w-md flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="semester-select"
              className="text-xs font-medium text-slate-500 mb-1 block"
            >
              Semester
            </label>
            <select
              id="semester-select"
              name="semester-select"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="">All Semesters</option>
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label
              htmlFor="class-select"
              className="text-xs font-medium text-slate-500 mb-1 block"
            >
              Select Class
            </label>
            <select
              id="class-select"
              name="class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              disabled={filteredFacultyClasses.length === 0}
            >
              {filteredFacultyClasses.length === 0 ? (
                <option value="">No classes found</option>
              ) : (
                filteredFacultyClasses.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name || c.subjectName} - Section {c.section}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-100">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            Marks entered here are not visible to students. They will be used
            for generating Result Sheets.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            className="flex-1 md:flex-none"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" /> Import Marks
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Spreadsheet Area */}
        <div className="flex-1 bg-surface rounded-xl border border-surface-border overflow-hidden flex flex-col">
          {/* Tabs & Controls */}
          <div className="border-b border-surface-border">
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="flex">
                {(["Internal", "Mid-Sem", "End-Sem", "Lab"] as TabType[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
                      )}
                    >
                      {tab} Marks
                    </button>
                  ),
                )}
              </div>
              <div className="flex items-center gap-3 pr-4">
                <label
                  htmlFor="max-marks-input"
                  className="text-sm font-medium text-slate-600"
                >
                  Maximum Marks
                </label>
                <input
                  id="max-marks-input"
                  name="max-marks-input"
                  type="number"
                  value={maxMarksMap[activeTab] || 0}
                  onChange={(e) => handleMaxMarksChange(Number(e.target.value))}
                  className="w-16 h-8 text-center rounded-md border border-slate-300 text-sm focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="p-4 bg-canvas-alt flex gap-4 border-t border-surface-border">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <label htmlFor="marks-search" className="sr-only">
                  Search student
                </label>
                <input
                  id="marks-search"
                  name="marks-search"
                  type="text"
                  autoComplete="off"
                  placeholder="Search student by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar w-full">
            <table className="w-full text-sm text-left min-w-162.5">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 border-b border-surface-border z-10">
                <tr>
                  <th className="px-6 py-3 font-semibold">Roll No</th>
                  <th className="px-6 py-3 font-semibold">Student Name</th>
                  {activeTab === "Internal" ? (
                    <>
                      <th className="px-6 py-3 font-semibold text-center">
                        Assignments
                      </th>
                      <th className="px-6 py-3 font-semibold text-center">
                        Quizzes
                      </th>
                      <th className="px-6 py-3 font-semibold text-center">
                        Auto Total
                      </th>
                      <th className="px-6 py-3 font-semibold text-center">
                        Final Internal Marks
                      </th>
                    </>
                  ) : (
                    <th className="px-6 py-3 font-semibold text-center">
                      Marks (Out of {maxMarksMap[activeTab] || 20})
                    </th>
                  )}
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "Internal" ? 7 : 4}
                      className="text-center py-12 text-slate-500"
                    >
                      No students found.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const studentId = student.id || student._id;
                    const markData = localMarks[studentId] || { value: "" };
                    const isSelected = selectedStudentId === studentId;

                    return (
                      <tr
                        key={studentId}
                        onClick={() => setSelectedStudentId(studentId)}
                        className={cn(
                          "border-b border-surface-border transition-colors cursor-pointer",
                          isSelected ? "bg-primary/5" : "hover:bg-canvas/50",
                        )}
                      >
                        <td className="px-6 py-4 font-medium text-primary">
                          {student.rollNo || student.rollNumber}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {student.name}
                        </td>
                        {activeTab === "Internal" ? (
                          <>
                            <td className="px-6 py-4 text-center">
                              <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {extraMarks[studentId]?.assignmentMarks || 0} /{" "}
                                {extraMarks[studentId]?.assignmentMax || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {extraMarks[studentId]?.quizMarks || 0} /{" "}
                                {extraMarks[studentId]?.quizMax || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {extraMarks[studentId]
                                  ?.suggestedInternalScore || 0}{" "}
                                /{" "}
                                {extraMarks[studentId]?.suggestedInternalMax ||
                                  0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="relative">
                                  <input
                                    type="text"
                                    aria-label={`Marks for ${student.name}`}
                                    value={markData.value}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        studentId,
                                        e.target.value,
                                      )
                                    }
                                    className={cn(
                                      "w-20 h-9 px-3 rounded-md border text-sm text-center focus:outline-none focus:ring-1",
                                      markData.error
                                        ? "border-red-500 ring-red-500 bg-red-50 text-red-900"
                                        : "border-slate-300 focus:border-primary focus:ring-primary",
                                    )}
                                  />
                                  {markData.error && (
                                    <span className="absolute -bottom-5 left-0 text-[10px] text-red-500 whitespace-nowrap font-medium">
                                      {markData.error}
                                    </span>
                                  )}
                                </div>
                                <span className="text-slate-500 font-medium">
                                  / {maxMarksMap["Internal"] || 20}
                                </span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  aria-label={`Marks for ${student.name}`}
                                  value={markData.value}
                                  onChange={(e) =>
                                    handleMarkChange(studentId, e.target.value)
                                  }
                                  className={cn(
                                    "w-20 h-9 px-3 rounded-md border text-sm text-center focus:outline-none focus:ring-1",
                                    markData.error
                                      ? "border-red-500 ring-red-500 bg-red-50 text-red-900"
                                      : "border-slate-300 focus:border-primary focus:ring-primary",
                                  )}
                                />
                                {markData.error && (
                                  <span className="absolute -bottom-5 left-0 text-[10px] text-red-500 whitespace-nowrap font-medium">
                                    {markData.error}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 font-medium">
                                / {maxMarksMap[activeTab] || 20}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <Badge
                            variant={markData.value ? "success" : "warning"}
                          >
                            {markData.value ? "Entered" : "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-surface-border flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-sm text-slate-500">
                Showing{" "}
                {filteredStudents.length > 0
                  ? (currentPage - 1) * itemsPerPage + 1
                  : 0}{" "}
                to{" "}
                {Math.min(currentPage * itemsPerPage, filteredStudents.length)}{" "}
                of {filteredStudents.length} students
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1 || filteredStudents.length === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(filteredStudents.length / itemsPerPage),
                      ),
                    )
                  }
                  disabled={
                    currentPage >=
                      Math.ceil(filteredStudents.length / itemsPerPage) ||
                    filteredStudents.length === 0
                  }
                >
                  Next
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={hasErrors}
              className={cn(
                "transition-colors",
                hasErrors
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-primary hover:bg-primary-hover",
              )}
            >
              Save All Marks
            </Button>
          </div>
        </div>

        {/* Right Sidebar: Result Preparation Preview */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-surface-border">
              <h3 className="font-semibold text-slate-900">
                Result Preparation Preview
              </h3>
            </div>

            {selectedStudent ? (
              <div className="p-5">
                <div className="mb-4">
                  <p className="font-bold text-slate-900">
                    {selectedStudent.rollNo || selectedStudent.rollNumber} -{" "}
                    {selectedStudent.name}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">
                      Assignment Contribution
                    </span>
                    <span className="font-medium text-slate-800 bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100">
                      {selectedStudent
                        ? extraMarks[selectedStudent.id || selectedStudent._id]
                            ?.assignmentMarks || 0
                        : 0}{" "}
                      /{" "}
                      {selectedStudent
                        ? extraMarks[selectedStudent.id || selectedStudent._id]
                            ?.assignmentMax || 0
                        : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Quiz Contribution</span>
                    <span className="font-medium text-indigo-800 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                      {selectedStudent
                        ? extraMarks[selectedStudent.id || selectedStudent._id]
                            ?.quizMarks || 0
                        : 0}{" "}
                      /{" "}
                      {selectedStudent
                        ? extraMarks[selectedStudent.id || selectedStudent._id]
                            ?.quizMax || 0
                        : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">
                      Final Internal Marks
                    </span>
                    <span className="font-medium text-slate-900 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                      {internal} / {maxMarksMap["Internal"] || 20}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
                    <span className="text-slate-600">Mid-Sem Marks</span>
                    <span className="font-medium text-slate-900 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                      {midSem} / {maxMarksMap["Mid-Sem"] || 30}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">End-Sem Marks</span>
                    <span className="font-medium text-slate-900 bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                      {endSem} / {maxMarksMap["End-Sem"] || 50}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Lab Marks</span>
                    <span className="font-medium text-slate-900 bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100">
                      {lab} / {maxMarksMap["Lab"] || 100}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                    {totalPreview} / {totalMaxMarks}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <p>
                    This is a preview only. Final result will be published
                    through Results Management.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                Select a student from the list to view their result preview.
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl border border-surface-border p-5">
            <h4 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wider">
              Marks Entry Guide
            </h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Enter marks between 0 and maximum marks.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Red borders indicate invalid input that must be fixed before
                  saving.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Click <strong>Save All Marks</strong> to commit changes.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {activeClass && (
        <ImportMarksModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          classId={activeClass.id || (activeClass as any)._id}
          students={students}
          onSuccess={fetchStudentsAndMarks}
        />
      )}
    </div>
  );
}
