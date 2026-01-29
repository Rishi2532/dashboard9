/**
 * Widget Context Messages Service
 * Provides contextual, informative messages before displaying widgets
 * Hybrid approach: Pre-written templates + AI enhancement for complex queries
 */

import { translateRegionName, type Language } from "@/lib/translations";
import { translateMessageWithOpenAI, getOpenAICompletion } from "@/services/openai-service";

interface WidgetContextParams {
  widgetType: string;
  region?: string;
  scheme?: string;
  village?: string;
  count?: number;
  userQuery?: string;
  language?: 'en' | 'hi' | 'mr';
}

interface ContextMessage {
  text: string;
  shouldEnhanceWithAI?: boolean;
}

/**
 * Pre-written contextual templates for all widget types
 * These provide instant, consistent messaging without API calls
 */
export function getWidgetContextMessage(params: WidgetContextParams): ContextMessage {
  const { widgetType, region = 'all regions', scheme, village, count, userQuery } = params;
  
  // Determine scope text for filtering
  let scopeText = '';
  if (village && village !== 'all') {
    scopeText = `in ${village} village`;
  } else if (scheme && scheme !== 'all') {
    scopeText = `for scheme ${scheme}`;
  } else if (region && region !== 'all') {
    scopeText = `in ${region} region`;
  } else {
    scopeText = 'across all regions';
  }

  const templates: { [key: string]: ContextMessage } = {
    // ==================== LPCD WIDGETS ====================
    'Above55LpcdWidget': {
      text: `🌊 **Adequate Water Supply - LPCD Above 55 ${scopeText}**

These villages are meeting the Jal Jeevan Mission standard of 55 LPCD (Liters Per Capita Per Day).

**What this indicates:**
✅ Sufficient water availability
✅ Meeting government benchmarks  
✅ Good infrastructure performance
✅ Reliable service delivery

**Why 55 LPCD matters:**
This is the minimum standard set by the Jal Jeevan Mission to ensure adequate daily water supply for drinking, cooking, and basic sanitation needs.

${count ? `**Found ${count} villages** ${scopeText} with LPCD > 55:` : '**Here are the villages with adequate water supply:**'}`,
      shouldEnhanceWithAI: false
    },

    'Below55LpcdWidget': {
      text: `⚠️ **Insufficient Water Supply - LPCD Below 55 ${scopeText}**

These villages are falling short of the Jal Jeevan Mission benchmark of 55 LPCD.

**What this means:**
❌ Below minimum water availability standard
⚠️ Potential supply issues
📉 Infrastructure may need attention
🔍 Requires monitoring and intervention

**Possible causes:**
• High population vs. limited infrastructure
• Inconsistent water supply timing
• Pipeline leaks or distribution issues
• Seasonal demand variations

**Recommended actions:**
1. Review infrastructure capacity
2. Check for leaks in distribution network
3. Assess pump performance
4. Consider capacity expansion if persistent

${count ? `**Found ${count} villages** ${scopeText} with LPCD < 55:` : '**Here are the villages needing attention:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentAbove55LpcdWidget': {
      text: `✅ **Consistently Good Performance - Stable LPCD Above 55 ${scopeText}**

These villages have maintained LPCD above 55 consistently over the past 7 days.

**What this excellence means:**
🌟 Reliable, consistent water supply
✅ Well-maintained infrastructure
💯 Exceeding minimum standards
📊 Predictable service delivery

**Why consistency matters:**
Consistent performance indicates stable infrastructure, proper maintenance, and reliable operations. These are model villages for water supply management.

**Best practices observed:**
• Regular infrastructure maintenance
• Proper pump scheduling
• Effective distribution management
• Quick response to issues

${count ? `**Found ${count} villages** ${scopeText} with consistent LPCD > 55:` : '**Here are the consistently performing villages:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentBelow55LpcdWidget': {
      text: `🚨 **Persistent Issue - Consistently Low LPCD ${scopeText}**

These villages have remained below 55 LPCD for the past 7 consecutive days.

**Critical indicators:**
❌ Chronic water shortage
🔴 Urgent intervention needed
📉 Sustained infrastructure issues
⚠️ High impact on residents

**Why this is concerning:**
Consistent low LPCD indicates systemic problems that need immediate attention. Residents are experiencing prolonged inadequate water supply.

**Immediate actions required:**
1. **Urgent:** Field team inspection
2. Assess pump and pipeline capacity
3. Check for major leaks or blockages
4. Review population vs. infrastructure ratio
5. Create helpdesk ticket for priority resolution

${count ? `**Found ${count} villages** ${scopeText} with persistent low LPCD:` : '**These villages need urgent attention:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageAbove55LpcdWidget': {
      text: `📊 **Average Performance - LPCD Above 55 (7-Day Average) ${scopeText}**

These villages have an average LPCD above 55 over the past week, though daily values may vary.

**Analysis approach:**
📈 Using 7-day rolling average
📊 Smooths out daily fluctuations
🔍 Shows overall trend

**What average above 55 means:**
Overall adequate supply despite some daily variations. Infrastructure is generally performing well but may have occasional dips.

${count ? `**Found ${count} villages** ${scopeText} with average LPCD > 55:` : '**Villages with good average performance:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageBelow55LpcdWidget': {
      text: `⚠️ **Concerning Trend - Average LPCD Below 55 ${scopeText}**

These villages average below 55 LPCD over the past 7 days, indicating a persistent supply issue.

**Trend analysis:**
📉 7-day average below benchmark
⚠️ Not just occasional dips
🔍 Sustained underperformance

**What this trend suggests:**
Infrastructure or operational issues that need investigation and resolution to improve average performance.

${count ? `**Found ${count} villages** ${scopeText} with average LPCD < 55:` : '**Villages with concerning average performance:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== CHLORINE WIDGETS ====================
    'OptimalChlorineWidget': {
      text: `🧪 **Safe Water Quality - Optimal Chlorine Levels ${scopeText}**

ESRs with chlorine between 0.2-0.5 mg/L ensure safe, properly disinfected water.

**Why optimal chlorine matters:**
✅ Effective disinfection (kills bacteria & viruses)
✅ Safe for consumption
✅ No excessive taste/odor
✅ Compliance with water quality norms

**Health impact:**
Optimal chlorination prevents waterborne diseases while maintaining acceptable taste and safety standards.

**Optimal range (0.2 - 0.5 mg/L):**
• Minimum 0.2 mg/L: Required for effective disinfection
• Maximum 0.5 mg/L: Prevents taste issues and over-chlorination

${count ? `**Found ${count} ESRs** ${scopeText} with optimal chlorine levels:` : '**ESRs with safe chlorine levels:**'}`,
      shouldEnhanceWithAI: false
    },

    'BelowChlorineWidget': {
      text: `🚨 **Water Safety Alert - Low Chlorine Levels ${scopeText}**

ESRs with chlorine below 0.2 mg/L may not provide adequate disinfection.

**What low chlorine means:**
❌ Insufficient disinfection
⚠️ Potential contamination risk
🦠 Increased waterborne disease risk
🔴 Urgent water quality issue

**Health risks:**
Low chlorine levels may allow bacteria, viruses, and pathogens to survive, posing serious health risks to consumers.

**Immediate actions required:**
1. **Urgent:** Increase chlorination dosage
2. Test water quality immediately
3. Check chlorinator equipment
4. Verify chlorine stock availability
5. Issue advisory if needed
6. Create helpdesk ticket for tracking

${count ? `**Found ${count} ESRs** ${scopeText} with chlorine < 0.2 mg/L:` : '**ESRs requiring urgent attention:**'}`,
      shouldEnhanceWithAI: false
    },

    'AboveChlorineWidget': {
      text: `⚠️ **Over-Chlorination Alert - High Chlorine Levels ${scopeText}**

ESRs with chlorine above 0.5 mg/L indicate excessive chlorination.

**What high chlorine means:**
⚠️ Excessive chemical treatment
👃 Strong chlorine smell/taste
😖 Consumer complaints likely
🔧 Dosing system needs adjustment

**Impact on consumers:**
• Unpleasant taste and odor
• Potential health concerns at very high levels
• Reduced water acceptability
• Increased user complaints

**Corrective actions:**
1. Reduce chlorine dosage immediately
2. Check chlorinator calibration
3. Verify dosing pumps functioning correctly
4. Test water at multiple points
5. Monitor until levels normalize

${count ? `**Found ${count} ESRs** ${scopeText} with chlorine > 0.5 mg/L:` : '**ESRs needing dosage adjustment:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentOptimalChlorineWidget': {
      text: `✅ **Excellent Water Quality - Consistently Optimal Chlorine ${scopeText}**

These ESRs have maintained chlorine levels between 0.2-0.5 mg/L for 7 consecutive days.

**What this excellence means:**
🌟 Reliable water quality management
✅ Consistent disinfection
💯 Zero waterborne disease risk
📊 Well-maintained chlorination system

**Best practices observed:**
• Regular chlorinator maintenance
• Proper dosing calibration
• Adequate chlorine stock management
• Effective monitoring protocols

${count ? `**Found ${count} ESRs** ${scopeText} with consistent optimal chlorine:` : '**ESRs with excellent chlorine management:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentBelowChlorineWidget': {
      text: `🚨 **Critical Water Safety Issue - Persistently Low Chlorine ${scopeText}**

These ESRs have remained below 0.2 mg/L chlorine for 7 consecutive days.

**Extreme concern:**
🔴 Prolonged unsafe water quality
❌ Serious health hazard
⚠️ Waterborne disease outbreak risk
🚨 Emergency intervention required

**Immediate actions:**
1. **URGENT:** Field team deployment
2. Immediate chlorine dosing
3. Water quality testing
4. Check chlorinator functionality
5. Verify chlorine supply chain
6. Issue public health advisory
7. Create priority helpdesk ticket

${count ? `**Found ${count} ESRs** ${scopeText} with persistent low chlorine:` : '**ESRs requiring emergency intervention:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentAboveChlorineWidget': {
      text: `⚠️ **Persistent Over-Chlorination ${scopeText}**

These ESRs have remained above 0.5 mg/L chlorine for 7 consecutive days.

**Sustained issue:**
⚠️ Ongoing excessive chlorination
📉 Likely consumer complaints
🔧 System calibration needed
👥 User dissatisfaction

**Corrective actions needed:**
1. Recalibrate chlorination system
2. Service dosing equipment
3. Adjust chemical feed rate
4. Monitor daily until stabilized
5. Document issue for maintenance records

${count ? `**Found ${count} ESRs** ${scopeText} with persistent high chlorine:` : '**ESRs needing system recalibration:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageOptimalChlorineWidget': {
      text: `📊 **Good Average Water Quality - Optimal Chlorine (7-Day Avg) ${scopeText}**

These ESRs average between 0.2-0.5 mg/L chlorine over the past week.

**Performance summary:**
📈 Overall good water quality
📊 Safe disinfection on average
✅ Generally well-managed

${count ? `**Found ${count} ESRs** ${scopeText} with average optimal chlorine:` : '**ESRs with good average chlorine levels:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageBelowChlorineWidget': {
      text: `⚠️ **Safety Concern - Average Chlorine Below 0.2 mg/L ${scopeText}**

These ESRs average below safe chlorine levels over the past 7 days.

**Risk assessment:**
⚠️ Sustained under-chlorination
🦠 Elevated health risk
🔍 System review needed

${count ? `**Found ${count} ESRs** ${scopeText} with average low chlorine:` : '**ESRs with concerning chlorine trends:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageAboveChlorineWidget': {
      text: `⚠️ **Over-Dosing Pattern - Average Chlorine Above 0.5 mg/L ${scopeText}**

These ESRs average above optimal chlorine levels over the past week.

**Trend analysis:**
📈 Consistent over-chlorination
👃 Likely taste/odor complaints
🔧 Dosing system needs attention

${count ? `**Found ${count} ESRs** ${scopeText} with average high chlorine:` : '**ESRs with over-chlorination trend:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== PRESSURE WIDGETS ====================
    'OptimalPressureWidget': {
      text: `💪 **Good Water Pressure - Optimal Range ${scopeText}**

ESRs with pressure between 0.2-0.7 bar ensure effective water distribution.

**Why optimal pressure matters:**
✅ Water reaches all floors
✅ Consistent flow rate
✅ Minimal infrastructure stress
✅ Good user experience

**Optimal range (0.2 - 0.7 bar):**
• **Minimum 0.2 bar:** Required for ground floor supply
• **Optimal 0.4-0.5 bar:** Best for multi-story distribution
• **Maximum 0.7 bar:** Prevents pipe stress

**Impact on service:**
Optimal pressure ensures reliable water delivery without damaging infrastructure.

${count ? `**Found ${count} ESRs** ${scopeText} with optimal pressure:` : '**ESRs with good pressure levels:**'}`,
      shouldEnhanceWithAI: false
    },

    'BelowPressureWidget': {
      text: `⚠️ **Low Pressure Alert - Below 0.2 bar ${scopeText}**

ESRs with pressure below 0.2 bar indicate potential supply issues.

**What causes low pressure:**
• Pipeline leaks or blockages
• Pump malfunction or insufficient capacity
• High demand during peak hours
• Valve issues in distribution network

**Impact on users:**
❌ Water doesn't reach upper floors
❌ Irregular supply timing
❌ Increased user complaints
❌ Potential dry taps

**Recommended actions:**
1. Inspect pumps and valves
2. Check for pipeline leaks
3. Review demand patterns
4. Verify pump capacity vs. demand
5. Consider creating helpdesk ticket if persistent

${count ? `**Found ${count} ESRs** ${scopeText} with pressure < 0.2 bar:` : '**ESRs with low pressure issues:**'}`,
      shouldEnhanceWithAI: false
    },

    'AbovePressureWidget': {
      text: `⚠️ **High Pressure Warning - Above 0.7 bar ${scopeText}**

ESRs with pressure above 0.7 bar may stress distribution infrastructure.

**Risks of high pressure:**
⚠️ Pipe stress and potential bursts
💧 Increased leak potential
🔧 Valve and fitting damage
💰 Higher water loss

**Common causes:**
• Pump over-performance
• Pressure regulator malfunction
• Incorrect system configuration
• Elevation differences not compensated

**Corrective actions:**
1. Adjust pump settings
2. Install/service pressure regulators
3. Check pressure relief valves
4. Monitor for new leaks
5. Consider pressure zones if needed

${count ? `**Found ${count} ESRs** ${scopeText} with pressure > 0.7 bar:` : '**ESRs with high pressure:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentOptimalPressureWidget': {
      text: `✅ **Excellent Pressure Management - Consistently Optimal ${scopeText}**

These ESRs have maintained pressure between 0.2-0.7 bar for 7 consecutive days.

**Excellence indicators:**
🌟 Reliable pressure regulation
✅ Consistent service delivery
💯 Well-maintained pumping system
📊 Stable infrastructure performance

${count ? `**Found ${count} ESRs** ${scopeText} with consistent optimal pressure:` : '**ESRs with excellent pressure stability:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentBelowPressureWidget': {
      text: `🚨 **Persistent Low Pressure - 7-Day Issue ${scopeText}**

These ESRs have remained below 0.2 bar for 7 consecutive days.

**Critical situation:**
🔴 Chronic supply issues
❌ Sustained user impact
⚠️ Infrastructure failure likely
🚨 Urgent intervention needed

**Immediate actions:**
1. **URGENT:** Field team inspection
2. Pump system overhaul
3. Pipeline pressure testing
4. Distribution network audit
5. Create priority helpdesk ticket

${count ? `**Found ${count} ESRs** ${scopeText} with persistent low pressure:` : '**ESRs requiring urgent attention:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentAbovePressureWidget': {
      text: `⚠️ **Sustained High Pressure - 7-Day Pattern ${scopeText}**

These ESRs have remained above 0.7 bar for 7 consecutive days.

**Infrastructure risk:**
⚠️ Prolonged pipe stress
💧 Increased leak risk
🔧 Accelerated wear and tear
💰 Potential water loss

**Corrective actions needed:**
1. Pressure regulation system upgrade
2. Pump performance adjustment
3. Install pressure reducing valves
4. Monitor for leaks and bursts

${count ? `**Found ${count} ESRs** ${scopeText} with persistent high pressure:` : '**ESRs needing pressure reduction:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageOptimalPressureWidget': {
      text: `📊 **Good Average Pressure - Optimal Range (7-Day Avg) ${scopeText}**

These ESRs average between 0.2-0.7 bar pressure over the past week.

**Performance summary:**
📈 Overall good pressure management
📊 Effective distribution
✅ Generally stable system

${count ? `**Found ${count} ESRs** ${scopeText} with average optimal pressure:` : '**ESRs with good average pressure:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageBelowPressureWidget': {
      text: `⚠️ **Pressure Deficiency - Average Below 0.2 bar ${scopeText}**

These ESRs average below adequate pressure levels over the past 7 days.

**Performance issue:**
📉 Sustained low pressure trend
⚠️ User experience impacted
🔍 System capacity review needed

${count ? `**Found ${count} ESRs** ${scopeText} with average low pressure:` : '**ESRs with low pressure trend:**'}`,
      shouldEnhanceWithAI: false
    },

    'AverageAbovePressureWidget': {
      text: `⚠️ **Elevated Pressure Pattern - Average Above 0.7 bar ${scopeText}**

These ESRs average above optimal pressure over the past week.

**Trend concern:**
📈 Consistent over-pressure
💧 Infrastructure stress
🔧 Regulation system needed

${count ? `**Found ${count} ESRs** ${scopeText} with average high pressure:` : '**ESRs with high pressure trend:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== WATER STATUS WIDGETS ====================
    'VillagesWithWaterWidget': {
      text: `💧 **Active Water Supply - Villages with Water ${scopeText}**

These villages currently have active water flow in their distribution systems.

**Current status indicators:**
✅ Real-time water flow detected
✅ ESRs operational
✅ Supply distribution active
✅ Consumers receiving water

**Monitoring benefits:**
This real-time data helps ensure continuous service and quick detection of any supply interruptions.

${count ? `**Found ${count} villages** ${scopeText} with active water supply:` : '**Villages with active water flow:**'}`,
      shouldEnhanceWithAI: false
    },

    'VillagesNoWaterWidget': {
      text: `⚠️ **Supply Interruption - Villages Without Water ${scopeText}**

These villages currently show no water flow in their distribution systems.

**Potential causes:**
• Scheduled maintenance
• Pump/power outages
• Pipeline breaks or blockages
• ESR empty or filling
• Sensor/measurement issues

**Recommended actions:**
1. Verify if scheduled maintenance
2. Check pump and power status
3. Inspect ESR levels
4. Look for pipeline issues
5. Create helpdesk ticket if unplanned

${count ? `**Found ${count} villages** ${scopeText} without water:` : '**Villages with supply interruptions:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentWaterWidget': {
      text: `✅ **Reliable Service - Consistent Water Supply ${scopeText}**

These villages have maintained active water flow for 7 consecutive days.

**Excellence indicators:**
🌟 Reliable, uninterrupted service
✅ Well-maintained infrastructure
💯 No supply gaps
📊 Predictable operations

**Why this matters:**
Consistent water availability indicates excellent infrastructure maintenance and operational reliability.

${count ? `**Found ${count} villages** ${scopeText} with consistent water:` : '**Villages with excellent service reliability:**'}`,
      shouldEnhanceWithAI: false
    },

    'ConsistentZeroWidget': {
      text: `🚨 **Critical Service Failure - 7 Days Without Water ${scopeText}**

These villages have had no water flow for 7 consecutive days.

**Emergency situation:**
🔴 Complete service failure
❌ Severe user impact
⚠️ Potential health crisis
🚨 Immediate intervention required

**Immediate actions:**
1. **EMERGENCY:** Field team deployment
2. Identify root cause
3. Arrange temporary water supply
4. Execute emergency repairs
5. Create critical priority ticket
6. Inform community and authorities

${count ? `**Found ${count} villages** ${scopeText} with prolonged outage:` : '**Villages in emergency status:**'}`,
      shouldEnhanceWithAI: false
    },

    'CombinedWaterStatusWidget': {
      text: `📊 **Comprehensive Water Status Overview ${scopeText}**

Showing both villages with active water supply AND those without water for complete visibility.

**Dual-view benefits:**
✅ Complete operational picture
📊 Quick status comparison
🔍 Identify service gaps
📈 Overall performance assessment

${count ? `**Analyzing ${count} total villages** ${scopeText}:` : '**Complete water status analysis:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== ESR & CONSUMPTION WIDGETS ====================
    'ESRWaterConsumptionWidget': {
      text: `📊 **ESR Water Consumption Analysis ${scopeText}**

Viewing water consumption levels at individual ESR (Elevated Storage Reservoir) points.

**Why ESR-level data matters:**
• Identifies specific consumption points
• Helps detect localized issues
• Enables targeted interventions
• Tracks infrastructure efficiency

${count ? `**Found ${count} ESRs** ${scopeText}:` : '**ESR consumption data:**'}`,
      shouldEnhanceWithAI: false
    },

    'AbruptWaterConsumptionWidget': {
      text: `🚨 **Abnormal Consumption Alert - Above 400% Capacity ${scopeText}**

These ESRs are consuming more than 400% of their designed capacity - indicating serious issues.

**What abrupt consumption means:**
🔴 Major infrastructure problem
💧 Possible pipeline burst or massive leak
⚠️ Pump malfunction or valve failure
📊 Sensor error (less likely if persistent)

**Critical indicators:**
• Water consumption exceeding 4x normal capacity
• Rapid depletion of ESR storage
• Potential water loss in distribution
• Emergency investigation required

**Immediate actions:**
1. **URGENT:** Field inspection
2. Check for major leaks/bursts
3. Verify valve positions
4. Test sensor accuracy
5. Isolate problem sections if needed
6. Create critical helpdesk ticket

${count ? `**Found ${count} ESRs** ${scopeText} with abrupt consumption:` : '**ESRs requiring emergency attention:**'}`,
      shouldEnhanceWithAI: false
    },

    'ReliableWaterConsumptionWidget': {
      text: `✅ **Healthy Consumption Pattern - Reliable Performance ${scopeText}**

These ESRs/villages show consumption ≤200% of capacity AND LPCD >100, indicating reliable but high-performing systems.

**What this means:**
✅ Normal operational range
📊 High but sustainable consumption
💧 Good water availability
🔍 Healthy infrastructure performance

**Why we monitor this:**
These locations have good LPCD (>100) but need monitoring to ensure consumption stays within sustainable limits.

${count ? `**Found ${count} locations** ${scopeText} with reliable consumption:` : '**Locations with healthy consumption patterns:**'}`,
      shouldEnhanceWithAI: false
    },

    'ESRCapacityWidget': {
      text: `🏗️ **ESR Storage Capacity Overview ${scopeText}**

Total elevated storage reservoir capacity available for water distribution.

**Why capacity matters:**
• Determines storage buffer
• Indicates supply resilience
• Shows infrastructure investment
• Helps plan expansions

**Capacity measurement:**
Measured in Lakh Liters (LL) - 1 LL = 100,000 liters

${count ? `**Total capacity across ${count} ESRs** ${scopeText}:` : '**ESR capacity summary:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== COMBINED WIDGETS ====================
    'CombinedLpcdStatusWidget': {
      text: `📊 **Complete LPCD Analysis ${scopeText}**

Comprehensive view showing villages above AND below 55 LPCD benchmark.

**Dual-perspective benefits:**
✅ Complete performance picture
📊 Quick comparison of adequate vs. insufficient supply
🔍 Identify intervention priorities
📈 Overall regional assessment

${count ? `**Analyzing ${count} total villages** ${scopeText}:` : '**Complete LPCD status:**'}`,
      shouldEnhanceWithAI: false
    },

    'CombineChlorineStatusWidget': {
      text: `🧪 **Complete Chlorine Analysis ${scopeText}**

Comprehensive view of chlorine levels across all ranges (below, optimal, above).

**Complete water quality picture:**
✅ Safe optimal levels
⚠️ Under-chlorinated ESRs
⚠️ Over-chlorinated ESRs

${count ? `**Analyzing ${count} total ESRs** ${scopeText}:` : '**Complete chlorine status:**'}`,
      shouldEnhanceWithAI: false
    },

    'CombinePressureStatusWidget': {
      text: `💪 **Complete Pressure Analysis ${scopeText}**

Comprehensive view of pressure levels across all ranges (below, optimal, above).

**Complete pressure picture:**
✅ Optimal pressure ESRs
⚠️ Low pressure issues
⚠️ High pressure concerns

${count ? `**Analyzing ${count} total ESRs** ${scopeText}:` : '**Complete pressure status:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== CHART WIDGETS ====================
    'WaterConsumptionChartWidget': {
      text: `📈 **7-Day Water Consumption Trend ${scopeText}**

Viewing water consumption patterns over the past week to identify trends and anomalies.

**Trend analysis helps identify:**
• Daily consumption patterns
• Peak usage times
• Supply consistency
• Abnormal spikes or drops

${count ? `**Displaying 7-day chart** ${scopeText}:` : '**7-day consumption analysis:**'}`,
      shouldEnhanceWithAI: false
    },

    'LPCDChartWidget': {
      text: `📈 **7-Day LPCD Trend Analysis ${scopeText}**

Tracking LPCD variations over the past week to understand supply patterns.

**What this chart reveals:**
• Daily LPCD fluctuations
• Consistency of supply
• Peak and low periods
• Trend direction (improving/declining)

${count ? `**7-day LPCD trend** ${scopeText}:` : '**LPCD trend analysis:**'}`,
      shouldEnhanceWithAI: false
    },

    'ChlorineAnalysisChartWidget': {
      text: `📈 **7-Day Chlorine Trend ${scopeText}**

Monitoring chlorine level variations over the past week for water quality assurance.

**Water quality trends show:**
• Chlorination consistency
• Safety compliance over time
• System stability
• Need for dosing adjustments

${count ? `**7-day chlorine trend** ${scopeText}:` : '**Chlorine trend analysis:**'}`,
      shouldEnhanceWithAI: false
    },

    'PressureAnalysisChartWidget': {
      text: `📈 **7-Day Pressure Trend ${scopeText}**

Tracking pressure variations over the past week to assess distribution stability.

**Pressure trends indicate:**
• System stability
• Pump performance consistency
• Distribution reliability
• Infrastructure health

${count ? `**7-day pressure trend** ${scopeText}:` : '**Pressure trend analysis:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== SCHEME WIDGETS ====================
    'FullyCompletedSchemesWidget': {
      text: `✅ **Fully Operational Schemes ${scopeText}**

Water supply schemes that are 100% complete and operational.

**What fully completed means:**
✅ All infrastructure in place
✅ All villages covered
✅ Operational and delivering water
📊 Meeting project objectives

${count ? `**Found ${count} fully completed schemes** ${scopeText}:` : '**Fully operational schemes:**'}`,
      shouldEnhanceWithAI: false
    },

    'PartialSchemesWidget': {
      text: `🔄 **Partially Completed Schemes ${scopeText}**

Water supply schemes currently under implementation or partial operation.

**Partial completion indicates:**
🔄 Work in progress
📊 Some villages already covered
⏳ Remaining components pending
🎯 Towards full operational status

${count ? `**Found ${count} partially completed schemes** ${scopeText}:` : '**Schemes under implementation:**'}`,
      shouldEnhanceWithAI: false
    },

    // ==================== DEFAULT ====================
    'default': {
      text: `📊 **Data Analysis ${scopeText}**

${count ? `**Found ${count} results** ${scopeText}:` : '**Here are the results:**'}`,
      shouldEnhanceWithAI: true
    }
  };

  return templates[widgetType] || templates['default'];
}

/**
 * Enhance context message with AI for complex or personalized queries
 * This adds a dynamic layer on top of pre-written templates
 */
export async function enhanceMessageWithAI(
  baseMessage: string,
  userQuery: string,
  widgetType: string,
  language: 'en' | 'hi' | 'mr' = 'en'
): Promise<string> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `User asked: "${userQuery}"

Base context message:
${baseMessage}

Enhance this message to be more personalized and conversational while keeping all the key information. Make it feel like a helpful ChatGPT response. Keep it concise but informative.`,
        maxTokens: 300,
        temperature: 0.7,
        language: language,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || baseMessage;
    }
    
    return baseMessage;
  } catch (error) {
    console.warn('AI enhancement failed, using base message:', error);
    return baseMessage;
  }
}

/**
 * Simple translation function for widget messages based on language
 */
function getTranslatedScopeText(scopeText: string, language: 'en' | 'hi' | 'mr'): string {
  if (language === 'en') return scopeText;
  
  const scopeTranslations: Record<string, Record<'hi' | 'mr', string>> = {
    'across all regions': {
      hi: 'सभी क्षेत्रों में',
      mr: 'सर्व प्रदेशांमध्ये'
    },
    'in ': {
      hi: '',
      mr: ''
    },
    ' region': {
      hi: ' क्षेत्र में',
      mr: ' प्रदेशात'
    },
    ' village': {
      hi: ' गांव में',
      mr: ' गावात'
    },
    'for scheme ': {
      hi: 'योजना के लिए ',
      mr: 'योजनेसाठी '
    }
  };
  
  let translated = scopeText;
  if (scopeText === 'across all regions') {
    return scopeTranslations['across all regions'][language];
  }
  
  if (scopeText.startsWith('in ') && scopeText.endsWith(' region')) {
    const regionName = scopeText.replace('in ', '').replace(' region', '');
    return language === 'hi' 
      ? `${regionName} क्षेत्र में`
      : `${regionName} प्रदेशात`;
  }
  
  if (scopeText.startsWith('in ') && scopeText.endsWith(' village')) {
    const villageName = scopeText.replace('in ', '').replace(' village', '');
    return language === 'hi'
      ? `${villageName} गांव में`
      : `${villageName} गावात`;
  }
  
  if (scopeText.startsWith('for scheme ')) {
    const schemeName = scopeText.replace('for scheme ', '');
    return language === 'hi'
      ? `${schemeName} योजना के लिए`
      : `${schemeName} योजनेसाठी`;
  }
  
  return translated;
}

/**
 * Get short widget header translations
 */
function getWidgetHeaderTranslations(widgetType: string, language: 'en' | 'hi' | 'mr'): Record<string, string> {
  const headers: Record<string, Record<'en' | 'hi' | 'mr', string>> = {
    'Above55LpcdWidget': {
      en: 'Villages with LPCD > 55',
      hi: '55 LPCD से ऊपर वाले गांव',
      mr: '55 LPCD च्या वर असलेली गावे'
    },
    'Below55LpcdWidget': {
      en: 'Villages with LPCD < 55',
      hi: '55 LPCD से नीचे वाले गांव',
      mr: '55 LPCD च्या खाली असलेली गावे'
    },
    'ConsistentAbove55LpcdWidget': {
      en: 'Villages consistently above 55 LPCD',
      hi: 'लगातार 55 LPCD से ऊपर वाले गांव',
      mr: 'सातत्याने 55 LPCD च्या वर असलेली गावे'
    },
    'ConsistentBelow55LpcdWidget': {
      en: 'Villages consistently below 55 LPCD',
      hi: 'लगातार 55 LPCD से नीचे वाले गांव',
      mr: 'सातत्याने 55 LPCD च्या खाली असलेली गावे'
    },
    'AverageAbove55LpcdWidget': {
      en: 'Villages with average LPCD > 55',
      hi: 'औसत 55 LPCD से ऊपर वाले गांव',
      mr: 'सरासरी 55 LPCD च्या वर असलेली गावे'
    },
    'AverageBelow55LpcdWidget': {
      en: 'Villages with average LPCD < 55',
      hi: 'औसत 55 LPCD से नीचे वाले गांव',
      mr: 'सरासरी 55 LPCD च्या खाली असलेली गावे'
    },
    'VillagesWithWaterWidget': {
      en: 'Villages with Water Supply',
      hi: 'पानी उपलब्ध गांव',
      mr: 'पाणी पुरवठा असलेली गावे'
    },
    'VillagesNoWaterWidget': {
      en: 'Villages without Water Supply',
      hi: 'बिना पानी के गांव',
      mr: 'पाणी पुरवठा नसलेली गावे'
    },
    'ConsistentWaterWidget': {
      en: 'Villages with consistent water supply',
      hi: 'नियमित पानी आपूर्ति वाले गांव',
      mr: 'नियमित पाणी पुरवठा असलेली गावे'
    },
    'ConsistentZeroWidget': {
      en: 'Villages with no water for 7 days',
      hi: '7 दिनों से बिना पानी के गांव',
      mr: '7 दिवस पाणी नसलेली गावे'
    },
    'OptimalChlorineWidget': {
      en: 'ESRs with Optimal Chlorine (0.2-0.5 mg/L)',
      hi: 'इष्टतम क्लोरीन वाले ESR (0.2-0.5 mg/L)',
      mr: 'इष्टतम क्लोरीन असलेले ESR (0.2-0.5 mg/L)'
    },
    'BelowChlorineWidget': {
      en: 'ESRs with Low Chlorine (< 0.2 mg/L)',
      hi: 'कम क्लोरीन वाले ESR (< 0.2 mg/L)',
      mr: 'कमी क्लोरीन असलेले ESR (< 0.2 mg/L)'
    },
    'AboveChlorineWidget': {
      en: 'ESRs with High Chlorine (> 0.5 mg/L)',
      hi: 'अधिक क्लोरीन वाले ESR (> 0.5 mg/L)',
      mr: 'जास्त क्लोरीन असलेले ESR (> 0.5 mg/L)'
    },
    'ConsistentOptimalChlorineWidget': {
      en: 'ESRs with consistent optimal chlorine',
      hi: 'लगातार इष्टतम क्लोरीन वाले ESR',
      mr: 'सातत्याने इष्टतम क्लोरीन असलेले ESR'
    },
    'ConsistentBelowChlorineWidget': {
      en: 'ESRs with persistent low chlorine',
      hi: 'लगातार कम क्लोरीन वाले ESR',
      mr: 'सातत्याने कमी क्लोरीन असलेले ESR'
    },
    'ConsistentAboveChlorineWidget': {
      en: 'ESRs with persistent high chlorine',
      hi: 'लगातार अधिक क्लोरीन वाले ESR',
      mr: 'सातत्याने जास्त क्लोरीन असलेले ESR'
    },
    'OptimalPressureWidget': {
      en: 'ESRs with Optimal Pressure (0.2-0.7 bar)',
      hi: 'इष्टतम दबाव वाले ESR (0.2-0.7 bar)',
      mr: 'इष्टतम दाब असलेले ESR (0.2-0.7 bar)'
    },
    'BelowPressureWidget': {
      en: 'ESRs with Low Pressure (< 0.2 bar)',
      hi: 'कम दबाव वाले ESR (< 0.2 bar)',
      mr: 'कमी दाब असलेले ESR (< 0.2 bar)'
    },
    'AbovePressureWidget': {
      en: 'ESRs with High Pressure (> 0.7 bar)',
      hi: 'अधिक दबाव वाले ESR (> 0.7 bar)',
      mr: 'जास्त दाब असलेले ESR (> 0.7 bar)'
    },
    'ConsistentOptimalPressureWidget': {
      en: 'ESRs with consistent optimal pressure',
      hi: 'लगातार इष्टतम दबाव वाले ESR',
      mr: 'सातत्याने इष्टतम दाब असलेले ESR'
    },
    'ConsistentBelowPressureWidget': {
      en: 'ESRs with persistent low pressure',
      hi: 'लगातार कम दबाव वाले ESR',
      mr: 'सातत्याने कमी दाब असलेले ESR'
    },
    'ConsistentAbovePressureWidget': {
      en: 'ESRs with persistent high pressure',
      hi: 'लगातार अधिक दबाव वाले ESR',
      mr: 'सातत्याने जास्त दाब असलेले ESR'
    },
    'CombinedLpcdStatusWidget': {
      en: 'Combined LPCD Status',
      hi: 'समग्र LPCD स्थिति',
      mr: 'एकत्रित LPCD स्थिती'
    },
    'CombinedChlorineStatusWidget': {
      en: 'Combined Chlorine Status',
      hi: 'समग्र क्लोरीन स्थिति',
      mr: 'एकत्रित क्लोरीन स्थिती'
    },
    'CombinedPressureStatusWidget': {
      en: 'Combined Pressure Status',
      hi: 'समग्र दबाव स्थिति',
      mr: 'एकत्रित दाब स्थिती'
    },
    'CombinedWaterStatusWidget': {
      en: 'Combined Water Status',
      hi: 'समग्र पानी स्थिति',
      mr: 'एकत्रित पाणी स्थिती'
    },
    'ESRWaterConsumptionWidget': {
      en: 'ESR Water Consumption',
      hi: 'ESR जल खपत',
      mr: 'ESR पाणी वापर'
    },
    'AbruptWaterConsumptionWidget': {
      en: 'Abnormal Water Consumption',
      hi: 'असामान्य जल खपत',
      mr: 'असामान्य पाणी वापर'
    },
    'ReliableWaterConsumptionWidget': {
      en: 'Reliable Water Consumption',
      hi: 'विश्वसनीय जल खपत',
      mr: 'विश्वसनीय पाणी वापर'
    },
    'WaterConsumptionChartWidget': {
      en: 'Water Consumption Chart',
      hi: 'जल खपत चार्ट',
      mr: 'पाणी वापर आलेख'
    },
    'LPCDChartWidget': {
      en: 'LPCD Trend Chart',
      hi: 'LPCD रुझान चार्ट',
      mr: 'LPCD कल आलेख'
    },
    'ChlorineAnalysisChartWidget': {
      en: 'Chlorine Analysis Chart',
      hi: 'क्लोरीन विश्लेषण चार्ट',
      mr: 'क्लोरीन विश्लेषण आलेख'
    },
    'PressureAnalysisChartWidget': {
      en: 'Pressure Analysis Chart',
      hi: 'दबाव विश्लेषण चार्ट',
      mr: 'दाब विश्लेषण आलेख'
    },
    'FullyCompletedSchemesWidget': {
      en: 'Fully Completed Schemes',
      hi: 'पूर्ण रूप से पूर्ण योजनाएं',
      mr: 'पूर्णपणे पूर्ण झालेल्या योजना'
    },
    'PartialSchemesWidget': {
      en: 'Partial Schemes',
      hi: 'आंशिक योजनाएं',
      mr: 'अंशतः पूर्ण योजना'
    },
    'FullyCompletedVillagesWidget': {
      en: 'Fully Completed Villages',
      hi: 'पूर्ण रूप से पूर्ण गांव',
      mr: 'पूर्णपणे पूर्ण झालेली गावे'
    },
    'RegionStatisticsWidget': {
      en: 'Region Statistics',
      hi: 'क्षेत्र सांख्यिकी',
      mr: 'प्रदेश सांख्यिकी'
    },
    'AreaCoverageWidget': {
      en: 'Area Coverage',
      hi: 'क्षेत्र कवरेज',
      mr: 'क्षेत्र व्याप्ती'
    },
    'MapWidget': {
      en: 'Map View',
      hi: 'नक्शा दृश्य',
      mr: 'नकाशा दृश्य'
    }
  };
  
  return { title: headers[widgetType]?.[language] || headers[widgetType]?.['en'] || widgetType };
}

/**
 * Main function to get widget context message with optional AI enhancement
 */
export async function getEnhancedWidgetMessage(params: WidgetContextParams): Promise<string> {
  const contextMessage = getWidgetContextMessage(params);
  const language = params.language || 'en';
  
  // For non-English languages, generate a translated response
  if (language !== 'en') {
    const translatedRegion = params.region && params.region !== 'all' 
      ? translateRegionName(params.region, language) 
      : '';
    
    const scopeText = getTranslatedScopeText(
      params.village && params.village !== 'all' 
        ? `in ${params.village} village`
        : params.scheme && params.scheme !== 'all'
          ? `for scheme ${params.scheme}`
          : params.region && params.region !== 'all'
            ? `in ${translatedRegion} region`
            : 'across all regions',
      language
    );
    
    const headers = getWidgetHeaderTranslations(params.widgetType, language);
    const count = params.count || 0;
    
    // Generate translated response with translated region name
    const countText = language === 'hi' 
      ? `${count} परिणाम मिले`
      : `${count} परिणाम सापडले`;
    
    const foundText = `📊 **${headers.title} ${scopeText}:**\n\n${countText}`;
    
    // If user wants a more detailed message, use AI to enhance
    if (params.userQuery && contextMessage.shouldEnhanceWithAI) {
      try {
        const aiMessage = await generateAILocalizedMessage(params, language);
        if (aiMessage) {
          return aiMessage;
        }
      } catch (error) {
        console.error('AI message generation failed, using template:', error);
      }
    }
    
    return foundText;
  }
  
  // For complex queries or when AI enhancement is beneficial, enhance the message
  if (contextMessage.shouldEnhanceWithAI && params.userQuery) {
    return await enhanceMessageWithAI(
      contextMessage.text,
      params.userQuery,
      params.widgetType,
      params.language
    );
  }
  
  return contextMessage.text;
}

/**
 * Generate a fully localized message using OpenAI
 */
async function generateAILocalizedMessage(params: WidgetContextParams, language: 'hi' | 'mr'): Promise<string | null> {
  const { widgetType, region, scheme, village, count, userQuery } = params;
  
  const translatedRegion = region && region !== 'all' ? translateRegionName(region, language) : '';
  const languageName = language === 'hi' ? 'Hindi' : 'Marathi';
  
  const scopeDescription = village && village !== 'all' 
    ? `for ${village} village`
    : scheme && scheme !== 'all'
      ? `for scheme ${scheme}`
      : region && region !== 'all'
        ? `for ${translatedRegion} region`
        : 'across all regions';
  
  const prompt = `Generate a brief, informative response in ${languageName} for a Maharashtra water infrastructure dashboard.

Widget: ${widgetType}
Scope: ${scopeDescription}
Count: ${count || 0} results found
User Query: "${userQuery || 'data request'}"

Requirements:
- Write 2-3 sentences in natural ${languageName}
- Keep technical terms like LPCD, ESR, mg/L, bar in English
- Include appropriate emojis (📊, 💧, ✅, ⚠️, etc.)
- Be informative and helpful
- Mention the count of results
- Use the translated region name: ${translatedRegion || 'all regions'}`;

  try {
    const response = await getOpenAICompletion({
      prompt,
      maxTokens: 300,
      temperature: 0.5,
      language,
    });
    
    if (!response.isError && response.text) {
      return response.text.trim();
    }
    return null;
  } catch (error) {
    console.error('AI localized message error:', error);
    return null;
  }
}
