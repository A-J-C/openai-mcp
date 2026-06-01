# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- _nothing yet_


## [1.0.0] - 2026-06-01

### Added

- `generate_image` — create images from a text prompt using gpt-image-1; result appears inline and is saved to ~/Downloads
- `edit_image` — edit an existing image with a text prompt and optional mask using gpt-image-1
- `poll_image_job` — check the status of an async image generation or edit job
- `chatgpt_critique` — send reasoning to GPT-4o for a structured second opinion (Flaws, Blind spots, Alternatives, Counterarguments, Strengths, Overall assessment)
- `chatgpt_critique_batch` — run multiple critique requests in a single call for bulk adversarial review
