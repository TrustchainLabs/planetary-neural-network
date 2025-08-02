import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoginPage } from './login.page';

@NgModule({
  imports: [
    RouterModule.forChild([{ path: '', component: LoginPage }]),
    LoginPage
  ]
})
export class LoginPageModule {}
