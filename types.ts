
export enum RoundingMode {
  VARIANT_A = 'Standard (Kaufmännisch)',
  VARIANT_B = 'Aufrunden (Always Up)',
}

export interface ProductionRecord {
  id: string;
  datum: string;
  ofen: string;
  temperatur: string;
  legierung: string;
  gewichtKg: string;
  bemerkungen: string;
  // Computed fields
  temp_n: number;
  alloy_n: number;
  weight_n: number;
  tonnes: number;
  tonnesRounded: number;
  material: 'Cu' | 'Tombak' | 'Messing' | 'Unklar';
  tempBucket: string;
}

export interface AppSettings {
  roundingMode: RoundingMode;
  tombakThreshold: number;
  tempBuckets: number[];
  tempTolerance: number;
}

export interface ChartData {
  name: string;
  value: number;
  material?: string;
}
