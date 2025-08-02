import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SignUpPage } from './sign-up.page';

@NgModule({
  imports: [
    RouterModule.forChild([{ path: '', component: SignUpPage }]),
    SignUpPage
  ]
})
export class SignUpPageModule {}
