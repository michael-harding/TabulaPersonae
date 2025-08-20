# D&D Character Sheet

A comprehensive web application for managing Dungeons & Dragons character sheets, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Complete Character Management**: Create, edit, and delete D&D characters with full stat tracking
- **Ability Scores & Modifiers**: Automatic calculation of ability modifiers and saving throws
- **Skills & Proficiencies**: Track skill proficiencies, expertise, and custom proficiencies
- **Equipment & Inventory**: Manage equipment with weight tracking and equipped status
- **Spells System**: Organize spells by level with preparation tracking and spell slot management
- **Character Notes**: Store personality traits, backstory, and campaign notes
- **Import/Export**: Backup and share characters via JSON files
- **Dark Mode**: Toggle between light and dark themes
- **Local Storage**: All data persists locally in your browser
- **Mobile Friendly**: Responsive design works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone or download the project
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Testing

This project includes a comprehensive test suite covering all functionality.

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode (re-runs tests when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
\`\`\`

### Test Structure

The test suite includes:

- **Unit Tests**: Individual functions and utilities
  - `__tests__/lib/character-storage.test.ts` - Character data persistence
  - `__tests__/lib/character-utils.test.ts` - D&D calculations and modifiers

- **Component Tests**: React component behavior and interactions
  - `__tests__/components/character-basic-info.test.tsx` - Basic character information
  - `__tests__/components/ability-scores.test.tsx` - Ability scores and modifiers
  - `__tests__/components/import-export.test.tsx` - Import/export functionality

- **Integration Tests**: Full application workflows
  - `__tests__/integration/app.test.tsx` - Overall app functionality
  - `__tests__/integration/character-workflow.test.tsx` - Complete user workflows

### Test Coverage

The tests cover:
- ✅ Character creation, editing, and deletion
- ✅ Ability score calculations and D&D mechanics
- ✅ Skills, proficiencies, and saving throws
- ✅ Equipment and inventory management
- ✅ Spell system and spellcasting calculations
- ✅ Import/export functionality with file validation
- ✅ Local storage persistence and error handling
- ✅ Theme switching and UI interactions
- ✅ Edge cases and error scenarios

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library
- **Icons**: Lucide React
- **Storage**: Browser localStorage
- **Testing**: Jest + React Testing Library
- **Theme**: next-themes for dark/light mode

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Main application page
│   └── globals.css        # Global styles and CSS variables
├── components/            # React components
│   ├── character-*.tsx    # Character sheet components
│   ├── import-export.tsx  # Import/export functionality
│   ├── mode-toggle.tsx    # Theme toggle component
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility functions and types
│   ├── character-types.ts # TypeScript interfaces
│   ├── character-storage.ts # Local storage utilities
│   └── character-utils.ts # D&D calculation functions
└── __tests__/            # Test files
    ├── components/       # Component tests
    ├── lib/             # Utility tests
    └── integration/     # Integration tests
\`\`\`

## Usage

1. **Create a Character**: Click "Create New Character" and fill in basic information
2. **Edit Stats**: Click edit buttons to modify ability scores, skills, and other attributes
3. **Manage Equipment**: Add items to inventory and track weight and equipped status
4. **Organize Spells**: Add spells by level and mark them as prepared
5. **Import/Export**: Use the import/export buttons to backup or share characters
6. **Switch Themes**: Use the theme toggle in the header for dark/light mode

## Contributing

When making changes:
1. Run the test suite to ensure nothing breaks: `npm test`
2. Add tests for new functionality
3. Follow the existing code style and patterns
4. Test on both desktop and mobile devices

## License

This project is open source and available under the MIT License.
