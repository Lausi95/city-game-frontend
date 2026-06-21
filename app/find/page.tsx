import Find from '@/app/components/organisms/Find';

/**
 * Public Find surface (see CONTEXT.md), reached only by scanning a backend-minted
 * find-QR: `/find?agentId=&alias=`. There is no in-app navigation here. A server
 * shell that reads the link params and delegates to the Find client organism,
 * which owns the confirm / POST / redirect logic. The link carries no game/team
 * IDs — the finding team's identity is read from localStorage — and deliberately
 * carries the alias instead of the agent record, so the surface never has to look
 * the agent up. See docs/adr/0010-find-trusts-url-alias-never-fetches-agent.md.
 */
export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; alias?: string }>;
}) {
  const { agentId, alias } = await searchParams;
  return <Find agentId={agentId} alias={alias} />;
}
