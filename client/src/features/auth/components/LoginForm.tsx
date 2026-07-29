import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import AuthInput from "./AuthInput";
import Button from "../../../components/ui/Button";

import {
  loginSchema,
  type LoginFormData,
} from "../validation/authSchema";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log(data);

    // Day 5
    // authService.login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <AuthInput
        label="Email"
        type="email"
        placeholder="john@example.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" loading={isSubmitting}>
        Sign In
      </Button>
    </form>
  );
}