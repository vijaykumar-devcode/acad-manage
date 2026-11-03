import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { IconPicker } from '../common/IconPicker';
import { RenderIcon } from '../common/RenderIcon';

const quizDetailsSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  subject: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Please select a class'),
  durationMinutes: z.coerce.number().min(5, 'Duration must be at least 5 mins'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  instructions: z.string().optional(),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

const mcqSchema = z.object({
  questions: z.array(z.object({
    questionText: z.string().min(3, 'Question text is required'),
    options: z.array(z.string().min(1, 'Option cannot be empty')).length(4),
    correctOptionIndex: z.preprocess(
      (val) => (val === null || val === undefined || val === '' ? undefined : Number(val)),
      z.number({ message: "Please select a correct option" }).min(0).max(3)
    ),
    marks: z.coerce.number().min(0, 'Marks must be at least 0')
  })).min(1, 'At least one question is required')
});

type QuizDetailsFormValues = z.infer<typeof quizDetailsSchema>;
type MCQFormValues = z.infer<typeof mcqSchema>;

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateQuizModal({ isOpen, onClose, onSuccess }: CreateQuizModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [quizDetails, setQuizDetails] = useState<QuizDetailsFormValues | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [defaultMarks, setDefaultMarks] = useState<number>(1);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.get('/classes').then(res => {
        const classList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.classes || []);
        setClasses(classList);
      }).catch(() => {});
    }
  }, [isOpen]);

  const {
    register: registerDetails,
    handleSubmit: handleDetailsSubmit,
    watch: watchDetails,
    setValue: setDetailsValue,
    formState: { errors: detailsErrors }
  } = useForm<QuizDetailsFormValues>({
    resolver: zodResolver(quizDetailsSchema) as any,
    defaultValues: {
      shuffleQuestions: true,
      shuffleOptions: true,
      iconName: 'FileText',
      iconColor: '#2563eb'
    }
  });

  const selectedIconName = watchDetails('iconName');
  const selectedIconColor = watchDetails('iconColor');

  const {
    register: registerMCQ,
    control: mcqControl,
    handleSubmit: handleMCQSubmit,
    watch: watchMCQ,
    formState: { errors: mcqErrors, isSubmitting }
  } = useForm<MCQFormValues>({
    resolver: zodResolver(mcqSchema) as any,
    defaultValues: {
      questions: [{ questionText: '', options: ['', '', '', ''], correctOptionIndex: null as any, marks: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: mcqControl,
    name: 'questions'
  });

  const watchedQuestions = watchMCQ('questions');

  const onDetailsSave = (data: QuizDetailsFormValues) => {
    setQuizDetails(data);
    setStep(2);
  };

  const onFinalSubmit = async (mcqData: MCQFormValues) => {
    if (!quizDetails) return;
    try {
      const payload = {
        title: quizDetails.title,
        subject: quizDetails.subject,
        classId: quizDetails.classId,
        durationMinutes: Number(quizDetails.durationMinutes),
        startTime: quizDetails.startTime,
        endTime: quizDetails.endTime,
        instructions: quizDetails.instructions,
        shuffleQuestions: quizDetails.shuffleQuestions,
        shuffleOptions: quizDetails.shuffleOptions,
        iconName: quizDetails.iconName,
        iconColor: quizDetails.iconColor,
        totalMarks: mcqData.questions.reduce((sum, q) => sum + Number(q.marks || 1), 0),
        questions: mcqData.questions.map((q) => ({
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          marks: Number(q.marks || 1),
        })),
      };

      await api.post('/quizzes', payload);
      toast.success("Quiz created successfully!");
      onSuccess?.();
      onClose();
      setStep(1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save quiz");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { onClose(); setStep(1); }} 
      title={step === 1 ? 'Create Quiz - Details' : 'MCQ Question Builder'} 
      className={step === 2 ? 'max-w-4xl' : 'max-w-2xl'}
    >
      {step === 1 ? (
        <form onSubmit={handleDetailsSubmit(onDetailsSave as any)} className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <Input
                label="Quiz Title"
                placeholder="e.g. DBMS Midterm"
                {...registerDetails('title')}
                error={detailsErrors.title?.message}
              />
              <Input
                label="Subject"
                placeholder="e.g. Database Systems"
                {...registerDetails('subject')}
                error={detailsErrors.subject?.message}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <select 
                {...registerDetails('classId')}
                className="flex h-10 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" id="classId"
              >
                <option value="">Select a class...</option>
                {Array.isArray(classes) && classes.map(cls => (
                  <option key={cls._id || cls.id} value={cls._id || cls.id}>{cls.name || cls.subjectName || cls.className}</option>
                ))}
              </select>
              {detailsErrors.classId && <p className="text-sm text-red-500 font-medium">{detailsErrors.classId.message}</p>}
            </div>
            
            <Input
              label="Duration (Minutes)"
              type="number"
              {...registerDetails('durationMinutes')}
              error={detailsErrors.durationMinutes?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              {...registerDetails('startTime')}
              error={detailsErrors.startTime?.message}
            />
            <Input
              label="End Date & Time"
              type="datetime-local"
              {...registerDetails('endTime')}
              error={detailsErrors.endTime?.message}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Instructions (Optional)</label>
            <textarea
              {...registerDetails('instructions')}
              rows={3}
              className="flex w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Instructions for students..." id="instructions"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer" htmlFor="shuffleQuestions">
              <input 
                type="checkbox" 
                {...registerDetails('shuffleQuestions')} 
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" id="shuffleQuestions"
              />
              <span className="text-sm text-slate-700 font-medium">Shuffle Questions</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer" htmlFor="shuffleOptions">
              <input 
                type="checkbox" 
                {...registerDetails('shuffleOptions')} 
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" id="shuffleOptions"
              />
              <span className="text-sm text-slate-700 font-medium">Shuffle Options</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Continue to Builder</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMCQSubmit(onFinalSubmit as any)} className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-slate-600">Back to Details</span>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Default Marks per Question:</label>
              <input 
                type="number" 
                min="0" 
                step="0.01"
                value={defaultMarks}
                onChange={(e) => setDefaultMarks(Number(e.target.value))}
                className="w-20 h-9 px-2 rounded-md border border-surface-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            {fields.map((field, index) => (
              <div key={field.id} className="p-5 bg-canvas-alt border border-surface-border rounded-xl relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-900">Question {index + 1}</h4>
                  {fields.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <Input
                    label="Question Text"
                    placeholder="Enter the question..."
                    {...registerMCQ(`questions.${index}.questionText`)}
                    error={mcqErrors.questions?.[index]?.questionText?.message}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((optIdx) => {
                      const isCorrect = Number(watchedQuestions?.[index]?.correctOptionIndex) === optIdx;
                      return (
                        <div 
                          key={optIdx} 
                          className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                            isCorrect ? 'border-green-500 bg-green-50/50' : 'border-transparent hover:border-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            value={optIdx}
                            {...registerMCQ(`questions.${index}.correctOptionIndex`)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300" id="questions-dynamic-correctOptionIndex"
                          />
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            {...registerMCQ(`questions.${index}.options.${optIdx}`)}
                            className="flex-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {mcqErrors.questions?.[index]?.correctOptionIndex && (
                    <p className="text-sm text-red-500 font-medium">{mcqErrors.questions[index].correctOptionIndex.message}</p>
                  )}

                  <div className="w-1/3">
                    <Input
                      label="Marks"
                      type="number"
                      step="0.01"
                      min="0"
                      {...registerMCQ(`questions.${index}.marks`)}
                      error={mcqErrors.questions?.[index]?.marks?.message}
                    />
                  </div>
                </div>
              </div>
            ))}
            {mcqErrors.questions?.root && (
              <p className="text-sm text-red-500 font-medium">{mcqErrors.questions.root.message}</p>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-surface-border">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => append({ questionText: '', options: ['', '', '', ''], correctOptionIndex: null as any, marks: defaultMarks })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>
            
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Save Quiz</Button>
            </div>
          </div>
        </form>
      )}

      <IconPicker 
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(name, color) => {
          setDetailsValue('iconName', name);
          setDetailsValue('iconColor', color);
        }}
        initialIcon={selectedIconName}
        initialColor={selectedIconColor}
      />
    </Modal>
  );
}
