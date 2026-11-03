import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useState } from 'react';
import api from '../../services/api';

const uploadPYQSchema = z.object({
  department: z.string().min(2, 'Department is required'),
  semester: z.string().min(1, 'Semester is required'),
  subjectName: z.string().min(3, 'Subject Name is required'),
  subjectCode: z.string().min(2, 'Subject Code is required'),
  academicYear: z.string().min(4, 'Academic Year is required (e.g., 2023-2024)'),
  examType: z.enum(['Mid Semester', 'End Semester', 'Internal', 'Other']),
  description: z.string().optional(),
  gDriveUrl: z.string().url('Must be a valid Google Drive URL'),
  fileType: z.enum(['PDF', 'DOC', 'ZIP', 'Other']),
});

type UploadPYQFormValues = z.infer<typeof uploadPYQSchema>;

interface UploadPYQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadPYQModal({ isOpen, onClose, onSuccess }: UploadPYQModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadPYQFormValues>({
    resolver: zodResolver(uploadPYQSchema),
    defaultValues: {
      examType: 'End Semester',
      fileType: 'PDF'
    }
  });

  const onSubmit = async (data: UploadPYQFormValues) => {
    setServerError(null);
    try {
      await api.post('/pyq', data);
      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError('Failed to upload PYQ. Please try again.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Previous Year Question (PYQ)">
      {serverError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Department"
            placeholder="e.g. Computer Science"
            {...register('department')}
            error={errors.department?.message}
          />
          <Input
            label="Semester"
            placeholder="e.g. 5th"
            {...register('semester')}
            error={errors.semester?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Subject Name"
            placeholder="e.g. Data Structures"
            {...register('subjectName')}
            error={errors.subjectName?.message}
          />
          <Input
            label="Subject Code"
            placeholder="e.g. CS201"
            {...register('subjectCode')}
            error={errors.subjectCode?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Academic Year"
            placeholder="e.g. 2023-2024"
            {...register('academicYear')}
            error={errors.academicYear?.message}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Exam Type</label>
            <select
              className={`w-full px-3 py-2 border rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 transition-shadow ${
                errors.examType
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200/50'
                  : 'border-slate-200 focus:border-primary focus:ring-primary/20 bg-white'
              }`}
              {...register('examType')} id="examType"
            >
              <option value="Mid Semester">Mid Semester</option>
              <option value="End Semester">End Semester</option>
              <option value="Internal">Internal</option>
              <option value="Other">Other</option>
            </select>
            {errors.examType && (
              <p className="text-sm text-red-500 mt-1">{errors.examType.message}</p>
            )}
          </div>
        </div>

        <Input
          label="Google Drive URL"
          placeholder="https://drive.google.com/file/d/..."
          {...register('gDriveUrl')}
          error={errors.gDriveUrl?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">File Type</label>
            <select
              className="w-full px-3 py-2 border rounded-xl border-slate-200 shadow-sm text-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 bg-white"
              {...register('fileType')} id="fileType"
            >
              <option value="PDF">PDF</option>
              <option value="DOC">DOC / DOCX</option>
              <option value="ZIP">ZIP</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Input
            label="Notes / Description (Optional)"
            placeholder="Any extra context..."
            {...register('description')}
            error={errors.description?.message}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Upload PYQ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
