/** Fixed app footer strip height (see `#app-footer`). */
export const APP_FOOTER_HEIGHT = 28;

/** Gap between grid bottom edge and the footer strip. */
export const APP_GRID_FOOTER_GAP = 50;

function footerTopPx(): number {
  const footer = document.getElementById('app-footer');
  return (
    footer?.getBoundingClientRect().top ??
    window.innerHeight - APP_FOOTER_HEIGHT
  );
}

/**
 * Height for Syncfusion `ejs-grid` so the grid bottom sits
 * `gap` px above the footer strip (defaults to {@link APP_GRID_FOOTER_GAP}).
 */
export function contentGridHeight(
  minHeight = 200,
  gridElement?: HTMLElement | null,
  gap: number = APP_GRID_FOOTER_GAP
): number {
  const targetBottom = footerTopPx() - gap;
  const top =
    gridElement?.getBoundingClientRect().top ??
    document.getElementById('main-content')?.getBoundingClientRect().top ??
    111;

  return Math.max(minHeight, Math.floor(targetBottom - top));
}

/** Set grid.height from {@link contentGridHeight}. */
export function applyGridHeightAboveFooter(
  grid: { height: string | number; element?: HTMLElement } | null | undefined,
  minHeight = 200,
  gap: number = APP_GRID_FOOTER_GAP
): number {
  const height = contentGridHeight(minHeight, grid?.element ?? null, gap);
  if (grid) {
    grid.height = height;
  }
  return height;
}
