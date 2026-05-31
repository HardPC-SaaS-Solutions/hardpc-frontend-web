import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, RouterModule],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {}
