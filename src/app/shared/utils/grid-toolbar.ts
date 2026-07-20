import { ItemModel } from '@syncfusion/ej2-navigations';
import { ToolbarItems } from '@syncfusion/ej2-angular-grids';

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
