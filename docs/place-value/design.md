# Place Value Builder — Game Design

## Learning goal

Children connect each digit in a three-digit number with its place: hundreds, tens, and ones. The visible block heights reinforce quantity while the roller keeps each round playful.

## Screen and interaction design

- The left roller shows one three-digit target.
- The right board has blue Hundreds, green Tens, and yellow Ones columns.
- Each column has exactly nine numbered blocks, arranged bottom to top.
- Clicking block `n` lights blocks 1 through `n`.
- A separate **0 / None** control sits below each stack. This makes zero an intentional answer rather than an untouched column.
- The game checks automatically after all three columns have a selection.

## Modes

| Mode | Rounds | Number pool |
|---|---:|---|
| Simple | 6 | Digits 1–5, with no zero |
| Moderate | 10 | Digits 0–9, with no `00` ending |
| Difficult | 15 | Any number from 100–999, including internal and repeated zeros |

## State and logic

```text
state = {
  targetNumber,
  selectedHundreds,
  selectedTens,
  selectedOnes,
  round,
  score,
  mode,
  busy
}

startRound():
  clear all three selections
  animate the number roller
  targetNumber = generateNumberForMode(mode)
  show targetNumber

select(place, height):
  set the selected value for place to height (0–9)
  light blocks 1 through height
  if all three places have a selection:
    validateAnswer()

validateAnswer():
  expectedHundreds = floor(targetNumber / 100)
  expectedTens = floor(targetNumber / 10) mod 10
  expectedOnes = targetNumber mod 10

  if every selection equals its expected digit:
    celebrate
    increase score and round
    if all rounds complete: show win banner
    else: startRound()
  else:
    shake only the incorrect columns
    preserve every selection
    allow the player to change an answer
```

## Feedback and accessibility

- High-contrast colors are reinforced by written column names, so color is never the only cue.
- Incorrect columns turn red and shake gently. Correct answers glow green and release star confetti.
- Large buttons and block targets support touch screens.
- Status text is exposed as a live region for assistive technology.

## Assets

- Reused: FuNumber navigation style and `win-banner.jpg`.
- Code-generated: number roller, blocks, highlights, confetti, mode cards, dialogs.
- No new image or audio assets are required.
