import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signInWithPassword } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirectTo?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="font-serif text-2xl text-text-primary">
          Personal <span className="italic text-accent">Assistant</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">Sign in to your workspace.</p>
      </div>

      <Card>
        {message && (
          <p className="mb-4 rounded-sm bg-success-bg px-3 py-2 text-sm text-success-strong">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-strong">
            {error}
          </p>
        )}

        <form action={signInWithPassword} className="space-y-4">
          <Field label="Email">
            <Input type="email" name="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" name="password" required autoComplete="current-password" />
          </Field>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-text-secondary">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-accent">
          Create one
        </Link>
      </p>
    </div>
  );
}
