import React from "react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import { GraduationCap } from "lucide-react";

export interface ResultHeaderData {
  collegeName: string;
  subjectName?: string;
  subjectCode?: string;
  semester?: string;
  section?: string;
  academicYear?: string;
  instructorName?: string;
  isEditingCollege?: boolean;
  onCollegeNameChange?: (name: string) => void;
  onEditToggle?: (editing: boolean) => void;
}

interface ResultTableProps {
  data: any[];
  gradeRules: any[];
  isFaculty: boolean;
  showClassContext?: boolean; // If true, shows Subject Name column
  headerData?: ResultHeaderData;
  sheetType?: 'mid-sem' | 'end-sem' | 'full';
}



export const ResultTable: React.FC<ResultTableProps> = ({
  data,
  gradeRules,
  isFaculty,
  showClassContext = false,
  headerData,
  sheetType = 'full',
}) => {
  const { user } = useAuthStore();
  const getDynamicGradeFromPercentage = (percentage: number): string => {
    if (gradeRules.length === 0) {
      if (percentage >= 90) return "A+";
      if (percentage >= 80) return "A";
      if (percentage >= 70) return "B";
      if (percentage >= 60) return "C";
      if (percentage >= 50) return "D";
      return "F";
    }
    const matched = gradeRules.find(
      (r) => percentage >= r.minPercentage && percentage <= r.maxPercentage,
    );
    if (matched) return matched.grade;

    const sorted = [...gradeRules].sort(
      (a, b) => b.minPercentage - a.minPercentage,
    );
    const closest = sorted.find((r) => percentage >= r.minPercentage);
    return closest ? closest.grade : "F";
  };

  const userRoll = user?.rollNumber || user?.rollNo;
  const displayData = data;

  if (displayData.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
        <p>No results available to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {headerData && (
        <div className="text-center mb-10 border-b-2 border-slate-900 pb-8 relative">
          <div className="absolute top-0 left-0">
            <div className="h-16 w-16 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <GraduationCap className="h-10 w-10" />
            </div>
          </div>

          <div className="px-20">
            {headerData.isEditingCollege && isFaculty ? (
              <input
                type="text"
                value={headerData.collegeName}
                onChange={(e) =>
                  headerData.onCollegeNameChange?.(e.target.value)
                }
                onBlur={() => headerData.onEditToggle?.(false)}
                autoFocus
                className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center border-b-2 border-slate-900 bg-transparent outline-none w-full max-w-2xl"
              />
            ) : (
              <h1
                className={cn(
                  "text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase inline-block",
                  isFaculty &&
                    headerData.onEditToggle &&
                    "cursor-pointer hover:bg-slate-100 px-4 rounded",
                )}
                onClick={() => isFaculty && headerData.onEditToggle?.(true)}
              >
                {headerData.collegeName}
              </h1>
            )}
            <h2 className="text-xl font-bold text-slate-700 uppercase tracking-widest mt-2">
              {" "}
              Result Sheet
            </h2>

            {(headerData.subjectName || headerData.academicYear) && (
              <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-600 bg-slate-100 px-6 py-3 rounded-lg border border-slate-200">
                {headerData.academicYear && (
                  <span>
                    Academic Year:{" "}
                    <strong className="text-slate-900">
                      {headerData.academicYear}
                    </strong>
                  </span>
                )}
                {headerData.subjectName && (
                  <span>
                    Course:{" "}
                    <strong className="text-slate-900">
                      {headerData.subjectName}{" "}
                      {headerData.subjectCode
                        ? `(${headerData.subjectCode})`
                        : ""}
                    </strong>
                  </span>
                )}
                {headerData.semester && (
                  <span>
                    Semester:{" "}
                    <strong className="text-slate-900">
                      {headerData.semester}
                    </strong>
                  </span>
                )}
                {headerData.section && (
                  <span>
                    Section:{" "}
                    <strong className="text-slate-900">
                      {headerData.section}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse min-w-200">
          <thead className="text-xs uppercase bg-slate-800 text-white print:bg-transparent print:text-black print:border-b-2">
            <tr>
              <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold w-24">Roll No</th>
              <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold">Student Name</th>
              {showClassContext && (
                <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold">Subject</th>
              )}
              {sheetType === 'full' && (
                <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center w-20">Internal<br/>{!showClassContext && <span className="text-[10px] text-slate-400 print:text-black">({displayData[0]?.maxMarks?.internal || 40})</span>}</th>
              )}
              {(sheetType === 'full' || sheetType === 'mid-sem') && (
                <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center w-20">Mid Sem<br/>{!showClassContext && <span className="text-[10px] text-slate-400 print:text-black">({displayData[0]?.maxMarks?.midSem || 30})</span>}</th>
              )}
              {(sheetType === 'full' || sheetType === 'end-sem') && (
                <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center w-20">End Sem<br/>{!showClassContext && <span className="text-[10px] text-slate-400 print:text-black">({displayData[0]?.maxMarks?.endSem || 80})</span>}</th>
              )}
              {sheetType === 'full' && (
                <>
                  <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center bg-slate-700 print:bg-transparent w-24">Theory Total<br/>{!showClassContext && <span className="text-[10px] text-slate-300 print:text-black">({(displayData[0]?.maxMarks?.internal || 40) + (displayData[0]?.maxMarks?.midSem || 30) + (displayData[0]?.maxMarks?.endSem || 80)})</span>}</th>
                  <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center w-24">Theory Grade</th>
                  <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center w-20">Lab<br/>{!showClassContext && <span className="text-[10px] text-slate-400 print:text-black">({displayData[0]?.maxMarks?.lab || 40})</span>}</th>
                  <th className="border border-slate-700 print:border-slate-300 px-4 py-3 font-semibold text-center w-24">Lab Grade</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, idx) => {
              const rowMaxInternal = row.maxMarks?.internal || 40;
              const rowMaxMidSem = row.maxMarks?.midSem || 30;
              const rowMaxEndSem = row.maxMarks?.endSem || 80;
              const rowMaxLab = row.maxMarks?.lab || 40;
              const theoryTotal = rowMaxInternal + rowMaxMidSem + rowMaxEndSem;
              const isHighlight = userRoll === String(row.rollNo);

              const rowTheory = row.internalMarks + row.midSemMarks + row.endSemMarks;
              const theoryPercentage = theoryTotal > 0 ? (rowTheory / theoryTotal) * 100 : 0;
              const theoryGrade = getDynamicGradeFromPercentage(theoryPercentage);
              
              const labPercentage = rowMaxLab > 0 ? (row.labMarks / rowMaxLab) * 100 : 0;
              const labGrade = getDynamicGradeFromPercentage(labPercentage);

              const rowKey = `${row.rollNo}-${row.classId || idx}`;

              return (
                <tr
                  key={rowKey}
                  className={cn(
                    "border-b border-slate-300",
                    !isFaculty && row.rollNo === userRoll
                      ? "bg-blue-50 font-semibold print:bg-transparent"
                      : "hover:bg-slate-50",
                  )}
                >
                  <td className="border border-slate-300 px-4 py-3">
                    {row.rollNo}
                  </td>
                  <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-slate-600">{row.name}</td>
                  {showClassContext && (
                    <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-slate-600">
                      {row.className} <span className="text-xs text-slate-400 block">{row.classCode}</span>
                    </td>
                  )}
                  {sheetType === 'full' && (
                    <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center text-slate-700 font-medium">{row.internalMarks}</td>
                  )}
                  {(sheetType === 'full' || sheetType === 'mid-sem') && (
                    <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center text-slate-700 font-medium">{row.midSemMarks}</td>
                  )}
                  {(sheetType === 'full' || sheetType === 'end-sem') && (
                    <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center text-slate-700 font-medium">{row.endSemMarks}</td>
                  )}
                  {sheetType === 'full' && (
                    <>
                      <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center font-bold text-slate-800 bg-slate-50 print:bg-transparent">
                        {rowTheory}
                      </td>
                      <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center font-bold">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm",
                          theoryGrade === 'F' ? "text-red-700 bg-red-100" : "text-slate-700"
                        )}>
                          {theoryGrade}
                        </span>
                      </td>
                      <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center text-slate-700 font-medium">{row.labMarks}</td>
                      <td className="border border-slate-200 print:border-slate-300 px-4 py-3 text-center font-bold">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm",
                          labGrade === 'F' ? "text-red-700 bg-red-100" : "text-slate-700"
                        )}>
                          {labGrade}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {headerData && !showClassContext && (
        <div className="mt-20 flex justify-between items-center text-sm font-semibold text-slate-800">
          <div className="text-center">
            <div className="w-48 border-b-2 border-slate-400 mb-2"></div>
            <p>Course Instructor</p>
            <p className="text-xs font-normal text-slate-500 mt-1">
              {headerData.instructorName || "Faculty Member"}
            </p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b-2 border-slate-400 mb-2"></div>
            <p>Head of Department</p>
          </div>
        </div>
      )}
    </div>
  );
};
