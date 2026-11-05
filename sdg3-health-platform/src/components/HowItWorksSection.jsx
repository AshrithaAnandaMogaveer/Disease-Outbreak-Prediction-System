import { motion } from 'framer-motion';
import { Database, Brain, TrendingUp, AlertCircle } from 'lucide-react';

const steps = [
  {
    icon: Database,
    title: 'Data Collection',
    description: 'Autonomous AI agents gather data from health records, environmental sensors, and weather patterns continuously.',
    color: 'from-blue-500 to-blue-600',
    number: '01',
  },
  {
    icon: Brain,
    title: 'AI Prediction',
    description: 'Advanced ML models analyze collected data to identify patterns and predict potential outbreak scenarios.',
    color: 'from-purple-500 to-purple-600',
    number: '02',
  },
  {
    icon: TrendingUp,
    title: 'Risk Analysis',
    description: 'Comprehensive risk assessment evaluates severity, spread potential, and impact to generate actionable insights.',
    color: 'from-amber-500 to-orange-500',
    number: '03',
  },
  {
    icon: AlertCircle,
    title: 'Alert & Prevention',
    description: 'Automated alerts notify health authorities and communities, enabling rapid response and preventive measures.',
    color: 'from-red-500 to-rose-600',
    number: '04',
  },
];

const HowItWorksSection = () => (
  <section className="py-24 px-4 bg-gradient-to-br from-slate-50 via-green-50/30 to-cyan-50/30">
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 text-sm font-semibold rounded-full border border-primary-200 mb-4">
          The Process
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A seamless four-step process powered by autonomous AI agents and advanced analytics
        </p>
      </motion.div>

      <div className="relative">
        {/* Connector line */}
        <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 via-amber-300 to-red-300" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Step number bubble */}
                <div className="relative mb-5">
                  <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg z-10 relative`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-xs font-bold text-gray-700">{i + 1}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>

                {/* Mobile connector */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden w-0.5 h-8 bg-gray-200 mt-4" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
