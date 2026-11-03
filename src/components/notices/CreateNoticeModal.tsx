import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useState } from 'react';
import api from '../../services/api';

const createNoticeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  classId: z.string().min(1, 'Please select a class'),
});

type CreateNoticeFormValues = z.infer<typeof createNoticeSchema>;

interface CreateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  classes: any[];
  initialClassId?: string;
}

export function CreateNoticeModal({ isOpen, onClose, onSuccess, classes, initialClassId }: CreateNoticeModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoticeFormValues>({
    resolver: zodResolver(createNoticeSchema),
    defaultValues: {
      classId: initialClassId || '',
    },
  });

  const onSubmit = async (data: CreateNoticeFormValues) => {
    setServerError(null);
    try {
      await api.post('/notices', data);
      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError('Failed to create notice. Please try again.');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Notice">
      {serverError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Notice Title"
          placeholder="e.g. Mid-Semester Exam Rescheduled"
          {...register('title')}
          error={errors.title?.message}
        />
        
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Notice Content</label>
          <textarea
            className={`w-full px-3 py-2 border rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 transition-shadow resize-none h-32 ${
              errors.content
                ? 'border-red-300 focus:border-red-400 focus:ring-red-200/50'
                : 'border-slate-200 focus:border-primary focus:ring-primary/20'
            }`}
            placeholder="Type your announcement here..."
            {...register('content')} id="content"
          />
          {errors.content && (
            <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Select Class & Semester</label>
          <select
            className={`w-full px-3 py-2 border rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 transition-shadow ${
              errors.classId
                ? 'border-red-300 focus:border-red-400 focus:ring-red-200/50'
                : 'border-slate-200 focus:border-primary focus:ring-primary/20 bg-white'
            }`}
            {...register('classId')} id="classId"
          >
            <option value="">Select a class...</option>
            {classes.map((cls) => (
              <option key={cls._id || cls.id} value={cls._id || cls.id}>
                {cls.subjectName} ({cls.subjectCode}) - Semester: {cls.semester}
              </option>
            ))}
          </select>
          {errors.classId && (
            <p className="text-sm text-red-500 mt-1">{errors.classId.message}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Only students enrolled in this specific class and semester will see the notice.
          </p>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Publish Notice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
