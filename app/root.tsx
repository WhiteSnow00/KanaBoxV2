/**
 * Root Layout Component
 * 
 * This is the top-level layout for the entire application.
 * It includes:
 * - Global navigation (PUBLIC only - no admin links)
 * - Global styles (Tailwind CSS)
 * - Error boundaries for error handling
 * - Meta tags and document structure
 */

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

/**
 * Document component - renders the HTML shell
 */
function Document({
  children,
  title = "Kana Box V2",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <title>{title}</title>
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Public Header component - no links, view-only
 */
function PublicHeader() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          <h1 className="text-xl font-bold text-blue-600">
            Kana Box V2
          </h1>
        </div>
      </div>
    </header>
  );
}

/**
 * Root layout component - wraps all pages
 */
export default function App() {
  return (
    <Document>
      <PublicHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </Document>
  );
}

/**
 * Global error boundary - catches errors in child routes
 */
export function ErrorBoundary() {
  const error = useRouteError();

  let message = "Đã xảy ra lỗi không mong muốn";
  let details = "";

  if (error instanceof Error) {
    message = error.message;
    details = error.stack || "";
  } else if (typeof error === "string") {
    message = error;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    message = error.message;
  }

  return (
    <Document title="Lỗi - Kana Box V2">
      <PublicHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Có lỗi xảy ra
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{message}</p>
                {process.env.NODE_ENV === "development" && details && (
                  <pre className="mt-4 text-xs overflow-auto bg-red-100 p-2 rounded">
                    {details}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Document>
  );
}
