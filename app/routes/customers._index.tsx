import { redirect, type LoaderFunctionArgs } from "@remix-run/node";

export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  return redirect(qs ? `/?${qs}` : "/");
}

