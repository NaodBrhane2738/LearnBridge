# LearnBridge Glass UI System

## Visual reference

The layout follows the supplied reference image: a living-room photographic background; a wide floating glass course header; a compact vertical quick-navigation capsule; one large frosted media surface; translucent chapter cards; and a deeper green glass curriculum panel on the right.

## Visual language

- **Backdrop:** warm neutral living-room interior, emerald upholstery and plant detail; dark ambient gradient is layered over the photo to preserve foreground legibility.
- **Header:** smoky silver glass, large rounded capsule, bright white typography, soft border and shadow.
- **Player frame:** light, translucent glass around a dark media canvas. The video itself is not covered with translucent decoration that would reduce viewing clarity.
- **Course panel:** green-tinted translucent surface with high-contrast white text and a crisp blue selected lesson.
- **Chapter tiles:** teal glass cards with a clear selected state and readable chapter/time labels.
- **Actions:** blue primary action; neutral glass secondary actions; green/teal functional surfaces.
- **Typography:** DM Sans for Latin interface text and Noto Sans Ethiopic for Amharic, with local system fallbacks.

## Components

- Floating course header: course title, back, connection status, search, bookmark, share, preferences, note and next-class action.
- Vertical quick navigation: home, course, career, recent learning, help and preferences.
- Media stage: HTML video, play overlay, seek slider, time readout, volume, captions, audio description, interpreter slot and fullscreen.
- Chapter strip: four selectable chapter cards synchronized with the active transcript segment.
- Course panel: expandable curriculum groups with Classes, Transcript and Files tabs.
- Transcript: language toggle, search, synchronized active line and click-to-seek.
- Interpreter panel: placeholder region plus non-drag move/resize controls. Replace with authorized Ethiopian Sign Language media before real use.
- Notes dialog: device-local lesson note.
- Preferences dialog: caption size, high-contrast captions, reduced motion and interpreter visibility.
- Offline card: explicit download of the sample lesson pack.
- Career card: sample job summary and save action.

## Motion

- Initial header and panels settle into place with short opacity/translation transitions.
- Buttons have restrained hover/focus feedback.
- The interpreter placeholder has a subtle ring pulse.
- `prefers-reduced-motion` and the user-controlled Reduce Motion preference suppress decorative movement and smooth scrolling.

## Accessibility constraints

- Keep controls semantic and labelled.
- Do not rely on colour, hover, drag or animation alone to communicate state.
- Keep focus visible against glass surfaces.
- Maintain a solid, high-contrast caption mode.
- Preserve keyboard alternatives for interpreter movement and size changes.
- Verify 400% zoom/reflow and minimum pointer target sizing in the integrated layout.
- The design is not WCAG-certified; validate it with assistive technology and co-design participants.
