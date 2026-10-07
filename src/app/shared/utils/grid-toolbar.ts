import { ItemModel } from '@syncfusion/ej2-navigations';
import { ToolbarItems } from '@syncfusion/ej2-angular-grids';
import { fromEvent, Observable } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export type GridToolbarItem = ToolbarItems | ItemModel | string | object;

/** Right-aligned grid identity label for Syncfusion toolbars. */
export function toolbarTitleItem(title: string): ItemModel {
  return {
    id: 'gridToolbarTitle',
    text: title,
    tooltipText: title,
    align: 'Right',
    cssClass: 'e-grid-toolbar-title',
  };
}

/** Appends a right-side title label to a toolbar item list. */
export function withToolbarTitle(
  items: GridToolbarItem[],
  title: string
): GridToolbarItem[] {
  return [...items, toolbarTitleItem(title)];
}

type FilterableColumn = {
  field?: string;
  type?: string;
  filter?: { operator?: string; type?: string };
};

type SearchableGrid = {
  element?: HTMLElement;
  filterSettings?: { type?: string };
  getColumns?: () => FilterableColumn[];
};

/** String columns use contains. Date, number and checkbox filters stay as they are. */
export function applyContainsColumnFilters(
  grid: SearchableGrid | null | undefined
): void {
  const filterType = grid?.filterSettings?.type;
  if (!grid?.getColumns || filterType === 'CheckBox' || filterType === 'Excel') {
    return;
  }
  for (const column of grid.getColumns()) {
    const type = (column.type || 'string').toLowerCase();
    if (!column.field || type !== 'string' || column.filter?.type || column.filter?.operator) {
      continue;
    }
    column.filter = { ...(column.filter ?? {}), operator: 'contains' };
  }
}

/**
 * Filters the grid as the user types in Syncfusion's toolbar search box.
 * Listens on the grid so it still works if the toolbar is rebuilt.
 */
export function bindGridSearchAsYouType(
  getGrid: () => SearchableGrid | null | undefined,
  onValue: (value: string) => void,
  until$: Observable<unknown>,
  debounceMs = 120
): void {
  const tryBind = (attemptsLeft: number): void => {
    const grid = getGrid();
    const element = grid?.element;
    if (!element) {
      if (attemptsLeft > 0) {
        setTimeout(() => tryBind(attemptsLeft - 1), 50);
      }
      return;
    }

    if (element.dataset['containsFilters'] !== '1') {
      applyContainsColumnFilters(grid);
      element.dataset['containsFilters'] = '1';
    }

    fromEvent<Event>(element, 'input')
      .pipe(debounceTime(debounceMs), takeUntil(until$))
      .subscribe((event) => {
        const target = event.target as HTMLInputElement | null;
        if (!target?.id?.endsWith('_searchbar')) {
          return;
        }
        onValue(target.value || '');
      });
  };

  tryBind(20);
}
