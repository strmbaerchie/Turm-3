import type { ProductionRecord, RoundingMode } from '../types';

export function processRawData(
  record: ProductionRecord,
  roundingMode: RoundingMode
): ProductionRecord[] {
  return [record];
}
