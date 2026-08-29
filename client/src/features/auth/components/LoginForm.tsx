
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import AuthInput from "./AuthInput";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../services/api";

import {
  loginSchema,
  type LoginFormData,
} from "../validation/authSchema";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" id="login-form">
      <AuthInput
        label="Email"
        type="email"
        id="login-email"
        autoComplete="username"
        placeholder="john@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <AuthInput
        label="Password"
        type="password"
        id="login-password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" loading={isSubmitting} loadingText="Signing In..." id="login-submit">
        Sign In
      </Button>
    </form>
  );
}