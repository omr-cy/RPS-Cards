import fs from 'fs';
const rock = fs.readFileSync('public/rock.png').toString('base64');
console.log('ROCK_START');
console.log(rock);
console.log('ROCK_END');
