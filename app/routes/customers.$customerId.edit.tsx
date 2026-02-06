import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";

function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

function redirectToPublicCustomer(request: Request, customerId: string | undefined) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();

  if (!customerId || !isValidObjectId(customerId)) {
    return redirect(qs ? `/?${qs}` : "/");
  }

  return redirect(`/customers/${customerId}${qs ? `?${qs}` : ""}`);
}

export function loader({ request, params }: LoaderFunctionArgs) {
  return redirectToPublicCustomer(request, params.customerId);
}

export function action({ request, params }: ActionFunctionArgs) {
  return redirectToPublicCustomer(request, params.customerId);
}

