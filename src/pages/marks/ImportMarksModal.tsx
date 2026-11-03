import React, { useState, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface ImportMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  students: any[];
  onSuccess: () => void;
}

interface ParsedRecord {
  studentId: string;
  rollNo: string;
  name: string;
  internalMarks: number | null;
  midSemMarks: number | null;
  endSemMarks: number | null;
  labMarks: number | null;
  isValid: boolean;
  error?: string;
}

export function ImportMarksModal({ isOpen, onClose, classId, students, onSuccess }: ImportMarksModalProps) {
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    // Generate CSV template
    const headers = ['Roll Number', 'Name', 'Internal Marks', 'Mid-Sem Marks', 'End-Sem Marks', 'Lab Marks'];
    const rows = students.map(s => [
      s.rollNo || s.rollNumber,
      `"${s.name}"`, // Quote name in case of commas
      '', // Internal
      '', // Mid-Sem
      '', // End-Sem
      ''  // Lab
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'marks_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseCSV(text);
      } catch (error) {
        toast.error('Failed to parse CSV file');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      toast.error('File must contain a header and at least one row of data.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indexes
    const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
    
    const rollNoIdx = getIdx(['roll']);
    const nameIdx = getIdx(['name']);
    const internalIdx = getIdx(['internal']);
    const midSemIdx = getIdx(['mid']);
    const endSemIdx = getIdx(['end']);
    const labIdx = getIdx(['lab']);

    if (rollNoIdx === -1) {
      toast.error('Could not find "Roll Number" column in CSV.');
      return;
    }

    const records: ParsedRecord[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      // Handle quoted names safely (basic parse)
      const parts: string[] = [];
      let inQuotes = false;
      let currentPart = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(currentPart);
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      parts.push(currentPart); // Push last part

      const rollNo = parts[rollNoIdx]?.trim();
      const name = nameIdx !== -1 ? parts[nameIdx]?.trim() : '';
      
      if (!rollNo) continue;

      const parseMark = (idx: number, max: number) => {
        if (idx === -1) return null;
        const val = parts[idx]?.trim();
        if (!val) return null;
        const num = Number(val);
        if (isNaN(num)) return undefined; // Error state
        if (num < 0 || num > max) return undefined;
        return num;
      };

      const internal = parseMark(internalIdx, 20);
      const midSem = parseMark(midSemIdx, 30);
      const endSem = parseMark(endSemIdx, 50);
      const lab = parseMark(labIdx, 100);

      // Find corresponding student ID
      const student = students.find(s => (s.rollNo || s.rollNumber) === rollNo);

      let isValid = true;
      let error = undefined;

      if (!student) {
        isValid = false;
        error = 'Student not found in this class';
      } else if (internal === undefined || midSem === undefined || endSem === undefined || lab === undefined) {
        isValid = false;
        error = 'Invalid marks (out of bounds or not a number)';
      }

      records.push({
        studentId: student?.id || student?._id || '',
        rollNo,
        name: student?.name || name,
        internalMarks: internal === undefined ? null : internal,
        midSemMarks: midSem === undefined ? null : midSem,
        endSemMarks: endSem === undefined ? null : endSem,
        labMarks: lab === undefined ? null : lab,
        isValid,
        error
      });
    }

    setParsedData(records);
  };

  const handleImport = async () => {
    const validRecords = parsedData.filter(r => r.isValid && r.studentId);
    
    if (validRecords.length === 0) {
      toast.error('No valid records to import.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRecords.map(r => ({
        studentId: r.studentId,
        classId: classId,
        internalMarks: r.internalMarks,
        midSemMarks: r.midSemMarks,
        endSemMarks: r.endSemMarks,
        labMarks: r.labMarks
      }));

      await api.post('/marks/import', payload);
      toast.success('Marks imported successfully!');
      onSuccess();
      onClose();
      setParsedData([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to import marks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetImport = () => {
    setParsedData([]);
  };

  // Prevent closing when submitting
  const handleClose = () => {
    if (!isSubmitting) {
      setParsedData([]);
      onClose();
    }
  };

  const invalidCount = parsedData.filter(r => !r.isValid).length;
  const validCount = parsedData.filter(r => r.isValid).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Marks" className="max-w-4xl">
      <div className="space-y-6">
        {parsedData.length === 0 ? (
          <>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
              <div className="text-sm">
                <p className="font-semibold mb-1">How to import marks:</p>
                <ol className="list-decimal ml-4 space-y-1 text-blue-700">
                  <li>Download the CSV template below.</li>
                  <li>Fill in the marks for students (leave blank if not yet available).</li>
                  <li>Upload the saved CSV file.</li>
                  <li>Review the parsed data before finalizing.</li>
                </ol>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleDownloadTemplate} className="bg-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
                
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button onClick={() => fileInputRef.current?.click()} isLoading={isParsing}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Filled CSV
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center max-w-sm">
                Only .csv files are supported. Max marks: Internal (20), Mid-Sem (30), End-Sem (50), Lab (100).
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Preview Import Data</h3>
                <p className="text-sm text-slate-500">
                  Found <span className="font-medium text-emerald-600">{validCount} valid</span> and <span className="font-medium text-red-600">{invalidCount} invalid</span> records.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={resetImport} disabled={isSubmitting}>
                Upload Different File
              </Button>
            </div>

            <div className="border border-surface-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-canvas-alt uppercase sticky top-0 border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-center">Internal</th>
                    <th className="px-4 py-3 text-center">Mid-Sem</th>
                    <th className="px-4 py-3 text-center">End-Sem</th>
                    <th className="px-4 py-3 text-center">Lab</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className={cn("border-b border-surface-border last:border-0", !row.isValid && "bg-red-50/50")}>
                      <td className="px-4 py-3 font-medium">{row.rollNo}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 text-center">{row.internalMarks !== null ? row.internalMarks : '-'}</td>
                      <td className="px-4 py-3 text-center">{row.midSemMarks !== null ? row.midSemMarks : '-'}</td>
                      <td className="px-4 py-3 text-center">{row.endSemMarks !== null ? row.endSemMarks : '-'}</td>
                      <td className="px-4 py-3 text-center">{row.labMarks !== null ? row.labMarks : '-'}</td>
                      <td className="px-4 py-3">
                        {row.isValid ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="text-red-600 text-xs font-medium" title={row.error}>
                            {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
              <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isSubmitting}
                isLoading={isSubmitting}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {validCount} Records
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
