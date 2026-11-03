import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Building,
  GraduationCap,
  MapPin,
  Camera,
  CheckCircle2,
  Shield,
  Clock,
  HelpCircle,
  Hash,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";

import { SkeletonProfile } from "../../components/ui/Skeletons";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";
import type { User } from "../../types";
import { SupportModal } from "./SupportModal";

// Zod Schema for Validation
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  rollNo: z.string().optional(),
  semester: z.string().optional(),
  section: z.string().optional(),
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  officeLocation: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePortal() {
  const { user: authUser, checkAuth } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      if (res.data.success) {
        setProfile(res.data.data);
        reset({
          name: res.data.data.name,
          phoneNumber: res.data.data.phoneNumber || "",
          department: res.data.data.department || "",
          rollNo: res.data.data.rollNo || res.data.data.rollNumber || "",
          semester: res.data.data.semester || "",
          section: res.data.data.section || "",
          employeeId: res.data.data.employeeId || "",
          designation: res.data.data.designation || "",
          officeLocation: res.data.data.officeLocation || "",
        });
        if (res.data.data.updatedAt) {
          setLastUpdated(new Date(res.data.data.updatedAt).toLocaleString());
        }
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const res = await api.put("/users/profile", data);
      if (res.data.success) {
        toast.success("Profile updated successfully");
        setIsEditing(false);
        fetchProfile();
        // Refresh auth state if name changed (since it shows in header)
        if (data.name !== authUser?.name) {
          checkAuth();
        }
      }
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarUpload = async () => {
    const url = prompt(
      "Enter image URL (Base64 or standard URL):",
      profile?.avatarUrl || "",
    );
    if (url === null) return;

    try {
      const res = await api.post("/users/profile/avatar", { avatarUrl: url });
      if (res.data.success) {
        toast.success("Avatar updated successfully");
        fetchProfile();
      }
    } catch (error) {
      toast.error("Failed to update avatar");
    }
  };

  if (loading) {
    return <SkeletonProfile />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-slate-500">
        Failed to load profile.
      </div>
    );
  }

  const isStudent = profile.role === "Student";
  const isFaculty = profile.role === "Faculty";
  const percentage = profile.completionPercentage || 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Profile Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your personal and academic information.
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group shrink-0">
              <div className="h-28 w-28 rounded-full bg-primary/10 overflow-hidden border-4 border-white shadow-md flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-12 w-12 text-primary" />
                )}
              </div>
              <button
                onClick={handleAvatarUpload}
                className="absolute inset-0 bg-slate-900/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white mb-1" />
                <span className="text-[10px] text-white font-medium uppercase tracking-wider">
                  Change
                </span>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {profile.name}
                </h2>
                <Badge
                  variant={
                    isFaculty ? "info" : isStudent ? "success" : "warning"
                  }
                >
                  {profile.role}
                </Badge>
              </div>
              <p className="text-slate-500 flex items-center justify-center sm:justify-start gap-2 mb-4">
                <Building className="h-4 w-4" />
                {profile.department || "Department Not Set"}
                {isFaculty && profile.designation
                  ? ` • ${profile.designation}`
                  : ""}
                {isStudent && profile.semester
                  ? ` • Semester ${profile.semester}`
                  : ""}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <div className="flex items-center gap-2 bg-canvas-alt px-3 py-1.5 rounded-lg border border-surface-border text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-700 font-medium">
                    {profile.email}
                  </span>
                </div>
                {(profile.rollNo ||
                  profile.rollNumber ||
                  profile.employeeId) && (
                  <div className="flex items-center gap-2 bg-canvas-alt px-3 py-1.5 rounded-lg border border-surface-border text-sm">
                    <Hash className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-700 font-medium">
                      {profile.rollNo ||
                        profile.rollNumber ||
                        profile.employeeId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    {...register("name")}
                    disabled={!isEditing}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-slate-50 disabled:text-slate-500",
                      errors.name
                        ? "border-red-300"
                        : "border-surface-border bg-canvas-alt",
                    )}
                    id="name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-surface-border bg-slate-50 text-slate-500 cursor-not-allowed"
                    title="Email cannot be changed"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Contact admin to change email.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      {...register("phoneNumber")}
                      disabled={!isEditing}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                      id="phoneNumber"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Academic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    {...register("department")}
                    disabled={!isEditing}
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                    id="department"
                  />
                </div>

                {isStudent && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Roll Number
                      </label>
                      <input
                        {...register("rollNo")}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                        id="rollNo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Semester
                      </label>
                      <select
                        {...register("semester")}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                        id="semester"
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={String(s)}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Section
                      </label>
                      <input
                        {...register("section")}
                        disabled={!isEditing}
                        placeholder="e.g. A"
                        className="w-full px-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                        id="section"
                      />
                    </div>
                  </>
                )}

                {isFaculty && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Employee ID
                      </label>
                      <input
                        {...register("employeeId")}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                        id="employeeId"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Designation
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          {...register("designation")}
                          disabled={!isEditing}
                          placeholder="e.g. Assistant Professor"
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                          id="designation"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Office Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          {...register("officeLocation")}
                          disabled={!isEditing}
                          placeholder="e.g. Block C, Room 302"
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-border focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-canvas-alt disabled:bg-slate-50 disabled:text-slate-500"
                          id="officeLocation"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-6">
          {/* Profile Completion Gauge */}
          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm text-center">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-6">
              Profile Completion
            </h3>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="text-primary transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">
                  {percentage}%
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              {percentage === 100
                ? "Great job! Your profile is complete."
                : "Complete your profile to get the most out of AcadeManage."}
            </p>
          </div>

          {/* Account Status */}
          <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Account Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Active Account
                  </p>
                  <p className="text-xs text-slate-500">
                    Verified {profile.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Permissions
                  </p>
                  <p className="text-xs text-slate-500">Standard Access</p>
                </div>
              </div>
            </div>
          </div>

          {/* Support Widget */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6 shadow-sm text-white">
            <HelpCircle className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Need Help?</h3>
            <p className="text-slate-300 text-sm mb-4">
              If you need to change your email address or correct administrative
              data, please contact the IT support desk.
            </p>
            <Button
              onClick={() => setIsSupportOpen(true)}
              variant="outline"
              className="w-full border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {lastUpdated && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-center gap-2 text-sm text-slate-500 mt-6">
          <Clock className="h-4 w-4" />
          <span>Last updated: {lastUpdated}</span>
        </div>
      )}

      {isSupportOpen && (
        <SupportModal onClose={() => setIsSupportOpen(false)} />
      )}
    </div>
  );
}
