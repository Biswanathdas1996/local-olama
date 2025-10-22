# Local LLM Platform - Frontend

Modern React frontend for the Local LLM Platform with Ollama integration.

## Features

- 🎨 Modern UI with Tailwind CSS
- 💬 Real-time chat interface with markdown support
- 🔧 Model management (download, list, delete)
- ⚙️ Customizable generation parameters
- 📊 Performance statistics display
- 🌙 Responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running on http://localhost:8000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:3000

### Build

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── Header.tsx
│   │   ├── ChatInterface.tsx
│   │   └── ModelManager.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useModels.ts
│   │   ├── useGeneration.ts
│   │   └── useHealth.ts
│   ├── services/         # API service layer
│   │   └── api.ts
│   ├── types/           # TypeScript type definitions
│   │   └── api.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html          # HTML template
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Vite config
└── tailwind.config.js  # Tailwind config
```

## API Integration

The frontend connects to the backend API through Vite's proxy configuration. All `/api/*` requests are forwarded to `http://localhost:8000`.

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Markdown** - Markdown rendering
- **React Icons** - Icon library
