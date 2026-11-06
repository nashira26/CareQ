import type { AgeGroup } from './mockData';

/** Which public dataset a field came from. */
export type DataSourceId = 'ontario' | 'toronto' | 'osm';

/**
 * How a centre was located / linked to City of Toronto data. Audit info only: shown nowhere in
 * the UI except the Trust page summary. 'licence' only applies if a licence-number field exists.
 */
export type JoinMethod = 'licence' | 'name+postal' | 'postal+distinctive-word' | 'geocoded' | 'none';

/**
 * A real licensed centre from public open data (see scripts/import-ontario-data.ts).
 * Kept separate from the simulated `Centre` type so applications, waitlists and offers
 * can never point at a real centre. A null field means neither dataset provides it.
 * lat/lng and ageGroups use the same shape as `Centre` so both can be ranked together.
 */
export interface OntarioCentre {
  id: string; // "on-<licence number>"
  licenceNumber: string;
  name: string;
  licensee: string;
  address: string;
  street: string;
  postalCode: string;
  area: string; // Toronto, Scarborough, North York, Etobicoke, East York, York
  licenceStatus: string;
  licenceIssued: string | null; // ISO date
  programOptions: string[]; // e.g. "Full day", "Before school"
  languages: string[];
  lat: number | null;
  lng: number | null;
  ageGroups: AgeGroup[] | null; // null = ages not reported (no City of Toronto match)
  capacity: number | null; // total licensed spaces (City of Toronto data)
  cwelcc: boolean | null; // CWELCC participation (City of Toronto data)
  dataSources: DataSourceId[];
  joinMethod: JoinMethod;
}

export interface DataSourceInfo {
  name: string;
  publisher: string;
  url: string;
  licence: string;
  dataDate: string | null; // ISO date of the data snapshot
  downloadedOn: string; // ISO date
}

export interface OntarioCentresFile {
  metadata: {
    generatedBy: string;
    sources: Record<DataSourceId, DataSourceInfo>;
    filter: string;
    centreCount: number;
    joinStats: {
      licence: number;
      namePostal: number;
      postalDistinctiveWord: number;
      geocoded: number;
      none: number;
      withoutMapLocation: number;
      schoolAgeOnly: number;
    };
  };
  centres: OntarioCentre[];
}

/** "2026-09-30" -> "Sep 30, 2026" */
export const formatSourceDate = (iso: string | null): string =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'date not given';
