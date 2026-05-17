import { MessageCircle } from "lucide-react";

const WA_NUMBER = "601126282883";
const WA_DISPLAY = "+60 11-2628 2883";
const WA_URL = `https://wa.me/${WA_NUMBER}`;

export function ContactAdminCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl glass p-6 ${className}`}>
      <h3 className="font-display text-lg text-gold">Contact Phoenix AI Support</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Need help, want to renew, or have a question? Message our team on WhatsApp Business.
      </p>
      <p className="mt-3 font-mono text-sm text-foreground">{WA_DISPLAY}</p>
      <a
        href={WA_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold"
      >
        <MessageCircle size={14} /> Contact Phoenix AI Support
      </a>
    </div>
  );
}
