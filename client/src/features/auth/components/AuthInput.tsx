import Input from "../../../components/ui/Input";

interface AuthInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function AuthInput({
  label,
  error,
  ...props
}: AuthInputProps) {
  return (
    <Input
      label={label}
      error={error}
      {...props}
    />
  );
}