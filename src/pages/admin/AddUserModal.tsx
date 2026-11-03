import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Student',
    department: '',
    rollNo: '',
    semester: '',
    section: '',
    employeeId: '',
    designation: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/users', formData);
      toast.success('User created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-[95%] max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">Add New User</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <form id="addUserForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Full Name *</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="John Doe" id="name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Email *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="john@example.com" id="email" autoComplete="email" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Password *</label>
                <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="••••••••" id="password" autoComplete="current-password" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Role *</label>
                <select required name="role" value={formData.role} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" id="role">
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1 text-slate-700">Department</label>
                <input name="department" value={formData.department} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" placeholder="e.g. Computer Science" id="department" />
              </div>

              {formData.role === 'Student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Roll Number</label>
                    <input name="rollNo" value={formData.rollNo} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" id="rollNo" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Semester</label>
                    <input name="semester" value={formData.semester} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" id="semester" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Section</label>
                    <input name="section" value={formData.section} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" id="section" />
                  </div>
                </>
              )}

              {formData.role === 'Faculty' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Employee ID</label>
                    <input name="employeeId" value={formData.employeeId} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" id="employeeId" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">Designation</label>
                    <input name="designation" value={formData.designation} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" id="designation" />
                  </div>
                </>
              )}
            </div>
          </form>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="addUserForm" isLoading={loading}>
            <Save className="w-4 h-4 mr-2" /> Create User
          </Button>
        </div>
      </div>
    </div>
  );
}
