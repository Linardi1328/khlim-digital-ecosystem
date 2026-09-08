# Media staging

Use this folder to manually add **public-safe media assets** that may be implemented later in the KHLIM website, member portal, admin app, or future mobile app.

## What belongs here

- KHLIM logos, brand assets, icons, and approved graphics
- Public programme, venue, event, merchandise, or campaign photos/videos
- Approved UI screenshots or promotional media
- Placeholder/mock media for development

## Important privacy rules

This repository is public. Do **not** commit secrets, private member data, medical information, payment data, private documents, or identifiable photos/videos of children unless the appropriate consent and publication rights are confirmed.

## File conventions

- Prefer descriptive lowercase kebab-case filenames, e.g. `u12-training-puchong-01.jpg`.
- Keep original/source files intact where practical.
- Avoid committing unnecessary duplicate exports.
- Large production media should eventually move to the product's approved storage/CDN rather than being served directly from this staging folder.

## Implementation rule

Treat `media/` as a manual staging area, not an application runtime path. When an asset is approved for use, implementation work should deliberately move/copy it into the correct application location (for example an app `public/` directory or managed object storage) and reference it from code there.
