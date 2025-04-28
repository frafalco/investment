import { DataMiningNewMatch } from '../models/datamining_new_match';

export interface Parlay {
  id: number;
  date: string;
  odds: number;
  result: boolean;
  matches: ParlayMatch[];
  unit: number;
  bet: number;
  profitUnit: number;
  profit: number;
  cumulatedProfit: number;
  cumulatedProfitUnit: number;
}

export interface ParlayMatch {
  odds: number;
  result: string;
  match: string;
  date: string;
}

export interface BTResponse {
  parlays: Parlay[];
  totalBets: number;
  betWon: number;
  cumulatedProfit: number;
  maxDrawDown: number;
  relativeDrawDown: number;
  maxLostSequence: number;
}

export class BtUtils {
  static chunkWithNoSingleLast(matches: DataMiningNewMatch[], size = 3) {
    const result = [];
    for (let i = 0; i < matches.length; i += size) {
      result.push(matches.slice(i, i + size));
    }

    if (result.length > 1 && result[result.length - 1].length === 1) {
      const last = result.pop();
      result[result.length - 1].push(...last!);
    }

    return result;
  }

  static ov05htLogic(matches: DataMiningNewMatch[], unitValue: number): BTResponse {
    const parlays: Parlay[] = [];
    let maxLostSequence = 0;

    let cumulatedProfit = 0;
    let maxDrawDown = 0;
    let relativeDrawDown = 0;
    const unit = 1;
    const bet = unit * unitValue;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let currentDrawDown = 0;
    let currentLostSequence = 0;
    const matchesMap = new Map<string, DataMiningNewMatch[]>();
    matches.forEach((m) => {
      let array = matchesMap.get(m.date);
      if (array) {
        array.push(m);
        matchesMap.set(m.date, array);
      } else {
        matchesMap.set(m.date, [m]);
      }
    });
    const keys = Array.from(matchesMap.keys());
    let id = 1;
    keys.forEach((key) => {
      const matchArray = matchesMap.get(key);
      const chunks = this.chunkWithNoSingleLast(matchArray!, 3);
      chunks.forEach((chunk) => {
        let result = true;
        let odds = 1;
        const parlayMatches: ParlayMatch[] = [];
        chunk.forEach((match) => {
          const m: ParlayMatch = {
            odds: match.ov05ht_odds,
            match: match.match,
            result: match.halftime_result,
            date: `${match.date}T${match.hour}`,
          };
          odds = odds * match.ov05ht_odds;
          const matchResult = match.home_goalsht + match.away_goalsht > 0;
          result = result && matchResult;
          parlayMatches.push(m);
        });
        const parlay: Parlay = {
          id,
          date: key,
          odds,
          result,
          matches: parlayMatches,
          unit: 1,
          bet: unitValue,
          profitUnit: 0,
          profit: 0,
          cumulatedProfit: 0,
          cumulatedProfitUnit: 0,
        };
        id++;
        parlays.push(parlay);
      });
    });
    parlays.forEach((parlay) => {
      const profit = parlay.result ? bet * parlay.odds - bet : -bet;
      const profitUnit = parlay.result ? unit * parlay.odds - unit : -unit;
      cumulatedProfit += profit;
      if (cumulatedProfit < maxDrawDown) {
        maxDrawDown = cumulatedProfit;
      }
      cumulatedProfitUnit += profitUnit;
      parlay.profit = profit;
      parlay.profitUnit = profitUnit;
      parlay.cumulatedProfit = cumulatedProfit;
      parlay.cumulatedProfitUnit = cumulatedProfitUnit;
      if (parlay.result) {
        betWon++;
        currentLostSequence = 0;
      } else {
        currentLostSequence++;
      }
      if (currentLostSequence > maxLostSequence) {
        maxLostSequence = currentLostSequence;
      }
      if (profit < 0) {
        currentDrawDown += profit;
        if (currentDrawDown < relativeDrawDown) {
          relativeDrawDown = currentDrawDown;
        }
      }
    });
    const totalBets = parlays.length;

    return {
      parlays,
      totalBets,
      maxLostSequence,
      betWon,
      cumulatedProfit,
      maxDrawDown,
      relativeDrawDown,
    };
  }

  static xftLogic(matches: DataMiningNewMatch[], unitValue: number): BTResponse {
    const parlays: Parlay[] = [];
    let maxLostSequence = 0;

    let cumulatedProfit = 0;
    let maxDrawDown = 0;
    let relativeDrawDown = 0;
    const unit = 1;
    const bet = unit * unitValue;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let currentDrawDown = 0;
    let currentLostSequence = 0;
    const matchesMap = new Map<string, DataMiningNewMatch[]>();
    matches.forEach((m) => {
      let array = matchesMap.get(m.date);
      if (array) {
        array.push(m);
        matchesMap.set(m.date, array);
      } else {
        matchesMap.set(m.date, [m]);
      }
    });
    const keys = Array.from(matchesMap.keys());
    let id = 1;
    keys.forEach((key) => {
      const matchArray = matchesMap.get(key);
      matchArray!.forEach((match) => {
        const m: ParlayMatch = {
          odds: match.draw_odds,
          match: match.match,
          result: match.result,
          date: `${match.date}T${match.hour}`,
        };
        const odds = match.draw_odds;
        const isDraw = match.home_goals === match.away_goals;
        const parlay: Parlay = {
            id,
            date: key,
            odds,
            result: isDraw,
            matches: [m],
            unit: 1,
            bet: unitValue,
            profitUnit: 0,
            profit: 0,
            cumulatedProfit: 0,
            cumulatedProfitUnit: 0,
          };
          id++;
          parlays.push(parlay);
      });
    });
    parlays.forEach((parlay) => {
      const profit = parlay.result ? bet * parlay.odds - bet : -bet;
      const profitUnit = parlay.result ? unit * parlay.odds - unit : -unit;
      cumulatedProfit += profit;
      if (cumulatedProfit < maxDrawDown) {
        maxDrawDown = cumulatedProfit;
      }
      cumulatedProfitUnit += profitUnit;
      parlay.profit = profit;
      parlay.profitUnit = profitUnit;
      parlay.cumulatedProfit = cumulatedProfit;
      parlay.cumulatedProfitUnit = cumulatedProfitUnit;
      if (parlay.result) {
        betWon++;
        currentLostSequence = 0;
      } else {
        currentLostSequence++;
      }
      if (currentLostSequence > maxLostSequence) {
        maxLostSequence = currentLostSequence;
      }
      if (profit < 0) {
        currentDrawDown += profit;
        if (currentDrawDown < relativeDrawDown) {
          relativeDrawDown = currentDrawDown;
        }
      }
    });
    const totalBets = parlays.length;

    return {
      parlays,
      totalBets,
      maxLostSequence,
      betWon,
      cumulatedProfit,
      maxDrawDown,
      relativeDrawDown,
    };
  }

  static xhtLogic(matches: DataMiningNewMatch[], unitValue: number): BTResponse {
    const parlays: Parlay[] = [];
    let maxLostSequence = 0;

    let cumulatedProfit = 0;
    let maxDrawDown = 0;
    let relativeDrawDown = 0;
    const unit = 1;
    const bet = unit * unitValue;
    let cumulatedProfitUnit = 0;
    let betWon = 0;
    let currentDrawDown = 0;
    let currentLostSequence = 0;
    const matchesMap = new Map<string, DataMiningNewMatch[]>();
    matches.forEach((m) => {
      let array = matchesMap.get(m.date);
      if (array) {
        array.push(m);
        matchesMap.set(m.date, array);
      } else {
        matchesMap.set(m.date, [m]);
      }
    });
    const keys = Array.from(matchesMap.keys());
    let id = 1;
    keys.forEach((key) => {
      const matchArray = matchesMap.get(key);
      matchArray!.forEach((match) => {
        const m: ParlayMatch = {
          odds: 2,
          match: match.match,
          result: match.result,
          date: `${match.date}T${match.hour}`,
        };
        const odds = 2;
        const isDraw = match.home_goalsht === match.away_goalsht;
        const parlay: Parlay = {
            id,
            date: key,
            odds,
            result: isDraw,
            matches: [m],
            unit: 1,
            bet: unitValue,
            profitUnit: 0,
            profit: 0,
            cumulatedProfit: 0,
            cumulatedProfitUnit: 0,
          };
          id++;
          parlays.push(parlay);
      });
    });
    parlays.forEach((parlay) => {
      const profit = parlay.result ? bet * parlay.odds - bet : -bet;
      const profitUnit = parlay.result ? unit * parlay.odds - unit : -unit;
      cumulatedProfit += profit;
      if (cumulatedProfit < maxDrawDown) {
        maxDrawDown = cumulatedProfit;
      }
      cumulatedProfitUnit += profitUnit;
      parlay.profit = profit;
      parlay.profitUnit = profitUnit;
      parlay.cumulatedProfit = cumulatedProfit;
      parlay.cumulatedProfitUnit = cumulatedProfitUnit;
      if (parlay.result) {
        betWon++;
        currentLostSequence = 0;
      } else {
        currentLostSequence++;
      }
      if (currentLostSequence > maxLostSequence) {
        maxLostSequence = currentLostSequence;
      }
      if (profit < 0) {
        currentDrawDown += profit;
        if (currentDrawDown < relativeDrawDown) {
          relativeDrawDown = currentDrawDown;
        }
      }
    });
    const totalBets = parlays.length;

    return {
      parlays,
      totalBets,
      maxLostSequence,
      betWon,
      cumulatedProfit,
      maxDrawDown,
      relativeDrawDown,
    };
  }
}
