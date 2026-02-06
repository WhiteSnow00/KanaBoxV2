import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";

function redirectToPublicHome(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  return redirect(qs ? `/?${qs}` : "/");
}

export function loader({ request }: LoaderFunctionArgs) {
  return redirectToPublicHome(request);
}

export function action({ request }: ActionFunctionArgs) {
  return redirectToPublicHome(request);
}

