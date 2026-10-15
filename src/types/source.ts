/**
 * How a dataset relates to an authoritative record. Shown to users so that
 * official, derived and illustrative information are never confused.
 */
export type DataClassification =
  /** Published by the responsible authority (e.g. Statistics Canada, NRCan). */
  | 'official'
  /** Produced from other data by generalization, transcription or computation. */
  | 'derived'
  /** Illustrative only; not suitable for measurement or legal use. */
  | 'illustrative'
  /** Known to be partial or awaiting review. */
  | 'incomplete';

export interface DataSource {
  /** Stable identifier referenced by records and layers. */
  id: string;
  name: string;
  publisher: string;
  url: string;
  license: string;
  licenseUrl?: string;
  /** ISO date (YYYY-MM-DD) when the data was accessed for this project. */
  accessed: string;
  coverage: string;
  /** Date or period the content describes (e.g. census day). */
  referenceDate?: string;
  classification: DataClassification;
  limitations: string[];
  /** How the data reached this repository. */
  accessMethod: string;
  attribution?: string;
}
