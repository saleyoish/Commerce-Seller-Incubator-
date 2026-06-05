# Live Commerce Seller Incubator - Project Structure Documentation

## Project Overview

**Live Commerce Seller Incubator Platform** is a full-stack Next.js 16 application designed to enable sellers to upload products, go live with their inventory, and sell through seamless Stripe checkout integration. The platform supports both sellers and administrators with comprehensive dashboards and management tools.

---

## Root Directory Files

### Configuration & Build Files

#### `next.config.ts`
- **Purpose**: Next.js configuration file that customizes the build process and runtime behavior
- **Key Features**:
  - Disables TypeScript build errors (`ignoreBuildErrors: true`) to allow builds with type issues
  - Empty configuration (ready for custom settings)
- **When Modified**: When adding new Next.js features, changing deployment settings, or integrating new external services

#### `tsconfig.json`
- **Purpose**: TypeScript compiler configuration that defines how TypeScript code is compiled to JavaScript
- **Key Settings**:
  - Target: ES2017 (ECMAScript 2017 compatibility)
  - Strict mode enabled for type safety
  - Module resolution: bundler (for Next.js compatibility)
  - JSX configured for React 19
  - Isolated modules for faster compilation
- **When Modified**: When changing TypeScript version, adding path aliases, or updating the JS target version

#### `postcss.config.mjs`
- **Purpose**: PostCSS configuration that processes CSS before it's sent to the browser
- **Current Setup**: Enables Tailwind CSS 4 with `@tailwindcss/postcss` plugin
- **When Modified**: When changing CSS preprocessing requirements or adding new PostCSS plugins

#### `eslint.config.mjs`
- **Purpose**: ESLint configuration for code quality and consistency checking
- **Current Setup**:
  - Extends Next.js core web vitals and TypeScript configurations
  - Ignores build output directories (`.next/`, `out/`, `build/`)
  - Ignores auto-generated Next.js type file (`next-env.d.ts`)
- **When Modified**: When adding new linting rules or changing code standards

#### `components.json`
- **Purpose**: shadcn/ui component library configuration
- **Use**: Defines how shadcn components are installed and configured in the project
- **When Modified**: When customizing shadcn component defaults or changing the UI framework settings

#### `tailwind.config.js`
- **Purpose**: Tailwind CSS configuration for styling system
- **Customization**: Define custom colors, spacing, fonts, and other design tokens
- **When Modified**: When updating the design system or color palette

#### `package.json`
- **Purpose**: Node.js project metadata and dependency management
- **Key Scripts**:
  - `dev`: Start development server (`next dev`)
  - `build`: Build for production (`next build`)
  - `start`: Start production server (`next start`)
  - `lint`: Run ESLint for code quality checks
- **Key Dependencies**:
  - **Framework**: Next.js 16.2.3, React 19.2.4
  - **UI**: shadcn/ui, Tailwind CSS 4
  - **Forms**: React Hook Form, Zod (validation)
  - **Payments**: Stripe.js, Stripe Node SDK
  - **Database**: Supabase JS SDK, Supabase SSR
  - **Email**: Resend, Nodemailer\n  - **Charts**: Recharts
  - **Icons**: Lucide React

#### `next-env.d.ts`
- **Purpose**: Auto-generated TypeScript declarations for Next.js
- **Note**: This file is generated automatically; do not edit manually
- **In gitignore**: Should be excluded from version control

#### `nodemailer.d.ts`
- **Purpose**: TypeScript type definitions for Nodemailer email library
- **Use**: Provides type safety when using Nodemailer for server-side email sending

### Configuration Files (Environment & Setup)

#### `.env.example`
- **Purpose**: Template file showing all required environment variables
- **Use**: Copy to `.env.local` and fill with actual values for local development
- **Never commit**: The actual `.env.local` should never be pushed to version control
- **Contents** (typical): Database URLs, API keys, Stripe keys, Supabase credentials, etc.

#### `README.md`
- **Purpose**: Main project documentation with features, tech stack, and quick start guide
- **Content**: Overview of seller/admin features, tech stack explanation, deployment instructions

### Database & Automation

#### `instrumentation-client.ts`
- **Purpose**: Client-side instrumentation setup (currently empty, analytics disabled)
- **Use**: Reserved for future monitoring and analytics setup

#### `proxy.ts`
- **Purpose**: Proxy configuration for server-side requests
- **Use**: May handle request forwarding, credential passing, or API request interception
- **Common Uses**: Proxying requests to external APIs while maintaining security

#### `check-column.js`
- **Purpose**: Utility script for database column inspection/verification
- **Use**: Can be run to check database schema and column structure
- **Context**: Likely used during development or debugging database issues

#### `AGENTS.md`
- **Purpose**: Documentation about VS Code agents and custom coding instructions
- **Content**: Rules and guidelines specific to this project's Next.js version and development practices
- **Note**: Contains important warnings about API changes and deprecations

---

## Root Directories

### `/app` - Next.js App Router (Main Application)

**Purpose**: Core application code using Next.js 14+ App Router pattern (file-based routing)

#### Root Route Files
- **`layout.tsx`**: Root layout wrapper for all pages (contains global layout, providers, HTML structure)
- **`page.tsx`**: Home page (landing page)
- **`globals.css`**: Global styles applied to entire application
- **`actions.ts`**: Server actions for the root route (reusable server-side functions)

#### Subdirectories

##### `/app/admin` - Admin Dashboard
- **`page.tsx`**: Admin main dashboard
- **`layout.tsx`**: Admin layout (sidebar navigation, authentication wrapper)
- **`AdminSidebar.tsx`**: Sidebar navigation component for admin
- **Subdirectories**:
  - `/applications`: Manage seller applications (approve/reject)
  - `/content`: Content management (blogs, articles, etc.)
  - `/manual-sales`: Record manual sales transactions
  - `/payouts`: Manual payout management with $100 minimum threshold
  - `/products`: View and manage all platform products
  - `/referrals`: Referral program management
  - `/sales`: Sales analytics and transaction history
  - `/sellers`: Seller management and verification
  - `/tiktok`: TikTok integration management
  - `/training`: Training material for sellers
  - `/waitlist`: Manage waitlist applicants

##### `/app/api` - API Routes & Backend Logic
- **Purpose**: All server-side API endpoints using Next.js API Routes
- **Subdirectories**:
  - `/admin`: Admin-specific API endpoints
  - `/application`: Seller application submission and status
  - `/auth`: Authentication endpoints (login, signup, password reset)
  - `/checkout`: Stripe checkout session creation
  - `/content`: Content management API
  - `/email`: Email sending endpoints (using Resend, Nodemailer)
  - `/facebook`: Facebook integration endpoints
  - `/instagram`: Instagram integration endpoints
  - `/meta`: Meta Platform (Facebook/Instagram) API integration
  - `/obs`: OBS (Open Broadcaster Software) integration
  - And more integration endpoints for various services

##### `/app/dashboard` - Seller Dashboard
- **Purpose**: Main seller hub after login
- **Content**: Sales overview, inventory management, stream scheduling

##### `/app/login`, `/app/signup`, `/app/logout`
- **Purpose**: Authentication pages
- **`login`**: Email/password login form
- **`signup`**: New seller registration
- **`logout`**: Logout handler and page

##### `/app/seller` - Public Seller Profiles
- **Purpose**: Public-facing seller store page
- **Functionality**: Show seller info, products, and links to live streams

##### `/app/live` - Live Stream Page
- **Purpose**: Live commerce streaming interface
- **Functionality**: Product display, live video, real-time chat, purchase buttons

##### `/app/checkout`, `/app/success` - Purchase Funnel
- **Purpose**: Post-checkout pages
- **`checkout`**: Stripe checkout redirect
- **`success`**: Order confirmation page

##### `/app/training` - Seller Training
- **Purpose**: Educational content for sellers
- **Content**: Guides, tutorials, best practices

##### `/app/leaderboard`, `/app/waitlist-success`
- **Purpose**: Seller leaderboard and waitlist confirmation
- **`leaderboard`**: Top sellers ranking
- **`waitlist-success`**: Confirmation page for waitlist signup

##### `/app/forgot-password`, `/app/reset-password`
- **Purpose**: Password recovery flow
- **`forgot-password`**: Request password reset link
- **`reset-password`**: Set new password with token

##### `/app/ref` - Referral Program
- **Purpose**: Referral tracking and rewards
- **Functionality**: Unique referral links, commission tracking

### `/components` - Reusable React Components

**Purpose**: Shared UI components used across multiple pages

#### Root Components
- **`navbar.tsx`**: Main navigation bar (header)
- **`conditional-navbar.tsx`**: Navbar that shows/hides based on authentication status or page context
- **`DashboardNav.tsx`**: Navigation sidebar for dashboard
- **`hero-buttons.tsx`**: Hero section call-to-action buttons
- **`theme-provider.tsx`**: Theme switching provider (dark/light mode)

#### Subdirectories
- **/ui**: UI component library (buttons, forms, modals, cards, etc.) - from shadcn/ui
- **/seller**: Seller-specific components
- **/streaming**: Live streaming related components

### `/lib` - Utility Functions & Services

**Purpose**: Shared logic, helpers, and service integrations

#### Key Files
- **`auth.ts`**: Authentication logic (session management, JWT handling)
- **`supabase-client.ts`**: Supabase client initialization (browser-safe)
- **`supabase-server.ts`**: Supabase server initialization (Node.js runtime)
- **`supabase-admin.ts`**: Supabase admin client with elevated privileges
- **`stripe.ts`**: Stripe API initialization and helper functions
- **`gmail.ts`**: Gmail integration (likely for admin notifications)
- **`meta-service.ts`**: Meta Platform (Facebook/Instagram) API integration
- **`tiktok-api.ts`**: TikTok API integration
- **`whatnot-api.ts`**: Whatnot API integration (alternative live commerce platform)
- **`restream.ts`**: Restream API integration (multi-platform streaming)
- **`resend.ts`**: Resend email service initialization
- **`rate-limiter.ts`**: Request rate limiting (prevent abuse)
- **`categories.ts`**: Product category definitions
- **`config.ts`**: Global application configuration (API endpoints, constants)
- **`utils.ts`**: General utility functions

#### Subdirectories
- **/services**: Business logic and external service integrations
- **/validation**: Zod schemas for form and API validation

### `/hooks` - Custom React Hooks

**Purpose**: Reusable React hooks for component logic

- **`useStreamStatus-new.ts`**: Hook for tracking live stream status
- **`useStreamStatus.ts`**: (Possibly deprecated version of above)
- **`useOBSIntegration-new.ts`**: Hook for OBS (Open Broadcaster Software) integration

### `/services` - Business Logic Services

**Purpose**: Complex business logic organized by domain

- **`streaming.service.ts`**: Live streaming service (OBS, Whatnot, Restream integration)

### `/constants` - Application Constants

**Purpose**: Centralized constant values used throughout the app

- **`streaming.ts`**: Streaming-related constants (quality presets, bitrates, etc.)

### `/types` - TypeScript Type Definitions

**Purpose**: Shared type definitions for the entire application

- **`streaming.ts`**: Types for streaming features
- **`supabase-generated.ts`**: Auto-generated Supabase types from database schema

### `/public` - Static Assets

**Purpose**: Static files served directly by the web server

- **Images**: Logos, icons, hero images
- **Fonts**: Custom font files
- **Other static content**: PDFs, videos, etc.

### `/schemas` - Database Migrations & Schema

**Purpose**: PostgreSQL database schema and migration files

- **`m1-schema.sql`**: Initial schema creation
- **`m2-schema.sql`**: Second migration (schema changes)
- **`m3-schema.sql`**: Third migration
- **`m4_content_automation.sql`**: Content automation feature migration
- **`fix_migration_issues.sql`**: Fixes for migration problems

### `/scripts` - Utility & Maintenance Scripts

**Purpose**: One-off scripts for database maintenance, testing, and automation

- **`test-email.js`**: Script to test email sending (Resend/Nodemailer)
- **`cleanup_duplicate_sellers.js`**: JavaScript version of cleanup script
- **`cleanup_duplicate_sellers.sql`**: SQL version to remove duplicate seller records

### `/supabase` - Supabase Configuration

**Purpose**: Supabase-specific configuration and migrations

- **/migrations**: Database migration files (Supabase auto-generates these)

### `/build` - Next.js Build Output

**Purpose**: Generated production build artifacts (auto-generated, not for version control)

- **`BUILD_ID`**: Unique identifier for this build
- **`build-manifest.json`**: Build metadata and chunk mapping
- **`routes-manifest.json`**: Compiled route information
- **`prerender-manifest.json`**: Pre-rendered static pages
- **`app-path-routes-manifest.json`**: App Router routes mapping
- **`required-server-files.json`**: Files needed for production server
- **/server**: Compiled server code
- **/static**: Pre-compiled static assets
- **/cache**: Build cache

### `/docs` - Documentation

**Purpose**: Project documentation and guides

- **`ENV_SETUP.md`**: Environment variables setup guide
- **`login-management-system.md`**: Documentation of login/authentication flow
- **`production-streaming-architecture.md`**: Live streaming architecture documentation
- **/reports**: Analytics reports and metrics

---

## Key Architecture Patterns

### Authentication Flow
- Supabase handles user authentication (signup/login)
- Sessions stored securely using Supabase SSR
- Admin access controlled via role-based checks

### Payment Processing
- Stripe Connect for seller onboarding
- Stripe Checkout for customer purchases
- Automatic 15% commission split built into checkout

### Database
- PostgreSQL via Supabase
- Row-Level Security (RLS) for data isolation
- Real-time subscriptions available

### Analytics
- User behavior tracking disabled (PostHog removed)
- Consider alternative analytics solutions if needed

### Email
- Resend for transactional emails
- Nodemailer for server-side email
- Key events: signup, orders, payouts, etc.

### Integrations
- **Streaming**: OBS, Restream, Whatnot
- **Social**: Facebook, Instagram, TikTok
- **Payments**: Stripe
- **Email**: Resend, Nodemailer

---

## Development Workflow

1. **Local Setup**: Copy `.env.example` to `.env.local` and fill credentials
2. **Install**: `npm install`
3. **Dev Server**: `npm run dev` - runs on `http://localhost:3000`
4. **Building**: `npm run build` - creates optimized production build
5. **Production**: `npm start` - runs production server
6. **Linting**: `npm run lint` - checks code quality

---

## Important Notes

- TypeScript strict mode is enabled for type safety
- Tailwind CSS 4 used for styling
- Next.js 16+ with App Router (not Pages Router)
- Environment variables must be defined in `.env.local` (not committed)
- Database migrations should be created incrementally in `/schemas`
- API routes in `/app/api` must follow Next.js conventions
