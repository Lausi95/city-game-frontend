import SetupAgent from '@/app/components/organisms/SetupAgent';

/**
 * Public agent setup surface, reached by scanning an agent setup QR:
 * `/setup-agent?gameId=&agentId=`. A server shell that reads the link params and
 * delegates to the SetupAgent client organism (which owns the fetch / confirm /
 * redirect logic). A `type` param may be present but is ignored — the type is
 * read from the fetched agent. See docs/adr/0004-root-is-public-participant-surface.md.
 */
export default async function SetupAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string; agentId?: string }>;
}) {
  const { gameId, agentId } = await searchParams;
  return <SetupAgent gameId={gameId} agentId={agentId} />;
}
