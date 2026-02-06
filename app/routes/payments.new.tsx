import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";

function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

function redirectFromPublicPaymentsNew(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const customerId = url.searchParams.get("customerId") || undefined;

  const destination =
    customerId && isValidObjectId(customerId) ? `/customers/${customerId}` : "/";

  return redirect(`${destination}${qs ? `?${qs}` : ""}`);
}

export function loader({ request }: LoaderFunctionArgs) {
  return redirectFromPublicPaymentsNew(request);
}

export function action({ request }: ActionFunctionArgs) {
  return redirectFromPublicPaymentsNew(request);
}

