/** Plain-language names for fields a community record may be missing. */
export const MISSING_FIELD_LABEL: Record<string, string> = {
  location: 'verified coordinates',
  population: 'verified census population',
  indigenousNames: 'Inuktut name forms',
  description: 'geographic description',
  links: 'official links',
};

export function missingFieldLabels(fields: readonly string[]): string[] {
  return fields.map((f) => MISSING_FIELD_LABEL[f] ?? f);
}
