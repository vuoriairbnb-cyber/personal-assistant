import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signUpWithPassword } from "@/lib/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <div className="mb-8 text-center">
        <p className="font-serif text-2xl text-text-primary">
          Personal <span className="italic text-accent">Assistant</span>
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          This app is private. You&apos;ll need an invite code, and the owner still has to approve
          your account before you can use it.
        </p>
      </div>

      <Card>
        {error && (
          <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger-strong">
            {error}
          </p>
        )}

        <form action={signUpWithPassword} className="space-y-4">
          <Field label="Email">
            <Input type="email" name="email" required autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input type="password" name="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Invite code">
            <Input type="text" name="invite_code" required autoComplete="off" />
          </Field>
          <Button type="submit" className="w-full">
            Request access
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
