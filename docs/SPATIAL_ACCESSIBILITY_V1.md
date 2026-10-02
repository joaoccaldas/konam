# Spatial Accessibility V1

3D is an enhancement, not the only path to content.

Rules:
- every interactive 3D artifact has an equivalent semantic DOM representation
- selecting a 3D artifact may move focus to its DOM exhibit when that helps the current task
- aria-live updates are debounced so movement does not create an announcement queue
- essential navigation never requires avatar proximity
- reduced-motion and keyboard/touch alternatives remain functional

This contract does not claim WCAG AAA. Compliance requires a full criterion-by-criterion audit and real assistive-technology testing.
