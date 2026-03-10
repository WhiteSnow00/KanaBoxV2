import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  Link,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
];

function Document({
  children,
  title = "Kana Box V2",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <title>{title}</title>
      </head>
      <body className="min-h-full bg-zinc-50/50">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-sm font-bold text-white">K</span>
            </div>
            <span className="text-base font-semibold text-zinc-900">Kana Box</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Document>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </Document>
  );
}

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
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">Có lỗi xảy ra</h3>
                <p className="text-sm text-zinc-500">{message}</p>
              </div>
              {process.env.NODE_ENV === "development" && details && (
                <pre className="mt-4 text-xs overflow-auto bg-zinc-100 p-3 rounded-lg text-left text-zinc-600 max-h-48">
                  {details}
                </pre>
              )}
              <Button variant="outline" asChild>
                <Link to="/">Về trang chủ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </Document>
  );
}
