import { Injectable } from '@angular/core';
import { Toast, ToastModel, ToastUtility } from '@syncfusion/ej2-notifications';
import { toastType } from '../enums/enums';

@Injectable()
export class ToastService {
  public toastInstance: Toast = new Toast();
  public toastObj: Toast = new Toast();

  constructor() {}

  createToast: Function = (element: HTMLElement, model: ToastModel): Toast => {
    if (!element.classList.contains('e-toast')) {
      model.animation = {
        show: { effect: 'FadeZoomIn' },
        hide: { effect: 'FadeZoomOut' },
      };
      model.position = { X: 'Right', Y: 'Bottom' };
      model.cssClass = 'e-toast-info fa fa-info-circle ';
   
      this.toastObj = new Toast(model, element);
    }
    return this.toastObj;
  };

  showMyToast: Function = (
    content: string,
    type: string,
    timeOut: number = 10000
  ) => {
    const toast: ToastModel = {
      content: content,
      timeOut: timeOut,
    };

    const toastObj = ToastUtility.show({
      title: '',
      // toast.title != null
      //   ? toast.title
      //   : type == toastType.error
      //   ? 'Error'
      //   : type == toastType.information
      //   ? 'Información'
      //   : type == toastType.success
      //   ? 'Exito'
      //   : 'Precaución',
      content: toast.content,
      timeOut: toast.timeOut == null ? 5000 : toast.timeOut,
      position: { X: 'Right', Y: 'Bottom' },
      showCloseButton: false,
      height: 70,
      icon:
        type == toastType.error
          ? 'e-icons e-large e-circle-error'
          : type == toastType.success ? 'e-icons e-large e-circle-check'
          : type == toastType.warning ? 'e-icons e-large e-warning'
          : 'e-icons e-large e-circle-info',
      cssClass:
        type == toastType.error
          ? 'e-toast-danger'
          : type == toastType.success
          ? 'e-toast-success'
          : type == toastType.warning
          ? 'e-toast-warning'
          : 'e-toast-info',
      showProgressBar: true,
      click: () => {
        toastObj.hide();
      },
      // buttons: [
      //   {
      //     model: { content: 'Cerrar' },
      //     click: () => {
      //       toastObj.hide();
      //     },
      //   },
      // ],
    });
  };

  showToast: Function = (elemnet: HTMLElement, model: ToastModel) => {
    this.toastInstance = this.createToast(elemnet, model);
    this.toastInstance.show();
  };

  hideToast: Function = () => {
    if (this.toastInstance) {
      this.toastInstance.hide();
    }
  };

  hideToastAll: Function = () => {
    if (this.toastInstance) {
      this.toastInstance.hide('All');
    }
  };
}
