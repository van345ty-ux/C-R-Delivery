# AI Development Rules

This document outlines the technology stack and coding conventions for this project. Adhering to these rules ensures consistency, maintainability, and high-quality code.

## Tech Stack

- **Framework**: React (v18) for building the user interface.
- **Build Tool**: Vite for fast development and optimized builds.
- **Language**: TypeScript for static typing and improved code quality.
- **Styling**: Tailwind CSS for all styling, following a utility-first approach.
- **UI Components**: shadcn/ui for pre-built, accessible, and customizable components.
- **Routing**: React Router for client-side navigation and routing.
- **Icons**: Lucide React for a comprehensive and consistent set of icons.
- **Forms**: React Hook Form for efficient and performant form management.
- **Notifications**: React Hot Toast for displaying toast notifications.

## Library and Coding Rules

### 1. UI and Components
- **Component Library**: **ALWAYS** use `shadcn/ui` components as the foundation for new UI elements.
- **Styling**: **ONLY** use Tailwind CSS classes for styling. Avoid custom CSS files or inline `style` attributes.
- **Icons**: **EXCLUSIVELY** use icons from the `lucide-react` library. Do not introduce other icon sets.

### 2. Routing
- **Library**: Use `react-router-dom` for all navigation and routing logic.
- **Route Definitions**: All primary routes **MUST** be defined within `src/App.tsx`.

### 3. State Management
- **Local State**: Use React's built-in hooks (`useState`, `useReducer`) for component-level state.
- **Global State**: For now, pass state down through props. Before introducing a global state management library (like Zustand or Redux), confirm with the user.

### 4. Forms
- **Library**: **ALWAYS** use `react-hook-form` for handling forms. This ensures consistency, validation, and performance.

### 5. Notifications
- **Library**: Use `react-hot-toast` for all user-facing notifications (e.g., success messages, errors, loading indicators).

### 6. Code Structure
- **File Organization**:
    - Pages go in `src/pages/`.
    - Reusable components go in `src/components/`.
    - Custom hooks go in `src/hooks/`.
    - Utility functions go in `src/utils/`.
- **Component Granularity**: Keep components small, focused, and responsible for a single task.

### 7. Data Fetching
- **Default Method**: Use the browser's native `fetch` API for simple API calls.
- **Advanced Data Fetching**: Before adding a data-fetching library like `SWR` or `React Query`, confirm with the user.