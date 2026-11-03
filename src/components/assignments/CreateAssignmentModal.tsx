import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';
import { IconPicker } from '../common/IconPicker';
import { RenderIcon } from '../common/RenderIcon';

const assignmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description is required'),
  instructions: z.string().optional(),
  classId: z.string().min(1, 'Please select a class'),
  dueDate: z.string().min(1, 'Due date is required'),
  maxMarks: z.string().min(1, 'Total marks must be provided'),
  submissionType: z.enum(['Online', 'Offline', 'PDF']),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAssignmentModal({ isOpen, onClose, onSuccess }: CreateAssignmentModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      submissionType: 'Online',
      iconName: 'FileText',
      iconColor: '#2563eb'
    }
  });

  const selectedIconName = watch('iconName');
  const selectedIconColor = watch('iconColor');

  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/classes')
        .then(res => setClasses(res.data.data || res.data || []))
        .catch(console.error);
    }
  }, [isOpen]);

  const onSubmit = async (data: AssignmentFormValues) => {
    setServerError(null);
    try {
      const payload = {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
        maxMarks: Number(data.maxMarks)
      };
      await api.post('/assignments', payload);
      alert('Assignment created successfully!');
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      if (error.response?.data?.message) {
        setServerError(error.response.data.message);
      } else {
        setServerError('Failed to create assignment');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Assignment" className="max-w-2xl">
      {serverError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Assignment Title"
              placeholder="e.g. Midterm Project"
              {...register('title')}
              error={errors.title?.message}
            />
          </div>
          <div className="shrink-0 mb-[2px]">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsIconPickerOpen(true)}
              title="Select Icon"
              className="h-10 px-3"
            >
              <RenderIcon name={selectedIconName} color={selectedIconColor} className="w-5 h-5 mr-2" />
              Icon
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className="flex w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Provide clear instructions for the assignment..." id="description"
          />
          {errors.description && <p className="text-sm text-red-500 font-medium">{errors.description.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Instructions (Optional)</label>
          <textarea
            {...register('instructions')}
            rows={3}
            className="flex w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Specific submission guidelines or tips..." id="instructions"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Class</label>
            <select 
              {...register('classId')}
              className="flex h-10 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" id="classId"
            >
              <option value="">Select a class...</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>{cls.subjectName} ({cls.subjectCode})</option>
              ))}
            </select>
            {errors.classId && <p className="text-sm text-red-500 font-medium">{errors.classId.message}</p>}
          </div>

          <Input
            label="Due Date & Time"
            type="datetime-local"
            {...register('dueDate')}
            error={errors.dueDate?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Total Marks"
            type="number"
            min="1"
            placeholder="e.g. 100"
            {...register('maxMarks')}
            error={errors.maxMarks?.message}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Submission Type</label>
            <select 
              {...register('submissionType')}
              className="flex h-10 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" id="submissionType"
            >
              <option value="Online">Online Text</option>
              <option value="PDF">PDF Upload</option>
              <option value="Offline">Offline / In-Class</option>
            </select>
            {errors.submissionType && <p className="text-sm text-red-500 font-medium">{errors.submissionType.message}</p>}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Assignment
          </Button>
        </div>
      </form>

      <IconPicker 
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(name, color) => {
          setValue('iconName', name);
          setValue('iconColor', color);
        }}
        initialIcon={selectedIconName}
        initialColor={selectedIconColor}
      />
    </Modal>
  );
}
