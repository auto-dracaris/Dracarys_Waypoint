import { ValueTransformer } from 'typeorm';

/** Postgres returns `decimal` columns as strings; entities expose numbers. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
