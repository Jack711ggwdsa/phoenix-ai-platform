import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoenixLogo } from "@/components/PhoenixLogo";
import { PauseCircle, ArrowLeft } from "lucide-react";
import { ContactAdminCard } from "@/components/ContactAdminCard";

export const Route = createFileRoute("/renewal")({
  component: RenewalPage,
  head: () => ({ meta: [{ title: "Renewal — Phoenix AI Platform" }] }),
});

function RenewalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <div className="rounded-2xl glass p-10 text-center shadow-elegant">
          <div className="flex justify-center"><PhoenixLogo size={32} /></div>
          <PauseCircle className="mx-auto mt-8 text-destructive-foreground" size={48} />
          <h1 className="mt-4 font-display text-3xl text-gradient-gold">Subscription Expired</h1>
          <p className="mt-4 text-muted-foreground">
            Your AI service is currently expired. Please contact Phoenix Advertisement &amp; Design to renew your subscription.
          </p>
          <Link to="/client" className="mt-8 inline-flex items-center gap-1 text-sm text-gold hover:underline">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
        <ContactAdminCard />
      </div>
    </div>
  );
}
