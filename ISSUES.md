# Tasker Application - Known Issues

## Development Server Issue
- **Problem**: Webpack dev server fails to start with error: `Invalid options object. Dev Server has been initialized using an options object that does not match the API schema. - options.allowedHosts[0] should be a non-empty string.`
- **Status**: Fixed by implementing react-app-rewired configuration
- **Solution Applied**: Created config-overrides.js to properly configure allowedHosts

## Build Issues
- **Problem**: Production build fails due to numerous linting errors
- **Status**: Workaround needed
- **Errors Include**:
  - Missing prop-types validations
  - Indentation issues
  - Unescaped entities
  - Unused variables
  - Quote style inconsistencies
  - Unknown property warnings

## Workarounds Applied
1. Created proper README.md with project documentation
2. Created comprehensive .gitignore file
3. Configured react-app-rewired to fix dev server issues
4. Documented setup and deployment instructions

## Recommended Next Steps
1. Address linting issues gradually to improve code quality
2. Consider implementing a CI/CD pipeline
3. Add unit tests for critical components
4. Consider upgrading dependencies periodically
5. Implement proper error boundaries
6. Add loading states and skeleton screens for better UX

## Deployment Notes
- The application can be built for production once linting issues are addressed
- Backend server needs to be running on port 5000
- Frontend expects API at http://localhost:5000/api
- Database migrations should be run before starting the backend