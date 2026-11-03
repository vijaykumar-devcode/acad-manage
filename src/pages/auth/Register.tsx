import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { BookOpen, CheckCircle } from "lucide-react";
import type { Role } from "../../types";
import authBg from "../../assets/auth-bg.png";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),

    email: z
      .string()
      .email("Please enter a valid email address")
      .refine((val) => val.endsWith(".edu"), {
        message: "College email must end with .edu",
      }),

    role: z.enum(["Student", "Faculty", "Admin"]),

    rollNo: z.string().optional(),

    department: z.string().min(2, "Department is required"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",

    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "Student" && (!data.rollNo || data.rollNo.length < 5)) {
        return false;
      }

      return true;
    },
    {
      message: "Valid roll number is required for students",

      path: ["rollNo"],
    },
  );

type RegisterFormValues = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();

  const registerAction = useAuthStore((state) => state.register);

  const [activeRole, setActiveRole] = useState<Role>("Student");

  const [serverError, setServerError] = useState<string | null>(null);

  // When a Faculty account is created and awaits Admin approval
  const [pendingApproval, setPendingApproval] = useState(false);

  const {
    register,

    handleSubmit,

    setValue,

    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      role: "Student",
    },
  });

  const handleRoleSwitch = (role: Role) => {
    setActiveRole(role);

    setValue("role", role);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);

    try {
      const result = await registerAction({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        department: data.department,
        rollNo: data.rollNo,
      });

      if (result.pending) {
        // Faculty account created — show the pending-approval screen.
        setPendingApproval(true);
        return;
      }

      navigate("/");
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes("duplicate key") ||
          err.message.includes("already exists"))
      ) {
        setServerError("An account with this email already exists.");
      } else {
        setServerError(err.message || "Registration failed. Please try again.");
      }
    }
  };

  // ── Pending-approval screen for Faculty ──────────────────────────────────
  if (pendingApproval) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas px-6">
        <div className="max-w-md w-full text-center bg-surface rounded-2xl border border-surface-border p-10 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Account Created!</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your Faculty account has been created and is{" "}
            <strong>pending Admin approval</strong>. You will be notified once
            an Admin reviews your account. Please check back later to log in.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-canvas">
      {" "}
      {/* LEFT IMAGE SECTION - DESKTOP ONLY */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-sidebar">
        {/* Complete image visible */}

        <img
          src={authBg}
          alt="Campus background"
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Light sidebar color overlay */}

        <div className="absolute inset-0 bg-sidebar/60" />

        {/* Left Content */}

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14 text-white">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />

            <span className="text-2xl font-bold">AcadeManage</span>
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl font-bold leading-tight mb-6">
              Join your academic community today.
            </h1>

            <p className="text-white/80 text-lg">
              Create an account to access study materials, track assignments,
              and stay connected with your classes.
            </p>
          </div>

          <div className="text-sm text-white/60">
            &copy; {new Date().getFullYear()} AcadeManage. All rights reserved.
          </div>
        </div>
      </div>
      {/* RIGHT REGISTER FORM SECTION */}
      <div className="flex-1 flex items-center justify-center px-6 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Create an account
            </h2>

            <p className="text-slate-500">Enter your details to get started.</p>
          </div>

          {/* Role Switch */}

          <div className="flex p-1 bg-canvas-alt rounded-lg mb-6">
            <button
              type="button"
              onClick={() => handleRoleSwitch("Student")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeRole === "Student"
                  ? "bg-surface text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Student
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch("Faculty")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeRole === "Faculty"
                  ? "bg-surface text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Faculty
            </button>
          </div>

          {serverError && (
            <div className="mb-5 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {" "}
            <Input
              label="Full Name"
              placeholder="John Doe"
              {...register("name")}
              autoComplete="name"
              error={errors.name?.message}
            />
            <Input
              label="College Email"
              type="email"
              placeholder="john@college.edu"
              {...register("email")}
              autoComplete="email"
              error={errors.email?.message}
            />
            {activeRole === "Student" ? (
              <>
                <Input
                  label="Roll Number"
                  placeholder="e.g. 21CS101"
                  {...register("rollNo")}
                  error={errors.rollNo?.message}
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="department"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Branch / Department
                  </label>

                  <select
                    id="department"
                    {...register("department")}
                    autoComplete="organization"
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Department</option>

                    <option value="CSE">CSE (Computer Science)</option>

                    <option value="ECE">ECE (Electronics)</option>

                    <option value="ME">ME (Mechanical)</option>

                    <option value="CE">CE (Civil)</option>

                    <option value="EE">EE (Electrical)</option>
                  </select>

                  {errors.department && (
                    <p className="text-sm text-red-500 font-medium">
                      {errors.department.message}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <Input
                label="Department"
                placeholder="e.g. Computer Science"
                {...register("department")}
                autoComplete="organization"
                error={errors.department?.message}
              />
            )}
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              autoComplete="new-password"
              error={errors.password?.message}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
            />
            <div className="pt-2">
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Create Account
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
