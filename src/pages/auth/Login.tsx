import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { BookOpen, Info } from "lucide-react";
import type { Role } from "../../types";
import authBg from "../../assets/auth-bg.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Student", "Faculty", "Admin", "admin"]),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();

  const loginAction = useAuthStore((state) => state.login);

  const [activeRole, setActiveRole] = useState<Role>("Student");

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: "Student",
    },
  });

  const handleRoleSwitch = (role: Role) => {
    setActiveRole(role);

    setValue("role", role);
  };

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);

    try {
      await loginAction({
        email: data.email,
        password: data.password,
      });

      navigate("/");
    } catch (err: any) {
      setServerError(
        err.message || "Invalid email or password. Please try again.",
      );
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-canvas">
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

        {/* Left content */}

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14 text-white">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />

            <span className="text-2xl font-bold">AcadeManage</span>
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl font-bold leading-tight mb-6">
              A smarter way to manage your academic journey.
            </h1>

            <p className="text-white/80 text-lg">
              Streamline classes, assignments, and grades all in one secure
              platform designed for zero errors.
            </p>
          </div>

          <div className="text-sm text-white/60">
            &copy; {new Date().getFullYear()} AcadeManage. All rights reserved.
          </div>
        </div>
      </div>

      {/* RIGHT FORM SECTION */}

      <div className="flex-1 flex items-center justify-center px-6 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome back
            </h2>

            <p className="text-slate-500">
              Please enter your details to sign in.
            </p>
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

          {/* Faculty pending-approval info note */}
          {activeRole === "Faculty" && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Newly registered Faculty accounts require{" "}
                <strong>Admin approval</strong> before login is permitted.
              </p>
            </div>
          )}

          {/* Server Error */}

          {serverError && (
            <div className="mb-5 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
              {serverError}
            </div>
          )}

          {/* Login Form */}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="Enter your college email"
              {...register("email")}
              autoComplete="email"
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              autoComplete="current-password"
              error={errors.password?.message}
            />

            <div className="flex items-center justify-between">
              <label htmlFor="remember-me" className="flex items-center gap-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="rounded border-surface-border text-primary focus:ring-primary"
                />

                <span className="text-sm text-slate-600">Remember me</span>
              </label>

              <a
                href="#"
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                Forgot password?
              </a>
            </div>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
