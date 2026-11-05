import { motion } from 'framer-motion';
import { Shield, Brain, Activity, Zap, Eye, AlertTriangle } from 'lucide-react';

const reasons = [
  {
    icon: Shield,
    title: 'Early Outbreak Detection',
    description: 'Identify potential disease outbreaks before they spread, enabling rapid response and prevention measures that save lives.',
    color: 'from-red-500 to-rose-600',
    bg: 'bg-red-50',
  },
  {
    icon: Brain,
    title: 'AI-Based Predictive Modeling',
    description: 'Advanced machine learning algorithms analyze multi-source patterns and predict outbreak risks with 94%+ accuracy.',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Activity,
    title: 'Real-Time Environmental Analysis',
    description: 'Continuous monitoring of environmental factors, climate data, and health indicators for comprehensive insights.',
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Zap,
    title: 'Autonomous AI Agents',
    description: 'Self-operating AI agents work 24/7 to collect, analyze, and process data without human intervention.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Eye,
    title: 'Explainable AI Transparency',
    description: 'Clear explanations of AI predictions and decisions, building trust and enabling informed action by health authorities.',
    color: 'from-teal-500 to-emerald-600',
    bg: 'bg-teal-50',
  },
  {
    icon: AlertTriangle,
    title: 'Hallucination Detection',
    description: 'Built-in mechanisms to detect and prevent AI hallucinations, ensuring data accuracy and reliability at all times.',
    color: 'from-primary-500 to-green-600',
    bg: 'bg-primary-50',
  },
];

const WhyUsSection = () => (
  <section className="py-24 px-4 bg-white">
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 text-sm font-semibold rounded-full border border-primary-200 mb-4">
          Why This Platform
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Why This Platform is Needed
        </h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Leveraging cutting-edge AI to protect communities through early disease outbreak prediction
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reasons.map((r, i) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-12 h-12 ${r.bg} rounded-xl flex items-center justify-center mb-4`}>
                <div className={`w-8 h-8 bg-gradient-to-br ${r.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                {r.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{r.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default WhyUsSection;
