import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import api from '../../services/api';

const materialSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  classId: z.string().min(1, 'Please select a class'),
  gDriveUrl: z.string().url('Must be a valid URL'),
  description: z.string().min(1, 'Description is required'),
  fileSize: z.string().min(1, 'File size is required'),
  fileType: z.enum(['PDF', 'DOC', 'PPT', 'ZIP', 'Code']),
  tags: z.string().min(1, 'At least one tag is required (comma separated)'),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddMaterialModal({ isOpen, onClose, onSuccess }: AddMaterialModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
  });

  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/classes').then(res => setClasses(res.data.data)).catch(console.error);
    }
  }, [isOpen]);

  const onSubmit = async (data: MaterialFormValues) => {
    try {
      const payload = {
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      await api.post('/materials', payload);
      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Study Material" className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            placeholder="e.g. Chapter 4 Notes"
            {...register('title')}
            error={errors.title?.message}
          />
          
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
        </div>

        <Input
          label="Google Drive URL"
          placeholder="https://drive.google.com/file/d/..."
          {...register('gDriveUrl')}
          error={errors.gDriveUrl?.message}
        />
        <p className="text-xs text-slate-500 -mt-2">Ensure the link visibility is set to "Anyone with the link".</p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="flex w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Brief description of the material..." id="description"
          />
          {errors.description && <p className="text-sm text-red-500 font-medium">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="File Size"
            placeholder="e.g. 2.5 MB"
            {...register('fileSize')}
            error={errors.fileSize?.message}
          />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">File Type</label>
            <select 
              {...register('fileType')}
              className="flex h-10 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" id="fileType"
            >
              <option value="PDF">PDF</option>
              <option value="DOC">Word / DOC</option>
              <option value="PPT">PowerPoint / PPT</option>
              <option value="ZIP">Archive / ZIP</option>
              <option value="Code">Source Code</option>
            </select>
            {errors.fileType && <p className="text-sm text-red-500 font-medium">{errors.fileType.message}</p>}
          </div>

          <Input
            label="Tags"
            placeholder="DB, SQL, Basics"
            {...register('tags')}
            error={errors.tags?.message}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Add Material
          </Button>
        </div>
      </form>
    </Modal>
  );
}
