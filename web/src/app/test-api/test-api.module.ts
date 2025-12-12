import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TestApiComponent } from './components/test-api/test-api.component';



@NgModule({
  declarations: [
    TestApiComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
          {
            path: '',
            component: TestApiComponent,
            // children: [
            //   {
            //     path: '', component: Login2Component
            //   },
            //   {
            //     path: 'login', component: Login2Component
            //   },
            //   {
            //     path: 'signup', component: SignupComponent
            //   }
            // ]
          },
        ]),
  ],
  exports: [TestApiComponent]
})
export class TestApiModule { }
