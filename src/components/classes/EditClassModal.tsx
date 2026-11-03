import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';
import { IconPicker } from '../common/IconPicker';
import { RenderIcon } from '../common/RenderIcon';

const editClassSchema = z.object({
  subjectName: z.string().min(3, 'Subject Name must be at least 3 characters'),
  subjectCode: z.string().min(2, 'Subject Code is required'),
  department: z.string().min(2, 'Department is required'),
  semester: z.string().min(1, 'Semester is required'),
  section: z.string().min(1, 'Section is required'),
  academicYear: z.string().min(4, 'Academic Year is required'),
});

type EditClassFormValues = z.infer<typeof editClassSchema>;

interface EditClassModalProps {
  isOpen: boolean;
  classData: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditClassModal({ isOpen, classData, onClose, onSuccess }: EditClassModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [iconName, setIconName] = useState('BookOpen');
  const [iconColor, setIconColor] = useState('#2563eb');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassSchema),
  });

  // Pre-fill form whenever the selected class changes
  useEffect(() => {
    if (classData) {
      reset({
        subjectName: classData.subjectName || '',
        subjectCode: classData.subjectCode || '',
        department: classData.department || '',
        semester: String(classData.semester || ''),
        section: classData.section || '',
        academicYear: classData.academicYear || '',
      });
      setIconName(classData.iconName || 'BookOpen');
      setIconColor(classData.iconColor || '#2563eb');
    }
  }, [classData, reset]);

  const onSubmit = async (data: EditClassFormValues) => {
    setServerError(null);
    try {
      const payload = { ...data, iconName, iconColor };
      await api.patch(`/classes/${classData._id || classData.id}`, payload);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to update class. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Class">
      {serverError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Subject Name"
              placeholder="e.g. Database Management Systems"
              {...register('subjectName')}
              error={errors.subjectName?.message}
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
              <RenderIcon name={iconName} color={iconColor} className="w-5 h-5 mr-2" />
              Icon
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Subject Code"
            placeholder="e.g. CS301"
            {...register('subjectCode')}
            error={errors.subjectCode?.message}
          />
          <Input
            label="Department"
            placeholder="e.g. Computer Science"
            {...register('department')}
            error={errors.department?.message}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Semester"
            placeholder="e.g. 5th"
            {...register('semester')}
            error={errors.semester?.message}
          />
          <Input
            label="Section"
            placeholder="e.g. A"
            {...register('section')}
            error={errors.section?.message}
          />
          <Input
            label="Academic Year"
            placeholder="e.g. 2023-24"
            {...register('academicYear')}
            error={errors.academicYear?.message}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>

      <IconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(name, color) => {
          setIconName(name);
          setIconColor(color);
        }}
        initialIcon={iconName}
        initialColor={iconColor}
      />
    </Modal>
  );
}
