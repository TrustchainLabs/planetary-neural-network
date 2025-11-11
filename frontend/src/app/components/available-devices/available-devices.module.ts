import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AvailableDevicesComponent } from './available-devices.component';

@NgModule({
  declarations: [AvailableDevicesComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [AvailableDevicesComponent]
})
export class AvailableDevicesModule { }

