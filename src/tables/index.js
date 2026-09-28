// Tables imported from Visual Pinball with `npm run import-table -- <table.vpx>`.
import spike from './spike.table.json';
import importTest from './import-test.table.json';

export const TABLES = {
  spike,
  'import-test': importTest
};

// The table to load: `?table=<name>` in the page URL, or defaultTable.
export const selectTable = (defaultTable) => {
  const name = new URLSearchParams(window.location.search).get('table') || defaultTable;
  if (TABLES[name] === undefined) {
    console.warn(`No table named "${name}"; loading "${defaultTable}". Tables: ${Object.keys(TABLES).join(', ')}`);
    return TABLES[defaultTable];
  }
  return TABLES[name];
}
