import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Activity, Cloud, Users, AlertCircle, TrendingUp, TrendingDown, Calendar, FileDown, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';

const PredictOutbreak = () => {
  // Health Data State
  const [healthData, setHealthData] = useState({
    disease: '',
    newCases: '',
    activeCases: '',
    hospitalAdmissions: '',
    deaths: '',
    suddenIncrease: 'No',
    vaccinationRate: '',
    hospitalPressure: 'Low',
  });

  // Environmental Data State
  const [environmentalData, setEnvironmentalData] = useState({
    temperature: '',
    rainfall: '',
    humidity: '',
    waterStagnation: 'No',
    flooding: 'No',
    airQuality: 'Good',
    mosquitoIncrease: 'No',
    unusualWeather: 'No',
  });

  // Population Data State
  const [populationData, setPopulationData] = useState({
    areaType: 'Urban',
    population: '',
    densityLevel: 'Medium',
    publicGatherings: 'No',
    migrationRate: 'Low',
    householdSize: '',
    cleanWaterAccess: 'Yes',
    sanitationLevel: 'Good',
  });

  // Risk Analysis Results
  const [riskResults, setRiskResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Climate Variation State
  const [climateVariation, setClimateVariation] = useState({
    temperatureChange: 0,
    rainfallChange: 0,
    humidityChange: 0,
  });
  const [simulatedRisk, setSimulatedRisk] = useState(null);

  // Report State
  const [detailedReport, setDetailedReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Handle Health Data Changes
  const handleHealthChange = (e) => {
    const { name, value } = e.target;
    setHealthData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Environmental Data Changes
  const handleEnvironmentalChange = (e) => {
    const { name, value } = e.target;
    setEnvironmentalData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Population Data Changes
  const handlePopulationChange = (e) => {
    const { name, value } = e.target;
    setPopulationData(prev => ({ ...prev, [name]: value }));
  };

  // Calculate Risk Score
  const calculateRiskScore = () => {
    const newCases = parseFloat(healthData.newCases) || 0;
    const rainfall = parseFloat(environmentalData.rainfall) || 0;
    const humidity = parseFloat(environmentalData.humidity) || 0;
    
    // Convert population to density estimate
    const population = parseFloat(populationData.population) || 0;
    const densityWeight = populationData.densityLevel === 'High' ? 10000 : populationData.densityLevel === 'Medium' ? 5000 : 1000;
    const populationDensity = population > 0 ? (population / 100) : densityWeight;
    
    const hospitalAdmissions = parseFloat(healthData.hospitalAdmissions) || 0;

    // Weighted formula
    const rawScore = 
      (0.4 * newCases) + 
      (0.2 * rainfall) + 
      (0.2 * humidity) + 
      (0.1 * populationDensity) + 
      (0.1 * hospitalAdmissions);

    // Normalize to 0-100 scale
    const maxPossibleScore = (0.4 * 10000) + (0.2 * 500) + (0.2 * 100) + (0.1 * 50000) + (0.1 * 5000);
    const normalizedScore = Math.min(100, (rawScore / maxPossibleScore) * 100);

    return Math.round(normalizedScore * 10) / 10;
  };

  // Calculate Risk Score with Climate Variation
  const calculateRiskScoreWithClimate = (tempChange, rainChange, humidChange) => {
    const newCases = parseFloat(healthData.newCases) || 0;
    const rainfall = Math.max(0, (parseFloat(environmentalData.rainfall) || 0) + rainChange);
    const humidity = Math.max(0, Math.min(100, (parseFloat(environmentalData.humidity) || 0) + humidChange));
    
    // Convert population to density estimate
    const population = parseFloat(populationData.population) || 0;
    const densityWeight = populationData.densityLevel === 'High' ? 10000 : populationData.densityLevel === 'Medium' ? 5000 : 1000;
    const populationDensity = population > 0 ? (population / 100) : densityWeight;
    
    const hospitalAdmissions = parseFloat(healthData.hospitalAdmissions) || 0;

    // Weighted formula with adjusted climate values
    const rawScore = 
      (0.4 * newCases) + 
      (0.2 * rainfall) + 
      (0.2 * humidity) + 
      (0.1 * populationDensity) + 
      (0.1 * hospitalAdmissions);

    // Normalize to 0-100 scale
    const maxPossibleScore = (0.4 * 10000) + (0.2 * 500) + (0.2 * 100) + (0.1 * 50000) + (0.1 * 5000);
    const normalizedScore = Math.min(100, (rawScore / maxPossibleScore) * 100);

    return Math.round(normalizedScore * 10) / 10;
  };

  // Handle Climate Slider Changes
  const handleClimateChange = (name, value) => {
    const newVariation = { ...climateVariation, [name]: parseFloat(value) };
    setClimateVariation(newVariation);

    if (riskResults) {
      const newScore = calculateRiskScoreWithClimate(
        newVariation.temperatureChange,
        newVariation.rainfallChange,
        newVariation.humidityChange
      );
      const newClassification = classifyRisk(newScore);
      const difference = newScore - riskResults.score;
      const percentageChange = Math.abs(difference);

      setSimulatedRisk({
        score: newScore,
        classification: newClassification,
        difference: difference,
        percentageChange: percentageChange,
        isIncrease: difference > 0,
      });
    }
  };

  // Generate Detailed Report
  const generateDetailedReport = () => {
    if (!riskResults) return;

    setIsGeneratingReport(true);

    setTimeout(() => {
      const newCases = parseFloat(healthData.newCases) || 0;
      const rainfall = parseFloat(environmentalData.rainfall) || 0;
      const humidity = parseFloat(environmentalData.humidity) || 0;
      const temperature = parseFloat(environmentalData.temperature) || 0;
      const population = parseFloat(populationData.population) || 0;
      const densityWeight = populationData.densityLevel === 'High' ? 10000 : populationData.densityLevel === 'Medium' ? 5000 : 1000;
      const populationDensity = population > 0 ? (population / 100) : densityWeight;
      const areaType = populationData.areaType;
      const riskLevel = riskResults.classification.level;

      // Generate Reasons for Outbreak
      const reasons = [];
      if (newCases > 300) {
        reasons.push(`High number of new cases (${newCases}) indicates rapid disease transmission in the community.`);
      } else if (newCases > 100) {
        reasons.push(`Moderate increase in new cases (${newCases}) suggests ongoing disease spread.`);
      } else {
        reasons.push(`Current case count (${newCases}) shows controlled disease transmission.`);
      }

      if (rainfall > 200) {
        reasons.push(`Excessive rainfall (${rainfall}mm) creates breeding grounds for disease vectors and increases waterborne disease risk.`);
      } else if (rainfall > 100) {
        reasons.push(`Elevated rainfall levels (${rainfall}mm) may contribute to vector-borne disease transmission.`);
      }

      if (humidity > 70) {
        reasons.push(`High humidity levels (${humidity}%) facilitate pathogen survival and transmission.`);
      }

      if (populationDensity > 8000) {
        reasons.push(`Very high population density (${populationDensity} per km²) in ${areaType} areas accelerates disease spread through close contact.`);
      } else if (populationDensity > 3000) {
        reasons.push(`Elevated population density (${populationDensity} per km²) increases transmission risk in ${areaType} settings.`);
      }

      if (temperature > 30) {
        reasons.push(`High temperatures (${temperature}°C) favor mosquito breeding and vector-borne disease transmission.`);
      } else if (temperature < 15) {
        reasons.push(`Lower temperatures (${temperature}°C) may increase indoor crowding and respiratory disease transmission.`);
      }

      // Generate Preventive Actions
      const preventiveActions = [];
      
      if (riskLevel === 'High' || riskLevel === 'Medium') {
        preventiveActions.push('Implement immediate vector control measures including fumigation and elimination of standing water.');
        preventiveActions.push('Enhance disease surveillance and contact tracing systems.');
        preventiveActions.push('Increase public health awareness campaigns about prevention measures.');
      }

      if (rainfall > 150) {
        preventiveActions.push('Strengthen drainage systems and prevent water accumulation in residential areas.');
        preventiveActions.push('Distribute mosquito nets and repellents to high-risk populations.');
      }

      if (populationDensity > 5000) {
        preventiveActions.push('Promote social distancing measures in crowded areas.');
        preventiveActions.push('Improve sanitation facilities in densely populated zones.');
      }

      preventiveActions.push('Ensure adequate medical supplies and hospital capacity.');
      preventiveActions.push('Conduct regular health screenings in affected communities.');
      preventiveActions.push('Establish isolation facilities for confirmed cases.');

      // Generate Summary
      const summary = `Based on current data analysis, the outbreak risk is classified as ${riskLevel} (${riskResults.score}%). ` +
        `The analysis indicates ${newCases} new cases this week in a ${areaType} area with population density of ${populationDensity} per km². ` +
        `Environmental factors including ${rainfall}mm rainfall and ${humidity}% humidity are ${riskLevel === 'High' ? 'significantly' : riskLevel === 'Medium' ? 'moderately' : 'minimally'} contributing to disease transmission. ` +
        `${riskLevel === 'High' ? 'Immediate intervention is required to prevent widespread outbreak.' : riskLevel === 'Medium' ? 'Proactive measures should be implemented to control disease spread.' : 'Continue monitoring and maintain preventive measures.'}`;

      // Generate Government Advisory
      const advisory = `GOVERNMENT HEALTH ADVISORY - ${riskLevel.toUpperCase()} RISK ALERT\n\n` +
        `Date: ${new Date().toLocaleDateString()}\n\n` +
        `SITUATION OVERVIEW:\n` +
        `The Department of Health has assessed the current disease outbreak risk as ${riskLevel} based on comprehensive data analysis. ` +
        `With ${newCases} new cases reported this week and environmental conditions favoring disease transmission, ` +
        `${riskLevel === 'High' ? 'immediate action is required' : riskLevel === 'Medium' ? 'enhanced vigilance is necessary' : 'continued monitoring is advised'}.\n\n` +
        `RECOMMENDED ACTIONS FOR CITIZENS:\n` +
        `• Maintain personal hygiene and wash hands frequently\n` +
        `• Use mosquito repellents and sleep under treated bed nets\n` +
        `• Seek immediate medical attention if symptoms develop\n` +
        `• Avoid crowded places and maintain social distancing\n` +
        `• Ensure proper waste disposal and eliminate standing water\n\n` +
        `GOVERNMENT RESPONSE:\n` +
        `Health authorities are ${riskLevel === 'High' ? 'actively deploying' : 'preparing'} emergency response teams and ensuring adequate medical resources. ` +
        `Citizens are advised to follow official health guidelines and report any suspected cases to local health centers.\n\n` +
        `For more information, contact the National Health Hotline or visit your nearest health facility.`;

      setDetailedReport({
        reasons,
        preventiveActions,
        summary,
        advisory,
        generatedAt: new Date().toLocaleString(),
      });

      setIsGeneratingReport(false);
    }, 1500);
  };

  // Generate PDF Report
  const generatePDF = () => {
    if (!riskResults || !detailedReport) return;

    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // Helper function to add text with word wrap
    const addText = (text, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      
      lines.forEach(line => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += fontSize * 0.5;
      });
      yPosition += 5;
    };

    // Title
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Disease Outbreak Prediction Report', pageWidth / 2, 20, { align: 'center' });
    
    yPosition = 40;
    doc.setTextColor(0, 0, 0);

    // Generated Date
    addText(`Generated: ${detailedReport.generatedAt}`, 10);
    yPosition += 5;

    // Input Data Section
    addText('INPUT DATA', 14, true);
    addText(`Disease: ${healthData.disease || 'N/A'}`, 10);
    addText(`New Cases This Week: ${healthData.newCases || 'N/A'}`, 10);
    addText(`Active Cases: ${healthData.activeCases || 'N/A'}`, 10);
    addText(`Hospital Admissions: ${healthData.hospitalAdmissions || 'N/A'}`, 10);
    addText(`Deaths: ${healthData.deaths || 'N/A'}`, 10);
    addText(`Sudden Increase: ${healthData.suddenIncrease}`, 10);
    addText(`Vaccination Rate: ${healthData.vaccinationRate || 'N/A'}%`, 10);
    addText(`Hospital Pressure: ${healthData.hospitalPressure}`, 10);
    addText(`Temperature: ${environmentalData.temperature || 'N/A'}°C`, 10);
    addText(`Rainfall: ${environmentalData.rainfall || 'N/A'}mm`, 10);
    addText(`Humidity: ${environmentalData.humidity || 'N/A'}%`, 10);
    addText(`Water Stagnation: ${environmentalData.waterStagnation}`, 10);
    addText(`Flooding: ${environmentalData.flooding}`, 10);
    addText(`Air Quality: ${environmentalData.airQuality}`, 10);
    addText(`Mosquito Increase: ${environmentalData.mosquitoIncrease}`, 10);
    addText(`Unusual Weather: ${environmentalData.unusualWeather}`, 10);
    addText(`Area Type: ${populationData.areaType}`, 10);
    addText(`Population: ${populationData.population || 'N/A'}`, 10);
    addText(`Density Level: ${populationData.densityLevel}`, 10);
    addText(`Public Gatherings: ${populationData.publicGatherings}`, 10);
    addText(`Migration Rate: ${populationData.migrationRate}`, 10);
    addText(`Household Size: ${populationData.householdSize || 'N/A'}`, 10);
    addText(`Clean Water Access: ${populationData.cleanWaterAccess}`, 10);
    addText(`Sanitation Level: ${populationData.sanitationLevel}`, 10);
    yPosition += 5;

    // Risk Score Section
    addText('RISK ANALYSIS', 14, true);
    addText(`Risk Score: ${riskResults.score}%`, 12, true);
    addText(`Risk Level: ${riskResults.classification.level}`, 12, true);
    yPosition += 5;

    // Weekly Projection
    addText('WEEKLY PROJECTION (Next 4 Weeks)', 12, true);
    riskResults.weeklyProjection.forEach((week, index) => {
      addText(`Week ${week.week}: ${week.score}% risk, ${week.cases} estimated cases`, 10);
    });
    yPosition += 5;

    // Monthly Projection
    addText('MONTHLY PROJECTION (Next 3 Months)', 12, true);
    riskResults.monthlyProjection.forEach((month, index) => {
      addText(`${month.month}: ${month.score}% risk, ${month.cases} estimated cases`, 10);
    });
    yPosition += 5;

    // Reasons for Outbreak
    addText('REASONS FOR OUTBREAK', 14, true);
    detailedReport.reasons.forEach((reason, index) => {
      addText(`${index + 1}. ${reason}`, 10);
    });
    yPosition += 5;

    // Preventive Actions
    addText('PREVENTIVE ACTIONS', 14, true);
    detailedReport.preventiveActions.forEach((action, index) => {
      addText(`• ${action}`, 10);
    });
    yPosition += 5;

    // Executive Summary
    addText('EXECUTIVE SUMMARY', 14, true);
    addText(detailedReport.summary, 10);
    yPosition += 5;

    // Government Advisory
    addText('GOVERNMENT ADVISORY', 14, true);
    const advisoryLines = detailedReport.advisory.split('\n');
    advisoryLines.forEach(line => {
      if (line.trim()) {
        addText(line, 9);
      } else {
        yPosition += 3;
      }
    });

    // Footer
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('SDG 3 - Good Health & Well-Being | Disease Outbreak Prediction Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF
    doc.save(`Outbreak_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Classify Risk Level
  const classifyRisk = (score) => {
    if (score <= 30) return { level: 'Low', color: 'green' };
    if (score <= 60) return { level: 'Medium', color: 'orange' };
    return { level: 'High', color: 'red' };
  };

  // Generate Weekly Projection
  const generateWeeklyProjection = (baseScore) => {
    const weeks = [];
    const growthFactor = baseScore > 50 ? 1.08 : 0.95;
    
    for (let i = 1; i <= 4; i++) {
      const projectedScore = baseScore * Math.pow(growthFactor, i);
      const variance = (Math.random() - 0.5) * 5;
      const finalScore = Math.max(0, Math.min(100, projectedScore + variance));
      
      weeks.push({
        week: i,
        score: Math.round(finalScore * 10) / 10,
        cases: Math.round((parseFloat(healthData.newCases) || 100) * Math.pow(growthFactor, i))
      });
    }
    
    return weeks;
  };

  // Generate Monthly Projection
  const generateMonthlyProjection = (baseScore) => {
    const months = ['Month 1', 'Month 2', 'Month 3'];
    const projections = [];
    const growthFactor = baseScore > 50 ? 1.15 : 0.88;
    
    for (let i = 1; i <= 3; i++) {
      const projectedScore = baseScore * Math.pow(growthFactor, i);
      const variance = (Math.random() - 0.5) * 8;
      const finalScore = Math.max(0, Math.min(100, projectedScore + variance));
      
      projections.push({
        month: months[i - 1],
        score: Math.round(finalScore * 10) / 10,
        cases: Math.round((parseFloat(healthData.newCases) || 100) * Math.pow(growthFactor, i) * 4)
      });
    }
    
    return projections;
  };

  // Handle Form Submission
  const handleGenerateRisk = (e) => {
    e.preventDefault();
    setIsAnalyzing(true);

    // Reset climate variation
    setClimateVariation({
      temperatureChange: 0,
      rainfallChange: 0,
      humidityChange: 0,
    });
    setSimulatedRisk(null);

    // Simulate analysis delay
    setTimeout(() => {
      const riskScore = calculateRiskScore();
      const riskClassification = classifyRisk(riskScore);
      const weeklyProjection = generateWeeklyProjection(riskScore);
      const monthlyProjection = generateMonthlyProjection(riskScore);

      setRiskResults({
        score: riskScore,
        classification: riskClassification,
        weeklyProjection,
        monthlyProjection,
      });

      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto"
    >
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          AI-Based Disease Outbreak Prediction
        </h1>
        <p className="text-gray-600">
          Enter health, environmental, and population data to predict outbreak risk
        </p>
      </div>

      <form onSubmit={handleGenerateRisk}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Section 1 - Health Data */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">🏥 Health Data</h2>
                <p className="text-sm text-gray-500">Current disease statistics</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="disease" className="block text-sm font-medium text-gray-700 mb-2">
                  Disease Type
                </label>
                <select
                  id="disease"
                  name="disease"
                  value={healthData.disease}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="">Select Disease</option>
                  <option value="Dengue">Dengue</option>
                  <option value="Malaria">Malaria</option>
                  <option value="Cholera">Cholera</option>
                  <option value="COVID-19">COVID-19</option>
                  <option value="Typhoid">Typhoid</option>
                  <option value="Influenza">Influenza</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="newCases" className="block text-sm font-medium text-gray-700 mb-2">
                  New Cases This Week
                </label>
                <input
                  type="number"
                  id="newCases"
                  name="newCases"
                  value={healthData.newCases}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 320"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="activeCases" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Active Cases
                </label>
                <input
                  type="number"
                  id="activeCases"
                  name="activeCases"
                  value={healthData.activeCases}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 1250"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="hospitalAdmissions" className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Admissions
                </label>
                <input
                  type="number"
                  id="hospitalAdmissions"
                  name="hospitalAdmissions"
                  value={healthData.hospitalAdmissions}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 85"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="deaths" className="block text-sm font-medium text-gray-700 mb-2">
                  Deaths Reported
                </label>
                <input
                  type="number"
                  id="deaths"
                  name="deaths"
                  value={healthData.deaths}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 12"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="suddenIncrease" className="block text-sm font-medium text-gray-700 mb-2">
                  Sudden Increase in Cases?
                </label>
                <select
                  id="suddenIncrease"
                  name="suddenIncrease"
                  value={healthData.suddenIncrease}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label htmlFor="vaccinationRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Vaccination Rate (%)
                </label>
                <input
                  type="number"
                  id="vaccinationRate"
                  name="vaccinationRate"
                  value={healthData.vaccinationRate}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 65"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div>
                <label htmlFor="hospitalPressure" className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Pressure Level
                </label>
                <select
                  id="hospitalPressure"
                  name="hospitalPressure"
                  value={healthData.hospitalPressure}
                  onChange={handleHealthChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Section 2 - Environmental Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Cloud className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">🌦 Environmental Data</h2>
                <p className="text-sm text-gray-500">Climate and air conditions</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                  Average Temperature (°C)
                </label>
                <input
                  type="number"
                  id="temperature"
                  name="temperature"
                  value={environmentalData.temperature}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 28.5"
                  step="0.1"
                />
              </div>

              <div>
                <label htmlFor="rainfall" className="block text-sm font-medium text-gray-700 mb-2">
                  Rainfall (mm)
                </label>
                <input
                  type="number"
                  id="rainfall"
                  name="rainfall"
                  value={environmentalData.rainfall}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 150"
                  min="0"
                  step="0.1"
                />
              </div>

              <div>
                <label htmlFor="humidity" className="block text-sm font-medium text-gray-700 mb-2">
                  Humidity (%)
                </label>
                <input
                  type="number"
                  id="humidity"
                  name="humidity"
                  value={environmentalData.humidity}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 75"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div>
                <label htmlFor="waterStagnation" className="block text-sm font-medium text-gray-700 mb-2">
                  Water Stagnation Present?
                </label>
                <select
                  id="waterStagnation"
                  name="waterStagnation"
                  value={environmentalData.waterStagnation}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label htmlFor="flooding" className="block text-sm font-medium text-gray-700 mb-2">
                  Recent Flooding?
                </label>
                <select
                  id="flooding"
                  name="flooding"
                  value={environmentalData.flooding}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label htmlFor="airQuality" className="block text-sm font-medium text-gray-700 mb-2">
                  Air Quality
                </label>
                <select
                  id="airQuality"
                  name="airQuality"
                  value={environmentalData.airQuality}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Good">Good</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="mosquitoIncrease" className="block text-sm font-medium text-gray-700 mb-2">
                  Mosquito Population Increase?
                </label>
                <select
                  id="mosquitoIncrease"
                  name="mosquitoIncrease"
                  value={environmentalData.mosquitoIncrease}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label htmlFor="unusualWeather" className="block text-sm font-medium text-gray-700 mb-2">
                  Unusual Weather Patterns?
                </label>
                <select
                  id="unusualWeather"
                  name="unusualWeather"
                  value={environmentalData.unusualWeather}
                  onChange={handleEnvironmentalChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Section 3 - Population Data */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">👥 Population Data</h2>
                <p className="text-sm text-gray-500">Demographics and density</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="areaType" className="block text-sm font-medium text-gray-700 mb-2">
                  Area Type
                </label>
                <select
                  id="areaType"
                  name="areaType"
                  value={populationData.areaType}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Urban">Urban</option>
                  <option value="Semi-Urban">Semi-Urban</option>
                  <option value="Rural">Rural</option>
                </select>
              </div>

              <div>
                <label htmlFor="population" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Population
                </label>
                <input
                  type="number"
                  id="population"
                  name="population"
                  value={populationData.population}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 50000"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="densityLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Population Density Level
                </label>
                <select
                  id="densityLevel"
                  name="densityLevel"
                  value={populationData.densityLevel}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="publicGatherings" className="block text-sm font-medium text-gray-700 mb-2">
                  Frequent Public Gatherings?
                </label>
                <select
                  id="publicGatherings"
                  name="publicGatherings"
                  value={populationData.publicGatherings}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label htmlFor="migrationRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Migration Rate
                </label>
                <select
                  id="migrationRate"
                  name="migrationRate"
                  value={populationData.migrationRate}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="householdSize" className="block text-sm font-medium text-gray-700 mb-2">
                  Average Household Size
                </label>
                <input
                  type="number"
                  id="householdSize"
                  name="householdSize"
                  value={populationData.householdSize}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g., 5"
                  min="1"
                  step="1"
                />
              </div>

              <div>
                <label htmlFor="cleanWaterAccess" className="block text-sm font-medium text-gray-700 mb-2">
                  Clean Water Access?
                </label>
                <select
                  id="cleanWaterAccess"
                  name="cleanWaterAccess"
                  value={populationData.cleanWaterAccess}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label htmlFor="sanitationLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Sanitation Level
                </label>
                <select
                  id="sanitationLevel"
                  name="sanitationLevel"
                  value={populationData.sanitationLevel}
                  onChange={handlePopulationChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 font-medium">Data Collection</p>
                    <p className="text-xs text-blue-700 mt-1">
                      All fields are optional. More data provides better predictions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center mb-8"
        >
          <button
            type="submit"
            disabled={isAnalyzing}
            className={`px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-3 ${
              isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Activity className={`w-6 h-6 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Generate Outbreak Risk'}
          </button>
        </motion.div>
      </form>

      {/* Risk Results */}
      <AnimatePresence>
        {riskResults && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Risk Score Display */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Risk Analysis Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Risk Score */}
                <div className="text-center">
                  <p className="text-gray-600 mb-2">Risk Score</p>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-6xl font-bold"
                    style={{ color: riskResults.classification.color === 'green' ? '#22c55e' : riskResults.classification.color === 'orange' ? '#f97316' : '#ef4444' }}
                  >
                    {riskResults.score}%
                  </motion.div>
                </div>

                {/* Risk Category */}
                <div className="text-center">
                  <p className="text-gray-600 mb-2">Risk Level</p>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className={`inline-block px-6 py-3 rounded-full text-2xl font-bold ${
                      riskResults.classification.color === 'green' ? 'bg-green-100 text-green-700' :
                      riskResults.classification.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}
                  >
                    {riskResults.classification.level} Risk
                  </motion.span>
                </div>
              </div>

              {/* Risk Meter Bar */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Risk Meter</p>
                <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${riskResults.score}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      riskResults.classification.color === 'green' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      riskResults.classification.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                      'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% (Low)</span>
                  <span>50% (Medium)</span>
                  <span>100% (High)</span>
                </div>
              </div>
            </div>

            {/* Projections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Projection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Weekly Projection</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Next 4 weeks forecast</p>
                
                <div className="space-y-3">
                  {riskResults.weeklyProjection.map((week, index) => (
                    <motion.div
                      key={week.week}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {week.score > riskResults.score ? (
                          <TrendingUp className="w-5 h-5 text-red-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-green-500" />
                        )}
                        <span className="font-medium text-gray-900">Week {week.week}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{week.score}%</p>
                        <p className="text-xs text-gray-500">{week.cases} cases</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Monthly Projection */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Monthly Projection</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Next 3 months forecast</p>
                
                <div className="space-y-3">
                  {riskResults.monthlyProjection.map((month, index) => (
                    <motion.div
                      key={month.month}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {month.score > riskResults.score ? (
                          <TrendingUp className="w-5 h-5 text-red-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-green-500" />
                        )}
                        <span className="font-medium text-gray-900">{month.month}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{month.score}%</p>
                        <p className="text-xs text-gray-500">{month.cases} cases</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Climate Variation Simulation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-lg p-6 border-2 border-blue-200"
            >
              <div className="flex items-center gap-2 mb-4">
                <Cloud className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Climate Variation Simulation</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Adjust climate parameters to see how environmental changes affect outbreak risk
              </p>

              <div className="space-y-6">
                {/* Temperature Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Temperature Change (°C)
                    </label>
                    <span className="text-sm font-semibold text-primary-600">
                      {climateVariation.temperatureChange > 0 ? '+' : ''}
                      {climateVariation.temperatureChange}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={climateVariation.temperatureChange}
                    onChange={(e) => handleClimateChange('temperatureChange', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-10°C</span>
                    <span>0°C</span>
                    <span>+10°C</span>
                  </div>
                </div>

                {/* Rainfall Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Rainfall Change (mm)
                    </label>
                    <span className="text-sm font-semibold text-primary-600">
                      {climateVariation.rainfallChange > 0 ? '+' : ''}
                      {climateVariation.rainfallChange}mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={climateVariation.rainfallChange}
                    onChange={(e) => handleClimateChange('rainfallChange', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-50mm</span>
                    <span>0mm</span>
                    <span>+50mm</span>
                  </div>
                </div>

                {/* Humidity Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Humidity Change (%)
                    </label>
                    <span className="text-sm font-semibold text-primary-600">
                      {climateVariation.humidityChange > 0 ? '+' : ''}
                      {climateVariation.humidityChange}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={climateVariation.humidityChange}
                    onChange={(e) => handleClimateChange('humidityChange', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-20%</span>
                    <span>0%</span>
                    <span>+20%</span>
                  </div>
                </div>
              </div>

              {/* Simulated Risk Display */}
              {simulatedRisk && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 p-6 bg-white rounded-xl shadow-md border-2 border-primary-200"
                >
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Simulated Risk Analysis</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Original Risk</p>
                      <p className="text-3xl font-bold text-gray-900">{riskResults.score}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Simulated Risk</p>
                      <p 
                        className="text-3xl font-bold"
                        style={{ 
                          color: simulatedRisk.classification.color === 'green' ? '#22c55e' : 
                                 simulatedRisk.classification.color === 'orange' ? '#f97316' : '#ef4444' 
                        }}
                      >
                        {simulatedRisk.score}%
                      </p>
                    </div>
                  </div>

                  {/* Risk Comparison */}
                  <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg">
                    {simulatedRisk.isIncrease ? (
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    )}
                    <p className={`font-semibold ${simulatedRisk.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                      Risk {simulatedRisk.isIncrease ? 'increased' : 'decreased'} by {simulatedRisk.percentageChange.toFixed(1)}%
                    </p>
                  </div>

                  {/* New Risk Level Badge */}
                  <div className="mt-4 text-center">
                    <span
                      className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                        simulatedRisk.classification.color === 'green' ? 'bg-green-100 text-green-700' :
                        simulatedRisk.classification.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {simulatedRisk.classification.level} Risk
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Generate Report Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-6 flex justify-center"
            >
              <button
                onClick={generateDetailedReport}
                disabled={isGeneratingReport}
                className={`px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-3 ${
                  isGeneratingReport ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Activity className={`w-6 h-6 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                {isGeneratingReport ? 'Generating Report...' : 'Generate Detailed Report'}
              </button>
            </motion.div>

            {/* Detailed Report Display */}
            {detailedReport && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-6 space-y-6"
              >
                {/* Reasons for Outbreak */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    Reasons for Outbreak
                  </h3>
                  <ul className="space-y-3">
                    {detailedReport.reasons.map((reason, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500"
                      >
                        <span className="text-red-600 font-bold">{index + 1}.</span>
                        <p className="text-gray-700">{reason}</p>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Preventive Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-green-600" />
                    Preventive Actions
                  </h3>
                  <ul className="space-y-3">
                    {detailedReport.preventiveActions.map((action, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500"
                      >
                        <span className="text-green-600 font-bold">✓</span>
                        <p className="text-gray-700">{action}</p>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">{detailedReport.summary}</p>
                  <p className="text-sm text-gray-500 mt-4">Generated: {detailedReport.generatedAt}</p>
                </div>

                {/* Government Advisory */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-400">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    Government Advisory Draft
                  </h3>
                  <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                      {detailedReport.advisory}
                    </pre>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(detailedReport.advisory)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                      Copy Advisory
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      Print Report
                    </button>
                    <button
                      onClick={generatePDF}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Save as PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Section */}
      {!riskResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="text-primary-600 font-bold">1.</span>
              <p>Enter current health statistics and disease data</p>
            </div>
            <div className="flex gap-2">
              <span className="text-primary-600 font-bold">2.</span>
              <p>Provide environmental conditions affecting disease spread</p>
            </div>
            <div className="flex gap-2">
              <span className="text-primary-600 font-bold">3.</span>
              <p>Add population demographics for accurate risk assessment</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PredictOutbreak;
