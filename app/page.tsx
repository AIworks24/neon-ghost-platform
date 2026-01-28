import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-600 bg-dark-900/50 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-neon rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">NG</span>
            </div>
            <span className="text-2xl font-bold gradient-text">Neon Ghost</span>
          </div>
          <Link 
            href="/auth/login"
            className="btn-primary"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl text-center">
          <h1 className="text-6xl font-bold mb-6">
            <span className="gradient-text">AI-Powered</span>
            <br />
            Media Buying Platform
          </h1>
          
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Create compelling social media content, execute campaigns across multiple platforms, 
            and analyze performance with AI-driven insights.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/auth/login" className="btn-primary text-lg px-8 py-4">
              Get Started
            </Link>
            <button className="btn-secondary text-lg px-8 py-4">
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">4+</div>
              <div className="text-gray-400">Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">AI</div>
              <div className="text-gray-400">Powered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">24/7</div>
              <div className="text-gray-400">Analytics</div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12">
            <span className="gradient-text">Powerful Features</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-neon">
              <div className="w-12 h-12 bg-neon-pink/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-bold mb-2">AI Content Creation</h3>
              <p className="text-gray-400">
                Generate compelling text and images tailored to each platform using advanced AI models.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-neon">
              <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Multi-Platform Campaigns</h3>
              <p className="text-gray-400">
                Execute campaigns across Facebook, Instagram, LinkedIn, and TikTok from one dashboard.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-neon">
              <div className="w-12 h-12 bg-neon-blue/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Real-Time Analytics</h3>
              <p className="text-gray-400">
                Track performance metrics, optimize campaigns, and generate client reports with AI insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-600 bg-dark-900/50 backdrop-blur-lg py-8 px-6">
        <div className="container mx-auto text-center text-gray-400">
          <p>&copy; 2024 Neon Ghost. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}