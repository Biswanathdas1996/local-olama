# 🎨 Local LLM Platform - Frontend

A modern, responsive React frontend for interacting with local Large Language Models through Ollama.

![React](https://img.shields.io/badge/React-18.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-5.0-blue?logo=vite)

## ✨ Features

### 💬 Advanced Chat Interface
- **Real-time Conversations** - Instant responses from local LLMs
- **Markdown Support** - Rich text formatting in responses
- **Code Highlighting** - Syntax highlighting for code blocks
- **Context Preservation** - Multi-turn conversations with memory
- **Message History** - View entire conversation history
- **Timestamp Tracking** - See when each message was sent

### 🔧 Comprehensive Model Management
- **One-Click Downloads** - Install models from Ollama library
- **Visual Model List** - See all installed models with details
- **Storage Info** - View model sizes in GB
- **Easy Deletion** - Free up space by removing models
- **Status Indicators** - Real-time model availability

### ⚙️ Powerful Settings
- **Max Tokens** (1-100,000) - Control response length
- **Temperature** (0.0-2.0) - Adjust creativity vs focus
- **Top P** (0.0-1.0) - Nucleus sampling control
- **Top K** (1-100) - Token selection diversity
- **Repeat Penalty** (0.0-2.0) - Avoid repetitive text

### 📊 Performance Metrics
- **Response Time** - See total generation duration
- **Token Counts** - Prompt and response token usage
- **Load Duration** - Model initialization time
- **Real-time Stats** - Updated with each response

### 🎯 User Experience
- **Responsive Design** - Works on all screen sizes
- **Smooth Animations** - Polished UI interactions
- **Loading States** - Clear feedback during operations
- **Error Handling** - Friendly error messages
- **Keyboard Shortcuts** - Fast message sending
- **Auto-scroll** - Chat automatically scrolls to latest message

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running on http://localhost:8000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

Visit http://localhost:3000

### Build for Production

```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
│   └── vite.svg           # Vite logo
├── src/
│   ├── components/        # React components
│   │   ├── Header.tsx     # Top navigation bar
│   │   ├── ChatInterface.tsx  # Main chat UI
│   │   └── ModelManager.tsx   # Model management UI
│   ├── hooks/            # Custom React hooks
│   │   ├── useModels.ts       # Model operations
│   │   ├── useGeneration.ts   # Text generation
│   │   └── useHealth.ts       # Health checks
│   ├── services/         # API integration
│   │   └── api.ts            # API client
│   ├── types/            # TypeScript definitions
│   │   └── api.ts            # API types
│   ├── App.tsx           # Main application
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── index.html            # HTML template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS config
├── postcss.config.js     # PostCSS config
└── README.md            # This file
```

## 🛠️ Technology Stack

### Core
- **React 18.2** - Modern UI framework with hooks
- **TypeScript 5.3** - Type-safe JavaScript
- **Vite 5.0** - Lightning-fast build tool

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - Browser compatibility

### Libraries
- **Axios** - HTTP client for API calls
- **React Markdown** - Render markdown content
- **React Syntax Highlighter** - Code syntax highlighting
- **React Icons** - Icon library (Feather Icons)

### Development
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **React Hooks ESLint** - React hooks best practices

## 🎨 UI Components

### Header Component
```typescript
- Displays app title and branding
- Shows Ollama connection status
- Displays API version
- Real-time health monitoring
```

### Chat Interface Component
```typescript
- Model selector dropdown
- Settings panel with adjustable parameters
- Message list with user/assistant bubbles
- Text input with send button
- Loading states and animations
- Error display
- Clear chat functionality
```

### Model Manager Component
```typescript
- Model download form
- List of installed models
- Model info cards with size/date
- Delete model buttons
- Refresh button
- Popular model suggestions
```

## 🔌 API Integration

The frontend communicates with the backend API through a centralized service layer:

```typescript
// services/api.ts
- checkHealth() - Health check
- listModels() - Get all models
- downloadModel() - Download new model
- deleteModel() - Remove model
- generateText() - Generate response
```

### Proxy Configuration
Vite proxy forwards `/api/*` requests to `http://localhost:8000`:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

## 🎯 State Management

Custom hooks manage application state:

### useModels Hook
```typescript
- models: ModelInfo[]
- loading: boolean
- error: string | null
- fetchModels()
- downloadModel(name)
- deleteModel(name)
```

### useGeneration Hook
```typescript
- messages: Message[]
- loading: boolean
- error: string | null
- generateResponse(model, prompt, options)
- clearMessages()
```

### useHealth Hook
```typescript
- health: HealthResponse | null
- loading: boolean
- error: string | null
- Auto-refreshes every 30 seconds
```

## 🎨 Styling System

### Tailwind Configuration
- Custom primary color palette
- Custom animations
- Responsive breakpoints
- Utility-first approach

### Custom Styles
- Scrollbar styling
- Markdown content formatting
- Code block styling
- Animation keyframes

## ⌨️ Keyboard Shortcuts

- **Enter** - Send message
- **Shift + Enter** - New line in textarea
- **Escape** - (Future: Close modals)

## 🔧 Configuration

### Environment Variables
Create `.env` file for custom configuration:

```env
VITE_API_URL=http://localhost:8000
```

### Vite Config
```typescript
server: {
  port: 3000,        // Dev server port
  proxy: { ... }     // API proxy
}
```

## 📱 Responsive Design

- **Mobile** (< 768px) - Single column layout
- **Tablet** (768px - 1024px) - Optimized spacing
- **Desktop** (> 1024px) - Full feature layout

## 🐛 Debugging

### Browser DevTools
```typescript
// React DevTools for component inspection
// Network tab for API calls
// Console for errors and logs
```

### Common Issues

**Models not loading**
- Check backend is running
- Verify Ollama connection
- Check browser console

**Cannot send messages**
- Ensure model is selected
- Check backend health
- Verify API connectivity

**Styling issues**
- Clear browser cache
- Check Tailwind compilation
- Verify PostCSS config

## 🚀 Performance

### Optimizations
- Code splitting with dynamic imports
- Lazy loading of components
- Memoized callbacks with useCallback
- Optimized re-renders
- Efficient state updates

### Bundle Size
- Production build ~500KB (gzipped)
- Tree-shaking unused code
- Minified and optimized

## 🔒 Security

- No sensitive data in localStorage
- CORS handled by backend
- Input sanitization
- XSS prevention via React
- No external API calls (fully offline)

## 📄 License

Part of the Local LLM Platform project.

## 🤝 Contributing

Improvements welcome! Areas for contribution:
- Additional UI themes
- More keyboard shortcuts
- Chat export functionality
- Model comparison features
- Advanced settings presets

## 📞 Support

Issues? Check:
1. Backend is running (http://localhost:8000/health)
2. Ollama is accessible
3. Browser console for errors
4. Network tab for failed requests

---

**Built with ❤️ for the local LLM community**
