import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormBuilder } from '@angular/forms'
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'app-investment';
}
