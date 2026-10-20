# Mobile image presentation

Billet treats the photo as the memory and expense fields as supporting context. The original upload is always preserved. Cropping happens only in the rendered viewport with `cover`.

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
