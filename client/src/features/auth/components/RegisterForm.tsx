import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../../../components/ui/Button";
import AuthInput from "./AuthInput";

import {
  registerSchema,
  type RegisterFormData,
} from "../validation/authSchema";

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    console.log(data);

    // Day 5
    // authService.register(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <AuthInput
        label="Full Name"
        placeholder="John Doe"
        error={errors.name?.message}
        {...register("name")}
      />

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

      <AuthInput
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button
        type="submit"
        loading={isSubmitting}
      >
        Create Account
      </Button>
    </form>
  );
}