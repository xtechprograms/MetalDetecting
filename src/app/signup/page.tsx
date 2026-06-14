import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account",
};

export default function SignupPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </div>
  );
}
