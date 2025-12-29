# CollMind TPM Frontend

A modern React.js frontend application for the CollMind Trade Promotion Management (TPM) system.

## Technology Stack

- **Core Framework**: React 18.x with TypeScript 5.3+
- **Build Tool**: Vite 5.x
- **State Management**: Redux Toolkit 2.x (Global State) + TanStack Query 5.x (Server State)
- **UI Components**: Tailwind CSS 3.x + shadcn/ui + Radix UI
- **Forms**: React Hook Form 7.x + Zod 3.x
- **HTTP Client**: Axios 1.x
- **Testing**: Vitest 1.x + React Testing Library 14.x + MSW 2.x
- **Routing**: React Router 6.x

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=CollMind TPM
VITE_APP_VERSION=1.0.0
```

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── api/                    # API client and endpoints
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── features/          # Feature-specific components
│   └── common/            # Common utility components
├── store/                 # Redux store and slices
├── services/              # TanStack Query services
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
├── lib/                   # Third-party configurations
├── types/                 # TypeScript types
├── schemas/               # Zod validation schemas
└── routes/                # Route configuration
```

## Features

- ✅ Authentication with JWT tokens
- ✅ Protected routes with role-based access control
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Form validation with React Hook Form + Zod
- ✅ State management with Redux Toolkit and TanStack Query
- ✅ Type-safe API client with Axios
- ✅ Testing infrastructure with Vitest and MSW

## Development Guidelines

See the comprehensive documentation in the project documentation for:
- API endpoints documentation
- Component architecture
- State management patterns
- Form management
- UI/UX design system
- Testing strategy

## License

Copyright © 2024 CollMind. All rights reserved.

