/**
 * Derives scripts-grid layout for thumbnail sizing. grid_columns and grid_gap_px
 * are parsed from docs/style.css (.scripts-grid).
 */
const fs = require('fs');
const path = require('path');

// Maximum width of the main content div on https://www.johnsy.com/
const MAIN_CONTENT_MAX_WIDTH_PX = 663;

const projectRoot = path.resolve(__dirname, '..');
const cssPath = path.join(projectRoot, 'docs', 'style.css');

function parseScriptsGridFromCSS() {
  const css = fs.readFileSync(cssPath, 'utf8');
  const blockMatch = css.match(/\.scripts-grid\s*\{([^}]*)\}/);
  const block = blockMatch ? blockMatch[1] : '';
  const repeatMatch = block.match(/repeat\s*\(\s*(\d+)\s*,/);
  const gapMatch = block.match(/gap:\s*(\d+)\s*px/);
  return {
    grid_columns: repeatMatch ? parseInt(repeatMatch[1], 10) : 3,
    grid_gap_px: gapMatch ? parseInt(gapMatch[1], 10) : 30,
  };
}

function getScriptsGridLayout() {
  const fromCSS = parseScriptsGridFromCSS();
  return {
    ...fromCSS,
    grid_container_max_width_px: MAIN_CONTENT_MAX_WIDTH_PX,
  };
}

function getThumbMaxWidth() {
  const { grid_container_max_width_px, grid_columns, grid_gap_px } = getScriptsGridLayout();
  return Math.ceil((grid_container_max_width_px - (grid_columns - 1) * grid_gap_px) / grid_columns);
}

module.exports = { getScriptsGridLayout, getThumbMaxWidth };
