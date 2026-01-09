import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login page (unauthenticated users) or dashboard (authenticated)
  // Middleware will handle the actual redirect logic
  redirect("/login");
}

