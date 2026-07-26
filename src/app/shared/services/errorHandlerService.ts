import { Injectable, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { ToastService } from './toastService';
import { toastType } from '@shared/enums/enums';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(
    private toastService: ToastService,
    private ngZone: NgZone
  ) {}

  handleError(error: unknown) {
    let errorMessage = 'Unexpected error';

    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        errorMessage = `An error occurred: ${error.error.message}`;
      } else {
        const serverMsg =
          typeof error.error === 'string'
            ? error.error
            : error.error?.message || error.message || error.statusText;
        errorMessage = `Server returned code: ${error.status}, error message is: ${serverMsg}`;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as { message: unknown }).message);
    }

    console.error(errorMessage, error);
    this.ngZone.run(() => {
      this.toastService.showMyToast(errorMessage, toastType.error);
    });
    return throwError(() => errorMessage);
  }
}
