import SetupTeam from '@/app/components/organisms/SetupTeam';

/**
 * Public team-member setup surface, reached by scanning a team setup QR:
 * `/setup-team?gameId=&teamId=`. A server shell that reads the link params and
 * delegates to the SetupTeam client organism (which owns the fetch / join /
 * redirect logic). See docs/adr/0004-root-is-public-participant-surface.md.
 */
export default async function SetupTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string; teamId?: string }>;
}) {
  const { gameId, teamId } = await searchParams;
  return <SetupTeam gameId={gameId} teamId={teamId} />;
}
