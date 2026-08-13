import { PowerOff } from "lucide-react";

export default function PublicSiteInactive() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-12rem] h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-200/45 blur-3xl dark:bg-indigo-950/30"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-zinc-300/35 blur-3xl dark:bg-zinc-800/25"
      />

      <section className="surface relative w-full max-w-xl overflow-hidden px-6 py-10 text-center motion-safe:animate-slide-up-fade sm:px-10 sm:py-12">
        <div className="mx-auto mb-8 flex w-fit items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 shadow-sm">
            <span className="text-sm font-semibold text-white">K</span>
          </div>
          <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Kana Box
          </span>
        </div>

        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          <PowerOff className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
          Thông báo / Notice
        </p>
        <h1
          lang="vi"
          className="text-balance text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl"
        >
          Group không còn hoạt động
        </h1>
        <div className="mx-auto my-5 h-px w-16 bg-zinc-200 dark:bg-zinc-700" />
        <p lang="en" className="text-lg text-zinc-600 dark:text-zinc-300">
          The group is no longer active.
        </p>

        <div className="mt-8 space-y-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          <p lang="vi">Nội dung của trang hiện không còn khả dụng.</p>
          <p lang="en">This site&apos;s content is no longer available.</p>
        </div>
      </section>
    </main>
  );
}
