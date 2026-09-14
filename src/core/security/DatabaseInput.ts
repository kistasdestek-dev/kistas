const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PostgREST and Realtime filter expressions are strings rather than value
 * parameters. Only canonical UUID values may cross that boundary.
 */
export const toPostgrestUuid = (value: string, fieldName = 'id'): string => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value.toLowerCase();
};
