import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/actions/auth";

export default function AccessRejectedPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <p className="font-serif text-2xl text-text-primary">
          Personal <span className="italic text-accent">Assistant</span>
        </p>
      </div>

      <Card className="text-center">
        <p className="font-serif text-xl text-text-primary">Access not granted</p>
        <p className="mt-3 text-sm text-text-secondary">
          This app is private, and this account&apos;s access request wasn&apos;t approved. If you
          believe this is a mistake, reach out to the owner directly.
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
