import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/actions/auth";

export default function PendingApprovalPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <p className="font-serif text-2xl text-text-primary">
          Personal <span className="italic text-accent">Assistant</span>
        </p>
      </div>

      <Card className="text-center">
        <p className="font-serif text-xl text-text-primary">Awaiting your review</p>
        <p className="mt-3 text-sm text-text-secondary">
          This app is private. Your account is waiting for approval. You&apos;ll be able to sign
          in as soon as the owner approves your access — no action is needed from you right now.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
