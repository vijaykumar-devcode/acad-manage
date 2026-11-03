import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Save, Plus, Trash2 } from 'lucide-react';

interface GradeRule {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
}

export function GradeScaleSettings() {
  const [rules, setRules] = useState<GradeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchScale();
  }, []);

  const fetchScale = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/gradescale');
      if (data.data?.rules) {
        setRules(data.data.rules);
      }
    } catch (error) {
      toast.error('Failed to load grade scale');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/gradescale', { rules });
      toast.success('Grade scale updated successfully');
    } catch (error) {
      toast.error('Failed to update grade scale');
    } finally {
      setSaving(false);
    }
  };

  const handleRuleChange = (index: number, field: keyof GradeRule, value: string | number) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const handleAddRule = () => {
    setRules([...rules, { grade: 'New', minPercentage: 0, maxPercentage: 0 }]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading grade scale...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Global Grade Scale</h2>
          <p className="text-sm text-slate-500 mt-1">Configure percentage thresholds for dynamic grade assignments.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="bg-white border border-surface-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-surface-border font-medium">
            <tr>
              <th className="px-6 py-3">Grade Letter</th>
              <th className="px-6 py-3">Min Percentage (%)</th>
              <th className="px-6 py-3">Max Percentage (%)</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, idx) => (
              <tr key={idx} className="border-b border-surface-border hover:bg-slate-50">
                <td className="px-6 py-3">
                  <input
                    type="text"
                    value={rule.grade}
                    onChange={(e) => handleRuleChange(idx, 'grade', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    placeholder="e.g. A+"
                  />
                </td>
                <td className="px-6 py-3">
                  <input
                    type="number"
                    value={rule.minPercentage}
                    onChange={(e) => handleRuleChange(idx, 'minPercentage', parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </td>
                <td className="px-6 py-3">
                  <input
                    type="number"
                    value={rule.maxPercentage}
                    onChange={(e) => handleRuleChange(idx, 'maxPercentage', parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleRemoveRule(idx)}
                    className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                    title="Remove rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-4 bg-slate-50 border-t border-surface-border flex justify-center">
          <Button variant="outline" onClick={handleAddRule} className="text-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Grade Threshold
          </Button>
        </div>
      </div>
    </div>
  );
}
