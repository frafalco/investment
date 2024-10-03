import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Form, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { NgModule } from '@angular/core';

@Component({
  selector: 'app-add-bet',
  standalone: true,
  imports: [CommonModule, RouterOutlet,FormsModule, RouterLink, RouterLinkActive,ReactiveFormsModule],
  templateUrl: './add-bet.component.html',
  styleUrl: './add-bet.component.css'
})

export class AddBetComponent {

  public Bet = Bet;
  console = console
  pageLoading = true;
  loading = false;
  isInitialized = false;
  errorMessage: string | null = null;
  options = ['Won', 'Lost', 'Pending'];
  selectedOption: string | undefined ;
  
  
    submitForm = new FormGroup({
      bookmaker: new FormControl('',Validators.required),
      odds:  new FormControl('', Validators.required),
      stake:  new FormControl('',Validators.required),
      result:  new FormControl('', Validators.required)
    });


 


  constructor(private supabaseService: SupabaseService) {
   
  }

  onSubmit() {
    this.console.log(this.submitForm.value);
    
    const bookmaker: string = this.submitForm.value.bookmaker as string;
    const odds: string = this.submitForm.value.odds as string;
    const stake: string = this.submitForm.value.stake as string;
    const result: string = this.submitForm.value.result as string;
    this.submitForm = new FormGroup({
      bookmaker: new FormControl(bookmaker,Validators.required),
      odds:  new FormControl(odds, Validators.required),
      stake:  new FormControl(stake,Validators.required),
      result:  new FormControl(result, Validators.required)
    });
    
    this.supabaseService.submitForm(this.submitForm.value)
      .then((response) => {
        this.console.log(response);
      })
      .catch((error) => {
        this.console.log(error);
      });
    }


  

  results: any[] = [
    { id: 1, value : 'Pending' }, 
    { id: 2, value : 'Lost' },
    { id: 3, value : 'Won' }
  ];
  

}



export enum Bet {
  Pending = "Pending",
  Won = "Won",
  Lost = "Lost"
}
