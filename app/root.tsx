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
import ThemeToggle from "~/components/ThemeToggle";

import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
];

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();
`;

function Document({
  children,
  title = "Kana Box V2",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
        <title>{title}</title>
      </head>
      <body className="min-h-full">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/70 bg-white/82 shadow-sm shadow-zinc-200/60 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/82 dark:shadow-black/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 shadow-sm dark:bg-white">
              <span className="text-sm font-semibold text-white dark:text-zinc-950">K</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">Kana Box</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Document>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Có lỗi xảy ra</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
              </div>
              {process.env.NODE_ENV === "development" && details && (
                <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-zinc-100 p-3 text-left text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
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
