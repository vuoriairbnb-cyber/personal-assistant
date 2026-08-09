import { GolfSearch } from "@/components/golf/GolfSearch";

export const metadata = {
  title: "Golf — Personal Assistant",
};

export default function GolfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">Golf</h1>
        <p className="mt-1 text-text-secondary">
          Vapaat lähtöajat Helsingin Golfklubilta — hae kirjoittamalla, esim. &quot;ensi
          keskiviikkona illalla&quot;.
        </p>
      </div>
      <GolfSearch />
    </div>
  );
}
