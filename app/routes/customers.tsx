import { redirect } from "@remix-run/node";

/**
 * Redirect /customers to public home at /
 * Keeps a single public entry point.
 */
export function loader() {
  return redirect("/");
}
