"""
Report Agent - Handles report generation, government advisories, and recommendations
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ReportAgent:
    """Agent for generating reports and advisories"""
    
    def process(self, query: str, user_id: str) -> str:
        """Process report and advisory queries"""
        logger.info(f"ReportAgent processing query for user {user_id}: {query[:50]}...")
        
        query_lower = query.lower()
        
        # Check for government advisory query
        if any(phrase in query_lower for phrase in ["government advisory", "govt advisory", "official advisory", "public health advisory"]):
            return self._generate_government_advisory()
        
        # Check for preventive actions query
        if any(phrase in query_lower for phrase in ["preventive action", "prevention action", "what to do", "how to prevent"]):
            return self._generate_preventive_actions()
        
        # Check for emergency response query
        if any(word in query_lower for word in ["emergency", "urgent", "crisis", "outbreak response"]):
            return self._generate_emergency_response()
        
        # Check for community guidelines query
        if any(word in query_lower for word in ["community", "public", "guidelines", "recommendations"]):
            return self._generate_community_guidelines()
        
        # Default report response
        return self._default_report_response()
    
    def _generate_government_advisory(self) -> str:
        """Generate government advisory format"""
        current_date = datetime.now().strftime("%B %d, %Y")
        
        return f"""**GOVERNMENT HEALTH ADVISORY**
**Date:** {current_date}

**SUBJECT:** Disease Outbreak Prevention and Control Measures

**TO:** All Citizens and Health Authorities

**ADVISORY LEVEL:** Moderate to High Risk Areas

**IMMEDIATE ACTIONS REQUIRED:**

**For Citizens:**
1. **Personal Protection:**
   - Maintain strict hygiene practices
   - Use appropriate protective measures (masks, repellents)
   - Avoid crowded places if possible
   - Stay informed through official channels

2. **Health Monitoring:**
   - Monitor for symptoms daily
   - Seek immediate medical attention if symptoms appear
   - Follow quarantine protocols if exposed
   - Complete prescribed treatment courses

3. **Community Responsibility:**
   - Report suspected cases to health authorities
   - Cooperate with contact tracing efforts
   - Support vulnerable community members
   - Follow local health guidelines

**For Health Authorities:**
1. **Surveillance:**
   - Enhance disease surveillance systems
   - Implement rapid testing protocols
   - Monitor high-risk areas closely
   - Report cases promptly

2. **Response:**
   - Activate emergency response teams
   - Ensure adequate medical supplies
   - Coordinate with local authorities
   - Provide public health education

3. **Prevention:**
   - Conduct vector control operations
   - Organize vaccination drives
   - Improve sanitation infrastructure
   - Distribute preventive materials

**HELPLINE:** Contact local health department for assistance

**This advisory is based on current outbreak risk assessment and may be updated as situation evolves.**"""
    
    def _generate_preventive_actions(self) -> str:
        """Generate preventive action recommendations"""
        return """**PREVENTIVE ACTIONS - COMPREHENSIVE GUIDE**

**IMMEDIATE ACTIONS (Do Now):**

**Personal Level:**
✓ Wash hands frequently with soap (20+ seconds)
✓ Use hand sanitizer when soap unavailable
✓ Wear masks in crowded or high-risk areas
✓ Maintain physical distance (6 feet minimum)
✓ Cover mouth/nose when coughing or sneezing
✓ Avoid touching face with unwashed hands

**Home Level:**
✓ Ensure proper ventilation
✓ Clean and disinfect frequently touched surfaces
✓ Eliminate standing water (mosquito breeding)
✓ Use mosquito nets and screens
✓ Store food properly
✓ Ensure safe drinking water

**SHORT-TERM ACTIONS (This Week):**

✓ Get vaccinated (if available and eligible)
✓ Stock essential medicines and supplies
✓ Create family emergency plan
✓ Identify nearest healthcare facility
✓ Educate family members about symptoms
✓ Install/repair window screens

**LONG-TERM ACTIONS (Ongoing):**

✓ Maintain healthy lifestyle and immunity
✓ Regular health check-ups
✓ Stay informed about local health situation
✓ Participate in community health programs
✓ Support public health initiatives
✓ Practice sustainable hygiene habits

**COMMUNITY ACTIONS:**

✓ Organize awareness campaigns
✓ Support vulnerable populations
✓ Maintain clean neighborhoods
✓ Report health hazards to authorities
✓ Participate in vector control programs

**Remember:** Prevention is most effective when practiced consistently by everyone."""
    
    def _generate_emergency_response(self) -> str:
        """Generate emergency response guidelines"""
        return """**EMERGENCY OUTBREAK RESPONSE PROTOCOL**

**🚨 IMMEDIATE ACTIONS IN EMERGENCY:**

**If You Have Symptoms:**
1. **Isolate immediately** - Stay away from others
2. **Contact healthcare** - Call before visiting
3. **Monitor symptoms** - Track temperature and changes
4. **Stay hydrated** - Drink plenty of fluids
5. **Follow medical advice** - Complete treatment

**If Someone in Household is Sick:**
1. **Separate the person** - Dedicated room if possible
2. **Use separate bathroom** - If available
3. **Limit contact** - Only one caregiver
4. **Wear protection** - Masks and gloves
5. **Disinfect regularly** - Especially shared spaces

**EMERGENCY CONTACTS:**

**Medical Emergency:** Call local emergency number
**Health Helpline:** Contact health department
**Ambulance:** Request medical transport
**Poison Control:** For exposure incidents

**EMERGENCY SUPPLIES CHECKLIST:**

Medical:
□ Thermometer
□ First aid kit
□ Prescribed medications
□ OTC fever reducers
□ Oral rehydration salts

Protection:
□ Masks (N95 or surgical)
□ Gloves
□ Hand sanitizer
□ Disinfectants
□ Soap

Essentials:
□ Water (3-day supply)
□ Non-perishable food
□ Flashlight and batteries
□ Important documents
□ Emergency contacts list

**WHEN TO SEEK IMMEDIATE MEDICAL HELP:**

🚨 Difficulty breathing
🚨 Persistent chest pain
🚨 Severe dehydration
🚨 Confusion or inability to wake
🚨 Bluish lips or face
🚨 Severe or persistent vomiting
🚨 High fever not responding to medication

**DO NOT DELAY** - Early intervention saves lives!"""
    
    def _generate_community_guidelines(self) -> str:
        """Generate community health guidelines"""
        return """**COMMUNITY HEALTH GUIDELINES**

**INDIVIDUAL RESPONSIBILITIES:**

**Daily Practices:**
- Maintain personal hygiene
- Follow health protocols
- Stay home when sick
- Get tested if symptomatic
- Complete isolation period if infected
- Support contact tracing efforts

**COMMUNITY RESPONSIBILITIES:**

**Neighborhood Level:**
- Keep common areas clean
- Eliminate mosquito breeding sites
- Organize health awareness sessions
- Support elderly and vulnerable neighbors
- Share accurate health information
- Report health hazards promptly

**Workplace:**
- Implement health screening
- Ensure proper ventilation
- Provide hygiene facilities
- Allow sick leave flexibility
- Educate employees
- Follow occupational health guidelines

**Schools:**
- Monitor student health daily
- Maintain hygiene standards
- Educate about disease prevention
- Coordinate with health authorities
- Have isolation protocols
- Communicate with parents

**PUBLIC SPACES:**

**Markets & Shops:**
- Limit crowd size
- Ensure ventilation
- Provide sanitization facilities
- Display health guidelines
- Monitor vendor health

**Transportation:**
- Maintain cleanliness
- Ensure ventilation
- Limit capacity if needed
- Provide sanitizers
- Enforce mask usage

**COMMUNITY LEADERS:**

Responsibilities:
- Disseminate accurate information
- Coordinate with health authorities
- Organize prevention activities
- Support vulnerable populations
- Monitor community health
- Report outbreaks promptly

**Together, we can prevent and control disease outbreaks!**"""
    
    def _default_report_response(self) -> str:
        """Default response for report queries"""
        return """**Report & Advisory Services:**

I can help you with:

📋 **Government Advisories**
- Official health advisories
- Public health announcements
- Emergency protocols

🛡️ **Preventive Actions**
- Personal protection measures
- Community prevention strategies
- Long-term prevention plans

🚨 **Emergency Response**
- Emergency protocols
- When to seek help
- Emergency contacts

👥 **Community Guidelines**
- Community responsibilities
- Workplace guidelines
- Public space protocols

What type of report or advisory would you like to see?"""
