import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In",
};

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  const redirectTo = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
