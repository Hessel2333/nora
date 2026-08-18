export function canTransition{{Feature}}(from: string, to: string) {
  const transitions: Record<string, string[]> = {};
  return (transitions[from] ?? []).includes(to);
}
