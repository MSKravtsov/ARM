# ARM (Abitur Risk Monitor)

A Germany-wide academic risk assessment platform for Abitur students (Class of 2026), supporting state-specific legal frameworks with real-time risk calculation and bilingual UX.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + next-intl
- **Backend**: Supabase (Auth + PostgreSQL)
- **Languages**: TypeScript
- **Deployment**: Vercel (recommended)

## Project Status

✅ **Phase 0 Complete**: Environment Setup  
⏳ **Phase 1 Next**: Database & Auth Foundation

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher (Next.js 16 requirement)
- npm or yarn
- Supabase account (free tier works fine)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase** (REQUIRED before running):
   Follow the detailed guide in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests (to be implemented in Phase 4)

## Project Structure

```
ARMv1/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # Reusable UI primitives
│   ├── layout/            # Navigation, headers
│   └── features/          # Feature-specific components
├── lib/                    # Business logic
│   ├── supabase/          # Supabase clients
│   └── strategies/        # Calculation Strategy Pattern
├── messages/               # i18n translations (de.json, en.json)
├── types/                  # TypeScript definitions
├── supabase/               # Database migrations
└── public/                 # Static assets
```

## Features

### Supported Federal States
- **NRW 2026**: G8 Transition / Bündelungsgymnasium rules
- **Bavaria 2026**: G9 LehrplanPLUS / Seminar weighting
- **General**: Standard KMK rules (300pt / 7 deficits)

### Bilingual Support
- **German (de)**: Primary language
- **English (en)**: Full translation with German legal terms in context

### Risk Calculation
Strategy Pattern implementation for state-specific rules:
- 🟢 **Safe**: ≥330 points, ≤5 deficits
- 🟡 **Warning**: 300-329 points or 6-7 deficits
- 🔴 **Danger**: <300 points or >7 deficits

## Configuration

Environment variables required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

See [`.env.example`](./.env.example) for template.

## Development Roadmap

- [x] **Phase 0**: Environment Setup
- [ ] **Phase 1**: Database & Auth Foundation
- [ ] **Phase 2**: Landing Page (Page A)
- [ ] **Phase 3**: Setup Page (Page B)
- [ ] **Phase 4**: Calculation Engine
- [ ] **Phase 5**: Report Page (Page C)
- [ ] **Phase 6**: Polish & Deployment

## Documentation

- [Project Initialization Plan](../brain/.../project_initialization_plan.md) - Complete architecture overview
- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Step-by-step database configuration
- [Strategy Pattern README](./lib/strategies/README.md) - Calculation engine architecture

## Testing

Browser UX testing is mandatory after each implementation step:
1. Verify Supabase connection
2. Test authentication flow
3. Validate data entry and calculations
4. Check responsive design (mobile/tablet/desktop)

## Notes

⚠️ **Node.js Version**: This project requires Node.js ≥20.9.0 for Next.js 16. The current system has Node.js 18.20.8, which will show warnings but won't block development server (`npm run dev`). Production builds require upgrading Node.

## License

Private project - All rights reserved

## Support

For issues or questions, refer to the project initialization plan or Phase-specific documentation.
