# AI Studio Application Rules

This document outlines the core technologies and library usage guidelines for this application. Adhering to these rules ensures consistency, maintainability, and efficient development.

## Tech Stack Overview

*   **Frontend Framework:** React (with TypeScript)
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui (pre-built components)
*   **Icons:** Lucide-react
*   **Routing:** React Router (managed in `src/App.tsx`)
*   **Backend/Database:** Supabase (for user profiles, inventory, history)
*   **AI Integration:** Google Gemini API (default) and OpenRouter (for alternative models)
*   **PDF Handling:** PDF.js (for rendering color charts)
*   **Sound Effects:** Web Audio API (custom implementation)
*   **Build Tool:** Vite

## Library Usage Guidelines

*   **React:** Use React for all UI development. Components should be functional components.
*   **TypeScript:** All new and modified files must use TypeScript for type safety and better code quality.
*   **React Router:** Manage all application routes within `src/App.tsx`.
*   **Tailwind CSS:** **Always** use Tailwind CSS for all styling. Avoid inline styles or custom CSS files unless absolutely necessary for very specific, isolated cases (e.g., scrollbar customization in `index.css`).
*   **shadcn/ui:** Utilize pre-built shadcn/ui components where applicable. If a component needs significant modification, create a new custom component instead of editing the shadcn/ui source.
*   **Lucide-react:** Use icons from the `lucide-react` library for all icon needs.
*   **Supabase:** All data persistence, authentication, and storage operations should be handled via the Supabase client (`services/supabase.ts` and `services/supabaseService.ts`).
*   **Google Gemini / OpenRouter:** AI recipe generation logic is encapsulated in `services/geminiService.ts`. Use the configured provider and model from user settings.
*   **PDF.js:** For rendering PDF documents (e.g., color charts), use `pdfjs-dist` as demonstrated in `components/ColorChartCalibrator.tsx`.
*   **Web Audio API:** Custom sound effects are managed through `contexts/SoundContext.tsx`. Use the `useSound` hook for playing sounds.
*   **File Structure:**
    *   `src/pages/`: For top-level views/pages.
    *   `src/components/`: For reusable UI components.
    *   `src/services/`: For API interactions and backend logic.
    *   `src/utils/`: For utility functions.
    *   `src/contexts/`: For React Context providers.
    *   `src/types.ts`: For global TypeScript interfaces.
    *   `src/constants.ts`: For application-wide constants.
*   **No other major UI frameworks or styling libraries** should be introduced without explicit approval.
*   **Keep it simple and elegant:** Prioritize clear, concise code. Avoid over-engineering.
*   **Full Functionality:** All implemented features must be fully functional with complete code; no placeholders or TODOs.