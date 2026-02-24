# MapleStory Bonus Potential Calculator

A calculator for estimating the number of Bonus Bright/Glowing cubes needed to roll better bonus potentials in MapleStory.

## Features

- Calculate probability of rolling better FD% on bonus potentials
- Support for all item types and level ranges
- Compares Bonus Bright vs Bonus Glowing cube efficiency
- Percentile breakdowns (25th, 50th, 75th, 90th)
- Skill cooldown reduction support
- Persistent settings via localStorage

## Usage

1. Get your stat efficiency values from [MapleScouter](https://maplescouter.com/en/input)
2. Enter your character level and stat type
3. Fill in your current stat values and FD% from MapleScouter
4. Select your item type and current bonus potential lines
5. Click Calculate to see how many cubes you'll likely need

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Tech Stack

- React 18
- TypeScript
- Vite
