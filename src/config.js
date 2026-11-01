export const DEBUG_ENABLED = true;

const publishedCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnpAl6uNob4CfVrFpfCU_xq-iwVH-mC3DwQoU001UTSYDIIsptmOrQQ3c_tRAtRfJF9ErHgDsS5hds/pub?output=csv&gid=";

export const SHEET_CSV_URLS = {
  artifacts: `${publishedCsvUrl}0`,       // Replace with exact GID for Artifacts / Item Database
  shop: `${publishedCsvUrl}1269072672`,    // Replace with exact GID for Shop Items
  meals: `${publishedCsvUrl}1367115861`,   // Replace with exact GID for Meals
};