/**
 * /invite/:token — Partner invitation accept page (canonical URL).
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$token")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/join",
      search: { code: params.token },
    });
  },
  component: () => null,
});
