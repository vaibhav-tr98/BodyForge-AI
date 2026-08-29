import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import Button from "../../../components/ui/Button";
import AuthInput from "./AuthInput";
import { useAuth } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../services/api";

import {
  registerSchema,
  type RegisterFormData,
} from "../validation/authSchema";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();

  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await authRegister(data.name, data.email, data.password);
      navigate("/onboarding");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      id="register-form"
    >
      <AuthInput
        label="Full Name"
        id="register-name"
        autoComplete="name"
        placeholder="John Doe"
        error={errors.name?.message}
        {...register("name")}
      />

      <AuthInput
        label="Email"
        type="email"
        id="register-email"
        autoComplete="username"
        placeholder="john@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <AuthInput
        label="Password"
        type="password"
        id="register-password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <AuthInput
        label="Confirm Password"
        type="password"
        id="register-confirm-password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button
        type="submit"
        loading={isLoading}
        loadingText="Creating Account..."
        id="register-submit"
      >
        Create Account
      </Button>
    </form>
  );
}