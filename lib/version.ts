/**
 * Policy versions use major.minor (v1.0, v1.1).
 * Content edits and approved-document revisions bump the minor number.
 */
export function nextMinorVersion(current: string): string {
  const match = /^(\d+)\.(\d+)$/.exec(current.trim());
  if (!match) return "1.1";
  return `${match[1]}.${Number(match[2]) + 1}`;
}

export function nextMajorVersion(current: string): string {
  const match = /^(\d+)\.(\d+)$/.exec(current.trim());
  if (!match) return "2.0";
  return `${Number(match[1]) + 1}.0`;
}

export function compareVersionsDesc(left: string, right: string) {
  const [leftMajor, leftMinor] = left.split(".").map(Number);
  const [rightMajor, rightMinor] = right.split(".").map(Number);
  return rightMajor - leftMajor || rightMinor - leftMinor;
}

export function formatVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
