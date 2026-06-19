import Link from 'next/link';
import CreateGameForm from './_components/CreateGameForm';

export default function NewGamePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/admin" className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700">
        ← Games
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Create Game</h1>
      <CreateGameForm />
    </div>
  );
}
