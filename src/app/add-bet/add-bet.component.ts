import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-add-bet',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './add-bet.component.html',
  styleUrl: './add-bet.component.css'
})

export class AddBetComponent {

  public Bet = Bet;
  console = console
  pageLoading = true;
  loading = false;
  isInitialized = false;
  setupForm!: FormGroup;
  errorMessage: string | null = null;

  options = ['Won', 'Lost', 'Pending'];

  bambobrutto: any[] = [
    { id: 1, value : 'Pending' }, 
    { id: 2, value : 'Lost' },
    { id: 3, value : 'Won' }
  ];


  
  async onSubmitSetup(): Promise<void> {

    this.loading = true;

      
    
    this.loading = false;
  }
  

}



export enum Bet {
  Pending = "Pending",
  Won = "Won",
  Lost = "Lost"
}
