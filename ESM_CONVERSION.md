# ES Modules Conversion

This project has been converted to use ES Modules with Webpack for broader browser compatibility.

## Changes Made

1. Split the combined.js file into modular components
2. Added Webpack for bundling and transpilation
3. Updated package.json with type: "module" and necessary dependencies
4. Set up backward compatibility to ensure existing code continues to work

## Development

- Run `npm start` to start the development server
- Run `npm run build` to create a production build

## Structure

- `src/` - Source files directory
  - `js/` - JavaScript module files
    - `calculations.js` - Risk calculation functions
    - `medication.js` - Medication management
    - `ui.js` - User interface functionality
    - `validation.js` - Form validation
    - `utils.js` - Utility functions
  - `index.js` - Main entry point
  - `styles.css` - Styles copied from original

## Backwards Compatibility

All functions from the original combined.js are still available in the global scope for backwards compatibility. This allows existing code to continue working while gradually transitioning to import/export syntax.
