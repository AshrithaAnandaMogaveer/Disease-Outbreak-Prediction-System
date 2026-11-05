import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import WhyUsSection from '../components/WhyUsSection';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import ContactSection from '../components/ContactSection';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection onStartPrediction={() => navigate('/predict')} />
      <div id="why-us"><WhyUsSection /></div>
      <div id="features"><FeaturesSection /></div>
      <div id="how-it-works"><HowItWorksSection /></div>
      <div id="contact"><ContactSection /></div>
    </div>
  );
};

export default LandingPage;
