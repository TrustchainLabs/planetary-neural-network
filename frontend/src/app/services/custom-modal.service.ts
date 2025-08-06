import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CustomModalComponent, ModalConfig } from '../components/common/custom-modal/custom-modal.component';

@Injectable({
  providedIn: 'root'
})
export class CustomModalService {
  constructor(private modalController: ModalController) {}

  async presentModal(config: ModalConfig): Promise<any> {
    console.log('CustomModalService: presentModal called with config:', config);
    const modal = await this.modalController.create({
      component: CustomModalComponent,
      componentProps: {
        config
      },
      cssClass: config.cssClass || 'custom-modal',
      backdropDismiss: false
    });

    console.log('CustomModalService: Modal created, presenting...');
    await modal.present();
    const { data } = await modal.onWillDismiss();
    console.log('CustomModalService: Modal dismissed with data:', data);
    return data;
  }

  async presentConfirm(
    header: string,
    message: string,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ): Promise<boolean> {
    console.log('CustomModalService: presentConfirm called:', { header, message, confirmText, cancelText });
    const config: ModalConfig = {
      header,
      message,
      type: 'confirm',
      buttons: [
        {
          text: cancelText,
          role: 'cancel'
        },
        {
          text: confirmText,
          handler: () => {
            console.log('CustomModalService: Confirm button handler called');
            return true;
          }
        }
      ]
    };

    const result = await this.presentModal(config);
    console.log('CustomModalService: presentConfirm result:', result);
    return result === true;
  }

  async presentInfo(
    header: string,
    message: string,
    buttonText = 'Close'
  ): Promise<void> {
    const config: ModalConfig = {
      header,
      message,
      type: 'info',
      buttons: [
        {
          text: buttonText,
          role: 'cancel'
        }
      ]
    };

    await this.presentModal(config);
  }

  async presentInput(
    header: string,
    inputs: any[],
    message?: string,
    confirmText = 'Submit',
    cancelText = 'Cancel'
  ): Promise<any> {
    const config: ModalConfig = {
      header,
      message,
      type: 'input',
      inputs,
      buttons: [
        {
          text: cancelText,
          role: 'cancel'
        },
        {
          text: confirmText,
          handler: (data) => data
        }
      ]
    };

    return await this.presentModal(config);
  }
}
