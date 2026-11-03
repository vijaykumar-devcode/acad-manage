import { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Search, UserCircle2 } from 'lucide-react';

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  className: string;
}

export function RosterModal({ isOpen, onClose, students, className }: RosterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student => {
      const sName = student.name || '';
      const sRoll = student.rollNo || student.rollNumber || '';
      return sName.toLowerCase().includes(searchQuery.toLowerCase()) || 
             sRoll.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [students, searchQuery]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Students - ${className}`}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search students by name or roll number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredStudents.length > 0 ? (
            filteredStudents.map(student => (
              <div key={student._id || student.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:bg-canvas-alt transition-colors">
                {student.avatarUrl ? (
                  <img src={student.avatarUrl} alt={student.name} className="h-10 w-10 rounded-full bg-canvas shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-900 truncate">{student.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{student.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-canvas-alt border border-surface-border text-slate-700">
                    {student.rollNo || 'N/A'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <UserCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No students found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
