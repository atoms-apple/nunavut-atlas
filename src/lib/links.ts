/** Statistics Canada 2021 Census "Focus on Geography" page for a census subdivision. */
export function statCanProfileUrl(censusSubdivisionCode: string): string {
  return `https://www12.statcan.gc.ca/census-recensement/2021/as-sa/fogs-spg/page.cfm?lang=E&topic=1&dguid=2021A0005${censusSubdivisionCode}`;
}
