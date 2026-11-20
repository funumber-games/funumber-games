# Skipping Frog — Game Design

## Learning goal

Children practise skip counting by 2, 3, 5, and 10. Each correct answer advances a frog along a visible number path, connecting repeated addition with movement.

## Starting rule

The frog visually waits at Stone 1, but the mathematical sequence begins at zero. Therefore the first valid jump is the skip number itself:

- Skip by 2 → first jump is 2
- Skip by 3 → first jump is 3
- Skip by 5 → first jump is 5
- Skip by 10 → first jump is 10

After the first jump, the rule is always `next = current + skip`.

## Screen and interaction design

- A four-section wheel chooses 2, 3, 5, or 10.
- A horizontally scrolling river holds stones numbered 1–100.
- Stones move up and down in a repeating curve to form a winding path.
- The camera follows the frog and keeps the next group of stones visible.
- Players can also swipe or scroll the river manually.

## Modes

| Mode | Correct jumps needed |
|---|---:|
| Simple | 6 |
| Moderate | 10 |
| Difficult | 15 |

The round also finishes if the next multiple would be greater than 100.

## State and logic

```text
state = {
  currentStoneValue: 0,
  activeSkipMultiplier: null,
  jumpsCompleted: 0,
  mode,
  phase
}

spinWheel():
  activeSkipMultiplier = random choice of [2, 3, 5, 10]
  currentStoneValue = 0
  expected = activeSkipMultiplier
  move camera near expected

checkStone(clickedStoneValue):
  expected = currentStoneValue + activeSkipMultiplier

  if clickedStoneValue == expected:
    animate frog jump
    currentStoneValue = clickedStoneValue
    jumpsCompleted += 1
    if jump goal reached or next value > 100:
      show win banner
    else:
      move camera toward currentStoneValue + activeSkipMultiplier
  else:
    animate clicked stone sinking
    animate frog splash
    show try-again banner
    reset to the starting stone and require a new spin
```

## Feedback and accessibility

- Correct stones receive the frog and a success message.
- An incorrect stone turns coral, sinks, and produces a splash before the friendly retry banner.
- The prompt repeats the addition relationship after each jump.
- Each stone is a large labelled button with an accessible name.

## Assets

- Reused: FuNumber navigation, mode controls, `win-banner.jpg`, and `loss-banner.jpg`.
- Code-generated: river, stones, spinning wheel, camera movement, sink and splash animations.
- Character: standard frog emoji, so no external image asset is required.
