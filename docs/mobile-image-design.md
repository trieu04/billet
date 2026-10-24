# Mobile image presentation

Billet treats the photo as the memory and expense fields as supporting context. The original upload is always preserved. Cropping happens only in the rendered viewport with `cover`.

## Capture and amount entry

The MVP keeps amount entry manual. Entering one number is expected to be faster and more reliable than waiting for image inference and then confirming its result.

The default flow is:

1. Take or choose a photo.
2. Review it locally with **Retake** and **Use photo** actions.
3. Start upload only after **Use photo**, so discarded captures do not consume upload or inference work.
4. Focus the amount field immediately and show the numeric keyboard.
5. Save as soon as the amount is valid; photo upload may continue alongside entry when the storage contract supports it.

The capture path must not contain an AI loading or confirmation step. Amount, valid expense time, and the accepted photo are the authoritative inputs. Camera cancellation or retaking a photo must not create an expense or start remote image processing.

## Frame system

| Surface          | Frame        | Presentation                                 | Crop behavior                                                                       |
| ---------------- | ------------ | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Camera           | Portrait 3:4 | Full capture frame                           | Camera sensor uses 4:3 and is shown in portrait orientation                         |
| Capture review   | Portrait 3:4 | Full-width hero                              | Caption and timestamp sit on the photo; caption badge becomes an editor when tapped |
| Journal timeline | Portrait 3:4 | 220 pt cards in one horizontal shelf per day | Center cover crop; the next card remains visible to suggest horizontal scrolling    |
| Expense detail   | Portrait 3:4 | Full-width hero                              | Same crop as review and journal for visual continuity                               |
| Calendar         | Square 1:1   | Small thumbnail only                         | Center cover crop; the full portrait opens from the day summary                     |

## Center-crop cost

The percentages below describe the initial centered crop. They are useful for deciding when focal-point controls become necessary.

| Source         | Destination     | Visible source area | Removed                             |
| -------------- | --------------- | ------------------- | ----------------------------------- |
| Portrait 3:4   | Portrait 3:4    | 100%                | None                                |
| Square 1:1     | Portrait 3:4    | 75%                 | 12.5% from each horizontal edge     |
| Landscape 4:3  | Portrait 3:4    | 56.25%              | 21.875% from each horizontal edge   |
| Landscape 16:9 | Portrait 3:4    | 42.1875%            | 28.90625% from each horizontal edge |
| Portrait 3:4   | Calendar square | 75%                 | 12.5% from top and bottom           |

The next iteration should store a normalized focal point per media item. Review can then support drag-to-position within the 3:4 mask without altering the original file. Until that contract exists, capture and review use a centered crop and make the final frame visible before save.

## Interaction rules

- A journal day is a vertical section with one horizontal photo shelf. The day total stays fixed above the shelf, so scanning totals does not depend on carousel position.
- Review keeps amount and category as form controls below the image. Caption belongs on the image because it describes the moment; tapping the badge edits it in place.
- The caption badge has a 44 pt minimum target, two-line collapsed state, and a 120-character editing limit.
- Empty-photo expenses keep the same 3:4 geometry with Billet's receipt illustration, preventing layout jumps while media loads or fails.

## Future personalized inference

Personalized image inference is an expansion hypothesis, not an MVP dependency. Its intended value is broader than OCR: combine image context with the user's previously confirmed expenses to suggest structured data. For example, an image recognized as a familiar bus ticket could retrieve repeated confirmed fares and suggest `5,000 VND`.

If explored later, the inference flow should follow these rules:

- Run only after the user accepts the photo; never upload a capture that may still be retaken.
- Run asynchronously and never delay manual amount entry or saving.
- Retrieve from the current user's confirmed history instead of asking a model to invent an unrestricted amount.
- Return a suggestion with confidence and an explanation such as “Based on 8 similar expenses.”
- Let the user edit or ignore every suggestion, and never overwrite an amount they already entered or saved.
- Learn only from user-confirmed values. Unconfirmed AI output must not feed back into memory.
- Reduce the weight of old observations so recurring prices can change over time.
- Use confidence tiers: prefill high-confidence suggestions, offer likely choices at medium confidence, and fall back to manual entry at low confidence.

The product test for promoting this idea into the primary flow is whether it completes an expense faster than manual entry without reducing trust or accuracy. A 15–20 second result followed by mandatory confirmation does not meet that bar.
