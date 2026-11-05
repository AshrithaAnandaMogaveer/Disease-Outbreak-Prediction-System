from typing import List, Dict
from app.schemas.prediction_schema import ReportData

class ReportService:
    
    @staticmethod
    def generate_reasons(
        health_data: Dict,
        environmental_data: Dict,
        population_data: Dict
    ) -> List[str]:
        """Generate outbreak reasons based on data thresholds"""
        reasons = []
        
        if health_data.get("new_cases", 0) > 100:
            reasons.append(f"High number of new cases reported ({health_data['new_cases']} cases)")
        
        if environmental_data.get("rainfall", 0) > 100:
            reasons.append(f"Excessive rainfall ({environmental_data['rainfall']}mm) creating breeding grounds")
        
        if environmental_data.get("humidity", 0) > 70:
            reasons.append(f"High humidity levels ({environmental_data['humidity']}%) favorable for disease spread")
        
        if environmental_data.get("temperature", 0) > 30:
            reasons.append(f"Elevated temperatures ({environmental_data['temperature']}°C) accelerating pathogen growth")
        
        if population_data.get("population_density", 0) > 1000:
            reasons.append(f"High population density ({population_data['population_density']} per sq km) increasing transmission")
        
        if health_data.get("hospital_admissions", 0) > 50:
            reasons.append(f"Increased hospital admissions ({health_data['hospital_admissions']}) indicating severity")
        
        if not reasons:
            reasons.append("Current conditions show moderate risk factors requiring monitoring")
        
        return reasons

    @staticmethod
    def generate_preventive_actions(risk_level: str) -> List[str]:
        """Generate preventive actions based on risk level"""
        
        common_actions = [
            "Maintain personal hygiene and regular handwashing",
            "Ensure proper sanitation in residential areas",
            "Monitor health symptoms and report unusual patterns"
        ]
        
        if risk_level == "High":
            return [
                "Implement immediate lockdown measures in affected areas",
                "Deploy rapid response medical teams",
                "Establish emergency quarantine facilities",
                "Conduct mass screening and testing campaigns",
                "Distribute protective equipment to healthcare workers",
                "Activate emergency communication protocols"
            ] + common_actions
        
        elif risk_level == "Medium":
            return [
                "Increase surveillance in high-risk areas",
                "Enhance public awareness campaigns",
                "Strengthen healthcare facility preparedness",
                "Conduct targeted vaccination drives if applicable",
                "Improve vector control measures"
            ] + common_actions
        
        else:  # Low
            return [
                "Continue routine health monitoring",
                "Maintain standard hygiene protocols",
                "Conduct regular community health education",
                "Keep emergency response systems on standby"
            ] + common_actions

    @staticmethod
    def generate_executive_summary(
        risk_score: float,
        risk_level: str,
        health_data: Dict,
        environmental_data: Dict
    ) -> str:
        """Generate executive summary paragraph"""
        
        summary = f"Based on comprehensive analysis of health, environmental, and population data, "
        summary += f"the current outbreak risk is classified as {risk_level} with a risk score of {risk_score}%. "
        
        if risk_level == "High":
            summary += f"Immediate action is required as {health_data.get('new_cases', 0)} new cases have been reported. "
            summary += "Environmental conditions including elevated temperature and humidity levels are contributing to rapid disease spread. "
            summary += "Emergency response protocols should be activated immediately to contain the outbreak."
        
        elif risk_level == "Medium":
            summary += f"Moderate concern exists with {health_data.get('new_cases', 0)} new cases reported. "
            summary += "Environmental factors show conditions favorable for disease transmission. "
            summary += "Enhanced surveillance and preventive measures are recommended to prevent escalation."
        
        else:
            summary += "Current conditions indicate manageable risk levels. "
            summary += "Standard monitoring and preventive protocols should be maintained. "
            summary += "Continued vigilance is advised to detect any emerging patterns early."
        
        return summary

    @staticmethod
    def generate_government_advisory(risk_level: str, risk_score: float) -> str:
        """Generate government advisory draft"""
        
        advisory = "GOVERNMENT HEALTH ADVISORY\n\n"
        advisory += f"Risk Level: {risk_level.upper()} ({risk_score}%)\n\n"
        
        if risk_level == "High":
            advisory += "URGENT ACTION REQUIRED\n\n"
            advisory += "The Ministry of Health declares a health emergency in the affected regions. "
            advisory += "All citizens are advised to follow strict safety protocols. "
            advisory += "Non-essential travel should be avoided. "
            advisory += "Healthcare facilities are on high alert. "
            advisory += "Emergency hotlines are operational 24/7. "
            advisory += "Cooperation with health authorities is mandatory."
        
        elif risk_level == "Medium":
            advisory += "HEIGHTENED ALERT STATUS\n\n"
            advisory += "The Ministry of Health advises increased caution in affected areas. "
            advisory += "Citizens should follow preventive guidelines and report symptoms promptly. "
            advisory += "Healthcare facilities are prepared for increased patient load. "
            advisory += "Public gatherings should be limited where possible. "
            advisory += "Regular updates will be provided through official channels."
        
        else:
            advisory += "STANDARD MONITORING STATUS\n\n"
            advisory += "The Ministry of Health continues routine surveillance. "
            advisory += "Citizens should maintain standard hygiene practices. "
            advisory += "No special restrictions are currently in place. "
            advisory += "The situation is under control with ongoing monitoring. "
            advisory += "Updates will be provided if conditions change."
        
        advisory += "\n\nFor more information, contact the National Health Helpline or visit the official health portal."
        
        return advisory

    @staticmethod
    def generate_report(
        risk_score: float,
        risk_level: str,
        health_data: Dict,
        environmental_data: Dict,
        population_data: Dict
    ) -> ReportData:
        """Generate complete report"""
        
        reasons = ReportService.generate_reasons(health_data, environmental_data, population_data)
        preventive_actions = ReportService.generate_preventive_actions(risk_level)
        executive_summary = ReportService.generate_executive_summary(
            risk_score, risk_level, health_data, environmental_data
        )
        government_advisory = ReportService.generate_government_advisory(risk_level, risk_score)
        
        return ReportData(
            reasons=reasons,
            preventive_actions=preventive_actions,
            executive_summary=executive_summary,
            government_advisory=government_advisory
        )
