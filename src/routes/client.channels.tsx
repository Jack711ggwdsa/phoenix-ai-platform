import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/client/channels")({
  component: ChannelsLayout,
});

function ChannelsLayout() {
  return <Outlet />;
}
