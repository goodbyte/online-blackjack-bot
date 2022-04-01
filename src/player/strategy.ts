// S - Stand
// H - Hit
// D - Double
// T - Split
export type Plays = 'S' | 'H' | 'D' | 'T';

export const hard: Array<Plays | undefined>[] = [];
// Dealer ->   2    3    4    5    6    7    8    9    10   A
hard[4]  = [,,'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
hard[5]  = [,,'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
hard[6]  = [,,'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
hard[7]  = [,,'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
hard[8]  = [,,'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'];
hard[9]  = [,,'H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'];
hard[10] = [,,'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'];
hard[11] = [,,'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'];
hard[12] = [,,'H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'];
hard[13] = [,,'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'];
hard[14] = [,,'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'];
hard[15] = [,,'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'];
hard[16] = [,,'S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'];
hard[17] = [,,'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'];

export const soft: Array<Plays | undefined>[] = []; // A+2 = soft[2], A+3 = soft[3]
// Dealer ->   2    3    4    5    6    7    8    9    10   A
soft[2] =  [,,'H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'];
soft[3] =  [,,'H', 'H', 'H', 'D', 'D', 'H', 'H', 'H', 'H', 'H'];
soft[4] =  [,,'H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'];
soft[5] =  [,,'H', 'H', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'];
soft[6] =  [,,'H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'];
soft[7] =  [,,'S', 'D', 'D', 'D', 'D', 'S', 'S', 'H', 'H', 'S'];
soft[8] =  [,,'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'];
soft[9] =  [,,'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'];
soft[10] = [,,'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'];

export const pairs: Array<Plays | undefined>[] = []; // 2+2 = pairs[2], 3+3 = pairs[3]
// Dealer ->    2    3    4    5    6    7    8    9    10   A
pairs[2]  = [,,'T', 'T', 'T', 'T', 'T', 'T', 'H', 'H', 'H', 'H'];
pairs[3]  = [,,'T', 'T', 'T', 'T', 'T', 'T', 'H', 'H', 'H', 'H'];
pairs[4]  = [,,'H', 'H', 'H', 'T', 'T', 'H', 'H', 'H', 'H', 'H'];
pairs[5]  = [,,'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'];
pairs[6]  = [,,'T', 'T', 'T', 'T', 'T', 'H', 'H', 'H', 'H', 'H'];
pairs[7]  = [,,'T', 'T', 'T', 'T', 'T', 'T', 'H', 'H', 'H', 'H'];
pairs[8]  = [,,'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T'];
pairs[9]  = [,,'T', 'T', 'T', 'T', 'T', 'S', 'T', 'T', 'S', 'S'];
pairs[10] = [,,'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'];
pairs[11] = [,,'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T'];