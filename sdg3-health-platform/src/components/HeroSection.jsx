import { motion } from 'framer-motion';
import { ArrowRight, Activity, Shield, Brain, TrendingUp, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

// Virus SVG shape — spiky circle like a coronavirus particle
const VirusParticle = ({ size, x, y, duration, delay, opacity, rotate }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: x, top: y, width: size, height: size, opacity }}
    animate={{
      x: [0, 30, -20, 15, 0],
      y: [0, -25, 20, -10, 0],
      rotate: [rotate, rotate + 180, rotate + 360],
      scale: [1, 1.1, 0.95, 1.05, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Core circle */}
      <circle cx="50" cy="50" r="22" fill="rgba(22,163,74,0.18)" stroke="rgba(22,163,74,0.35)" strokeWidth="1.5" />
      {/* Inner detail */}
      <circle cx="50" cy="50" r="12" fill="rgba(22,163,74,0.10)" />
      <circle cx="44" cy="44" r="4" fill="rgba(22,163,74,0.20)" />
      <circle cx="56" cy="54" r="3" fill="rgba(22,163,74,0.15)" />
      {/* Spikes — 8 evenly spaced */}
      {[0,45,90,135,180,225,270,315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + 22 * Math.cos(rad);
        const y1 = 50 + 22 * Math.sin(rad);
        const x2 = 50 + 38 * Math.cos(rad);
        const y2 = 50 + 38 * Math.sin(rad);
        const bx = 50 + 44 * Math.cos(rad);
        const by = 50 + 44 * Math.sin(rad);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(22,163,74,0.40)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx={bx} cy={by} r="3.5" fill="rgba(22,163,74,0.25)" stroke="rgba(22,163,74,0.45)" strokeWidth="1" />
          </g>
        );
      })}
    </svg>
  </motion.div>
);

const FloatingCard = ({ icon: Icon, label, value, color, delay, x, y }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
    transition={{ opacity: { delay, duration: 0.5 }, scale: { delay, duration: 0.5 }, y: { delay, duration: 3 + delay, repeat: Infinity, ease: 'easeInOut' } }}
    className="absolute hidden lg:flex items-center gap-2.5 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl border border-white/60"
    style={{ left: x, top: y }}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  </motion.div>
);

const HeroSection = ({ onStartPrediction }) => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-green-50 to-cyan-50">

      {/* Animated virus particles — replaces grid */}
      <VirusParticle size={90}  x="5%"  y="10%" duration={18} delay={0}   opacity={0.7} rotate={0}   />
      <VirusParticle size={60}  x="15%" y="70%" duration={22} delay={2}   opacity={0.5} rotate={45}  />
      <VirusParticle size={110} x="88%" y="8%"  duration={20} delay={1}   opacity={0.6} rotate={20}  />
      <VirusParticle size={75}  x="82%" y="75%" duration={25} delay={3}   opacity={0.55} rotate={90} />
      <VirusParticle size={50}  x="50%" y="5%"  duration={16} delay={1.5} opacity={0.4} rotate={135} />
      <VirusParticle size={65}  x="35%" y="80%" duration={21} delay={0.5} opacity={0.45} rotate={60} />
      <VirusParticle size={45}  x="70%" y="50%" duration={19} delay={4}   opacity={0.35} rotate={30} />
      <VirusParticle size={80}  x="2%"  y="45%" duration={24} delay={2.5} opacity={0.5} rotate={180} />

      {/* Gradient blobs */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-300/5 rounded-full blur-3xl" />

      {/* Floating stat cards */}
      <FloatingCard icon={Shield}    label="Risk Zones Detected" value="247 Active"   color="bg-red-500"     delay={0.8} x="72%" y="15%" />
      <FloatingCard icon={TrendingUp} label="Prediction Accuracy" value="94.7%"        color="bg-primary-600" delay={1.0} x="68%" y="65%" />
      <FloatingCard icon={Zap}       label="AI Agents Running"   value="4 Autonomous" color="bg-purple-500"  delay={1.2} x="75%" y="40%" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — text content */}
          <div>
            {/* SDG badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 text-sm font-semibold px-4 py-2 rounded-full mb-6"
            >
              <Globe className="w-4 h-4" />
              SDG 3 — Good Health &amp; Well-Being
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-5"
            >
              Generative AI{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-cyan-500">
                Disease Outbreak
              </span>{' '}
              Prediction
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-600 mb-4 leading-relaxed"
            >
              Powered by <span className="font-semibold text-gray-800">Autonomous AI Agents</span> — continuously monitoring, analyzing, and predicting disease outbreaks before they spread.
            </motion.p>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-2xl font-bold text-primary-600 mb-10 tracking-wide"
            >
              Predict. Prevent. Protect.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex flex-wrap gap-4"
            >
              <motion.button
                onClick={onStartPrediction}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 hover:shadow-primary-300 transition-all duration-300"
              >
                Start Prediction
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <Link to="/signup">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-7 py-3.5 bg-white text-gray-800 font-semibold rounded-xl border border-gray-200 shadow-sm hover:border-primary-300 hover:text-primary-700 transition-all duration-300"
                >
                  Get Started Free
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-6 mt-10"
            >
              {[
                { icon: Brain,    text: 'Multi-Agent AI' },
                { icon: Shield,   text: 'Hallucination Guard' },
                { icon: Activity, text: 'Real-Time Analysis' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-gray-500">
                  <Icon className="w-4 h-4 text-primary-500" />
                  <span>{text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — visual dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Main card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">Outbreak Intelligence</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500 font-medium">Live</span>
                  </div>
                </div>

                {/* Risk score */}
                <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-2xl p-5 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-1">Current Risk Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-extrabold text-primary-700">72</span>
                    <span className="text-lg text-gray-500 mb-1">/100</span>
                    <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                      MEDIUM RISK
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '72%' }}
                      transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-primary-500 to-amber-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Dengue',    val: '3,420', color: 'text-red-600',   bg: 'bg-red-50' },
                    { label: 'Malaria',   val: '2,100', color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Influenza', val: '5,600', color: 'text-blue-600',  bg: 'bg-blue-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                      <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Weekly trend bars */}
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Weekly Trend</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 55, 45, 70, 60, 80, 72].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.9 + i * 0.07, duration: 0.5 }}
                        className={`flex-1 rounded-t-md ${
                          i === 6 ? 'bg-primary-500' : 'bg-primary-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {['M','T','W','T','F','S','S'].map((d, i) => (
                      <span key={i} className="flex-1 text-center text-xs text-gray-400">{d}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decorative ring */}
              <div className="absolute -z-10 -inset-4 bg-gradient-to-br from-primary-200/30 to-cyan-200/30 rounded-[2.5rem] blur-xl" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-primary-400 rounded-full flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 bg-primary-500 rounded-full"
            animate={{ y: [0, 14, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
