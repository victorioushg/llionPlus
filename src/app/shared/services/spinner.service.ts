import { Injectable } from '@angular/core';
import {
  createSpinner,
  hideSpinner,
  setSpinner,
  showSpinner,
} from '@syncfusion/ej2-angular-popups';

export const LLION_SPINNER_TEMPLATE = `
  <div class="llion-spinner" aria-hidden="true">
    <div class="llion-spinner-ring"></div>
    <img
      class="llion-spinner-logo"
      src="assets/images/llion_gray.png"
      alt="llion"
    />
  </div>
`;

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  private target: HTMLElement | null = null;
  private created = false;
  private pendingCount = 0;
  private globalSuppressed = false;

  /** Apply branded Syncfusion spinner template app-wide (grids, dialogs, etc.). */
  applyGlobalTemplate(): void {
    setSpinner({ template: LLION_SPINNER_TEMPLATE });
  }

  /** Hide the full-page spinner (e.g. a view shows its own grid spinner). */
  suppressGlobal(): void {
    this.globalSuppressed = true;
    this.forceHide();
  }

  resumeGlobal(): void {
    this.globalSuppressed = false;
  }

  init(target: HTMLElement): void {
    this.target = target;
    if (!this.created) {
      createSpinner({
        target,
        cssClass: 'llion-global-spinner',
        width: '96px',
        template: LLION_SPINNER_TEMPLATE,
      });
      this.created = true;
    }
  }

  show(): void {
    if (this.globalSuppressed) {
      return;
    }
    this.pendingCount += 1;
    if (this.pendingCount === 1 && this.target) {
      showSpinner(this.target);
    }
  }

  hide(): void {
    if (this.globalSuppressed) {
      return;
    }
    if (this.pendingCount === 0) {
      return;
    }
    this.pendingCount -= 1;
    if (this.pendingCount === 0 && this.target) {
      hideSpinner(this.target);
    }
  }

  forceHide(): void {
    this.pendingCount = 0;
    if (this.target) {
      hideSpinner(this.target);
    }
  }
}
