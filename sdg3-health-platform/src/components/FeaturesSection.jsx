import { motion } from 'framer-motion';
import { Map, BarChart3, Layers, MessageSquare, PlayCircle, Bell, Users } from 'lucide-react';

const features = [
  { icon: Map,          title: 'Predictive Heatmaps',       description: 'Visual disease outbreak risk maps with color-coded severity across Indian districts and states.',       color: 'from-blue-500 to-cyan-500' },
  { icon: BarChart3,    title: 'Real-Time Risk Dashboard',   description: 'Comprehensive dashboard with live risk levels, weekly trends, and key outbreak metrics.',               color: 'from-primary-500 to-emerald-500' },
  { icon: Layers,       title: 'Multi-Disease Forecasting',  description: 'Simultaneous prediction of Dengue, Malaria, Influenza, COVID-19, and more.',                           color: 'from-purple-500 to-violet-500' },
  { icon: MessageSquare,title: 'AI Health Chatbot',          description: 'Intelligent multi-agent assistant providing instant answers to health queries and outbreak information.', color: 'from-amber-500 to-orange-500' },
  { icon: PlayCircle,   title: 'Outbreak Simulation',        description: 'Run what-if scenarios to understand potential outbreak patterns and test intervention strategies.',       color: 'from-teal-500 to-cyan-500' },
  { icon: Bell,         title: 'Alert Notification System',  description: 'Automated alerts for high-risk situations, ensuring timely response from health authorities.',           color: 'from-red-500 to-rose-500' },
  { icon: Users,        title: 'Community Monitoring',       description: 'Track community health trends and gather real-time feedback from local health workers.',                 color: 'from-indigo-500 to-blue-500' },
];

const FeaturesSection = () => (
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
          Platform Capabilities
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Powerful Features</h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Comprehensive tools designed to predict, monitor, and prevent disease outbreaks
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
