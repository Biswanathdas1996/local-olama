import { Link } from 'react-router-dom';
import { FiShield, FiLock, FiServer, FiCpu, FiZap, FiDatabase, FiCheckCircle, FiArrowRight, FiGlobe, FiUsers, FiTrendingUp, FiFileText, FiMessageSquare, FiSettings } from 'react-icons/fi';

export function LandingPage() {
  const features = [
    {
      icon: FiMessageSquare,
      title: 'AI Chat Interface',
      description: 'WhatsApp-style chat with streaming responses, markdown support, and mobile-optimized UX'
    },
    {
      icon: FiFileText,
      title: 'Document Intelligence (RAG)',
      description: 'Upload PDFs, DOCX, PPT and query with hybrid semantic + keyword search'
    },
    {
      icon: FiCpu,
      title: 'Model Management',
      description: 'Download, manage, and switch between multiple LLM models with progress tracking'
    },
    {
      icon: FiZap,
      title: 'Fine-Tuning & Training',
      description: 'LoRA, QLoRA, and adapter-based training with custom dataset management'
    },
    {
      icon: FiDatabase,
      title: 'Vector Search',
      description: 'ChromaDB-powered persistent vector storage with HNSW indexing'
    },
    {
      icon: FiSettings,
      title: 'Template System',
      description: 'Save and reuse prompt templates with custom output formatting'
    }
  ];

  const problems = [
    {
      icon: FiGlobe,
      title: 'Data Privacy Concerns',
      problem: 'Enterprises hesitate to send proprietary data to cloud LLM APIs',
      solution: 'Run everything locally - your data never leaves your infrastructure'
    },
    {
      icon: FiUsers,
      title: 'Compliance Requirements',
      problem: 'GDPR, HIPAA, SOC2 regulations prohibit data sharing with third parties',
      solution: 'Zero external dependencies - 100% compliant with strictest regulations'
    },
    {
      icon: FiTrendingUp,
      title: 'API Costs',
      problem: 'Cloud LLM APIs charge per token, costs escalate with scale',
      solution: 'One-time setup cost, unlimited usage with no recurring API fees'
    },
    {
      icon: FiServer,
      title: 'Internet Dependency',
      problem: 'Cloud APIs require stable internet, fail in air-gapped environments',
      solution: 'Fully offline operation - perfect for secure facilities and field work'
    }
  ];

  const securityFeatures = [
    'No data leaves your infrastructure - 100% local processing',
    'Air-gapped deployment support for maximum security',
    'No telemetry, no tracking, no external API calls',
    'Complete control over model weights and training data',
    'GDPR, HIPAA, SOC2 compliant by design',
    'Encrypted vector storage with secure authentication options'
  ];

  const useCases = [
    {
      industry: 'Healthcare',
      useCase: 'Analyze patient records and medical literature while maintaining HIPAA compliance'
    },
    {
      industry: 'Legal',
      useCase: 'Process confidential case files and contracts without data exposure risks'
    },
    {
      industry: 'Finance',
      useCase: 'Query financial documents and customer data securely for SOC2 compliance'
    },
    {
      industry: 'Research',
      useCase: 'Work with proprietary research data offline in secure lab environments'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -top-48 -left-48 animate-float" />
          <div className="absolute w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute w-96 h-96 bg-purple-400/20 rounded-full blur-3xl top-1/2 left-1/2 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Hero Content */}
            <div className="text-center lg:text-left">
              <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded-full">
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  🔒 Enterprise-Grade • 100% Private
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Local LLM Platform
                </span>
                <br />
                <span className="text-gray-900">Your Data. Your Control.</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto lg:mx-0">
                Enterprise-grade AI platform powered by Ollama. Run powerful language models completely offline 
                with document intelligence, model training, and zero API costs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Get Started
                  <FiArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/connect"
                  className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  <FiShield className="w-5 h-5" />
                  Connect
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-12 max-w-md mx-auto lg:mx-0">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">100%</div>
                  <div className="text-xs sm:text-sm text-gray-600">Private</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">0$</div>
                  <div className="text-xs sm:text-sm text-gray-600">API Costs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">∞</div>
                  <div className="text-xs sm:text-sm text-gray-600">Unlimited</div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50">
                <img 
                  src="/images/AI_server_room_hero_64f5c39f.png" 
                  alt="AI Server Infrastructure"
                  className="w-full h-auto"
                />
              </div>
              {/* Floating badges */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-900">Fully Offline</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-indigo-100">
                <div className="flex items-center gap-2">
                  <FiLock className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-900">Zero Trust</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems & Solutions */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Business Problems Solved
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Addressing critical enterprise challenges with a local-first approach
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {problems.map((item, index) => (
              <div key={index} className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all border border-blue-100/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white flex-shrink-0">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-600 mb-1">❌ Problem:</div>
                      <p className="text-sm text-gray-700">{item.problem}</p>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-green-600 mb-1">✅ Solution:</div>
                      <p className="text-sm text-gray-700">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <img 
                src="/images/Security_privacy_illustration_29019db5.png" 
                alt="Security and Privacy"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="inline-block mb-4 px-4 py-2 bg-blue-100 border border-blue-200 rounded-full">
                <span className="text-sm font-semibold text-blue-700">🔐 Enterprise Security</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Security & Privacy First
                </span>
              </h2>
              
              <p className="text-lg text-gray-700 mb-6">
                Built for organizations that can't compromise on data security. Every component designed 
                for maximum privacy and zero external dependencies.
              </p>
              
              <div className="space-y-3">
                {securityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FiShield className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-gray-900">Compliance Ready</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Deploy with confidence in regulated industries. No third-party data sharing means 
                  automatic compliance with GDPR, HIPAA, SOC2, and other standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need for enterprise AI, packaged in a beautiful, mobile-friendly interface
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all border border-blue-100/50 group">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white w-fit mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Technical Architecture
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Modern, scalable architecture built with best-in-class technologies
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-blue-100/50">
              <img 
                src="/images/Architecture_diagram_illustration_711d2ca4.png" 
                alt="System Architecture"
                className="w-full h-auto"
              />
            </div>

            {/* Tech Stack */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <div className="font-bold text-gray-900 mb-1">Frontend</div>
                <div className="text-sm text-gray-600">React + TypeScript + Vite</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <div className="font-bold text-gray-900 mb-1">Backend</div>
                <div className="text-sm text-gray-600">FastAPI + Python</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <div className="font-bold text-gray-900 mb-1">LLM Engine</div>
                <div className="text-sm text-gray-600">Ollama + HuggingFace</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
                <div className="font-bold text-gray-900 mb-1">Vector DB</div>
                <div className="text-sm text-gray-600">ChromaDB + Whoosh</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Industry Use Cases
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Trusted by organizations across regulated industries
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {useCases.map((item, index) => (
              <div key={index} className="glass-card rounded-2xl p-6 border border-blue-100/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  <h3 className="text-xl font-bold text-gray-900">{item.industry}</h3>
                </div>
                <p className="text-gray-700">{item.useCase}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why This Platform */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Why Choose Local LLM Platform?
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-8 mt-12">
              <div>
                <div className="text-4xl font-bold mb-2">$0</div>
                <div className="text-blue-100">Per-token API costs</div>
                <div className="text-sm text-blue-200 mt-2">Save thousands in API fees</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-blue-100">Data privacy</div>
                <div className="text-sm text-blue-200 mt-2">Your data never leaves</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">∞</div>
                <div className="text-blue-100">Unlimited usage</div>
                <div className="text-sm text-blue-200 mt-2">No rate limits, no quotas</div>
              </div>
            </div>

            <div className="mt-12 p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
              <h3 className="text-2xl font-bold mb-4">Perfect For:</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Enterprises with strict data governance</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Organizations in regulated industries</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Teams requiring air-gapped deployment</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Companies avoiding vendor lock-in</span>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Start Using Now
                <FiArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Local LLM Platform
            </div>
            <p className="text-gray-400 text-sm">
              Enterprise-Grade AI • 100% Private • Zero API Costs
            </p>
            <div className="mt-4 text-xs text-gray-500">
              v1.0.0 • Powered by Ollama • Fully Offline
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
