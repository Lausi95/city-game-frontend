import Link from 'next/link';
import { Button } from '@/app/components/atoms/Button';

export default function CreateGameDialog() {
  return (
    <Link href="/admin">
      <Button size="lg">Go to Admin Dashboard</Button>
    </Link>
  );
}
