import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GeoMedallionsAdminPageRoutingModule } from './geo-medallions-admin-routing.module';
import { GeoMedallionsAdminPage } from './geo-medallions-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    GeoMedallionsAdminPageRoutingModule,
    GeoMedallionsAdminPage
  ]
})
export class GeoMedallionsAdminPageModule {}
