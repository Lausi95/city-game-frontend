import CreateGameDialog from "./components/CreateGameDialog";

export default async function Home() {
  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-4 px-16">
        <h2 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Welcome to City Game Admin
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Manage your city game from here.
        </p>
        <CreateGameDialog />
      </main>
    </div>
  );
}
