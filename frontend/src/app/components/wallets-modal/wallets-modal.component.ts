import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  selector: 'app-wallets-modal',
  templateUrl: './wallets-modal.component.html',
  styleUrls: ['./wallets-modal.component.scss'],
})
export class WalletsModalComponent  implements OnInit {
  @Input() public walletExtensions: any = {};
  public selectedWallet: any = null;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {}

  selectWallet(walletType: string) {
    this.selectedWallet = { wallet: walletType };
    return this.modalCtrl.dismiss(this.selectedWallet, 'confirm');
  }

  closeModal() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

}
