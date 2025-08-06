import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GeoMedallionsAdminPage } from './geo-medallions-admin.page';

const routes: Routes = [
  {
    path: '',
    component: GeoMedallionsAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeoMedallionsAdminPageRoutingModule {}
