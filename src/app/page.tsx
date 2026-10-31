export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl rounded-3xl border border-[#e8e1d2] bg-white p-10 text-center shadow-sm sm:p-14">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#142b4a] text-2xl font-bold tracking-wide text-[#c6a45c]">
          BS
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#a18445]">
          Class Management System
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[#142b4a] sm:text-5xl">BS IT</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
          A secure, simple, and responsive learning management platform.
        </p>
        <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-[#c6a45c]" />
        <p className="mt-6 text-xs text-slate-400">Project foundation · Phase 1</p>
      </section>
    </main>
  );
}
