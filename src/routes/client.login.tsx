import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/client/login")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});