import { Component } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Store } from '@ngrx/store';
import { AppState } from '../store/app.state';
import * as ProfileActions from '../store/profile.actions';
import * as XLSX from 'xlsx';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-json-utility',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './json-utility.component.html',
  styleUrl: './json-utility.component.css',
})
export class JsonUtilityComponent {
  date: string = '';

  constructor(
    private store: Store<AppState>,
    private supabase: SupabaseService
  ) {}

  downloadJson() {
    this.store.dispatch(ProfileActions.addLoader());
    this.supabase.selectNewDataMiningAllMatches().subscribe((data) => {
      // const newData = data.map(
      //   ({
      //     home_goals,
      //     away_goals,
      //     home_goalsht,
      //     away_goalsht,
      //     result,
      //     halftime_result,
      //     ...keepAttrs
      //   }) => keepAttrs
      // );
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'training.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      // const dataFiltered = data.filter(elem => {
      //   const diff = elem.igbc - elem.igbo;
      //   // return elem.draw_perc >= 0.29 && diff < 30 && diff > -30 && elem.diff >= -0.3;
      //   return elem.draw_perc >= 0.26 && (elem.diff != null && elem.diff >= -0.3) && diff < 45 && diff > -45;
      // })
      // console.log(dataFiltered);
      // const xMatches = dataFiltered.filter(elem => elem.home_goalsht === elem.away_goalsht);
      // console.log(xMatches)

      this.store.dispatch(ProfileActions.removeLoader());
    });
  }

  downloadJsonTraining() {
    this.store.dispatch(ProfileActions.addLoader());
    this.supabase.selectNewDataMiningAllMatches().subscribe((data) => {
      const training = data.filter(match => match.date !== this.date);
      const prediction = data.filter(match => match.date === this.date);
      const predictionFormatted = prediction.map(
        ({
          home_goals,
          away_goals,
          home_goalsht,
          away_goalsht,
          result,
          halftime_result,
          ...keepAttrs
        }) => keepAttrs
      );
      const blob = new Blob([JSON.stringify(training, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'training.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      
      const blob2 = new Blob([JSON.stringify(predictionFormatted, null, 2)], {
        type: 'application/json',
      });
      const url2 = window.URL.createObjectURL(blob2);
      const a2 = document.createElement('a');
      a2.href = url2;
      a2.download = 'prediction.json';
      document.body.appendChild(a2);
      a2.click();
      document.body.removeChild(a2);
      window.URL.revokeObjectURL(url2);

      this.store.dispatch(ProfileActions.removeLoader());
    });
  }

  downloadJsonPrediction() {
    this.store.dispatch(ProfileActions.addLoader());
    this.supabase.selectNewDataMiningAllMatches().subscribe((data) => {
      const training = data.filter(match => match.date !== this.date);
      const prediction = data.filter(match => match.date === this.date);
      const predictionFormatted = prediction.map(
        ({
          home_goals,
          away_goals,
          home_goalsht,
          away_goalsht,
          result,
          halftime_result,
          ...keepAttrs
        }) => keepAttrs
      );
      const blob = new Blob([JSON.stringify(training, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'training.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      
      const blob2 = new Blob([JSON.stringify(predictionFormatted, null, 2)], {
        type: 'application/json',
      });
      const url2 = window.URL.createObjectURL(blob2);
      const a2 = document.createElement('a');
      a2.href = url;
      a2.download = 'prediction.json';
      document.body.appendChild(a2);
      a2.click();
      document.body.removeChild(a2);
      window.URL.revokeObjectURL(url2);

      this.store.dispatch(ProfileActions.removeLoader());
    });
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Leggiamo il primo foglio
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convertiamo in JSON
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const json = jsonData.map((elem: any) => {
        return {
          match: elem['__EMPTY'],
          same_match: elem['__EMPTY_3'],
          home_perc: elem['__EMPTY_4'],
          home_odds: elem['__EMPTY_5'],
          draw_perc: elem['__EMPTY_6'],
          draw_odds: elem['__EMPTY_7'],
          away_perc: elem['__EMPTY_8'],
          away_odds: elem['__EMPTY_9'],
          mge: elem['__EMPTY_10'],
          diff: elem['__EMPTY_11'],
          goal_perc: elem['__EMPTY_12'],
          goal_odds: elem['__EMPTY_13'],
          ov15_perc: elem['__EMPTY_14'],
          ov15_odds: elem['__EMPTY_15'],
          ov25_perc: elem['__EMPTY_16'],
          ov25_odds: elem['__EMPTY_17'],
          un35_perc: elem['__EMPTY_18'],
          un35_odds: elem['__EMPTY_19'],
          ov05ht_perc: elem['__EMPTY_20'],
          ov05ht_odds: elem['__EMPTY_21'],
          ic: elem['__EMPTY_22'],
          rc: elem['__EMPTY_23'],
          ro: elem['__EMPTY_24'],
          sc: elem['__EMPTY_25'],
          igbc: elem['__EMPTY_26'],
          sc_odds: elem['__EMPTY_27'],
          so: elem['__EMPTY_28'],
          igbo: elem['__EMPTY_29'],
          so_odds: elem['__EMPTY_30'],
        };
      });

      json.shift();

      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prediction.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.store.dispatch(ProfileActions.removeLoader());
    };
    this.store.dispatch(ProfileActions.addLoader());
    reader.readAsArrayBuffer(file);
  }
}
