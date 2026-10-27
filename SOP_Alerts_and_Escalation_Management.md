# STANDARD OPERATING PROCEDURE (SOP)
## Water Supply Telemetry Alerts & Issue Escalation
**Document Reference:** SOP-ALERT-2026-V2.4  
**System:** IoT Water Infrastructure Telemetry Monitoring  
**Effective Date:** October 2026  

---

<!-- PAGE 1 -->
# SECTION 1: DEFINITIONS AND RESPONSIBILITIES

### 1. Village Operator
* **Definition:** The operator is responsible for water supply distribution for a particular **Elevated Storage Reservoir (ESR)** and **Village**.
* **Responsibility:** Controls local valves, pump running hours, and daily water release to the village.
* **Alert Received:** Receives SMS after 24 hours of the value.

### 2. Executive Engineer (EE)
* **Definition:** The Executive Engineer is in charge and responsible for a **complete Division or District**.
* **Responsibility:** Manages all water schemes, sub-divisions, engineers, and operators across the entire district.
* **Escalation:** **Issues which exceed 24 hours are escalated directly to the Executive Engineer.**
* **Alert Received:** Receives both **SMS and Email** alerts listing all schemes and villages where issues are unresolved for more than 24 hours.
* **Action Required:** Review the problem with field staff and submit a mandatory report on the **Issue Reports** page.

---

# SECTION 2: ALERT TYPES AND TRIGGER CONDITIONS

The system checks daily sensor data every morning at **11:00 AM IST**. If values are outside standard limits, an alert is created:

| Alert Parameter | Normal Standard | Trigger Condition (When Alert is Created) |
| :--- | :--- | :--- |
| **Low LPCD in Villages** | 55 LPCD or higher | Daily water supply drops below **55 LPCD** |
| **Low Pressure in ESR** | 0.20 to 1.20 bar (2m to 12m head) | Water pressure drops below **0.20 bar** at ESR |
| **Residual Chlorine Out of Range** | 0.20 to 0.50 mg/L (PPM) | Chlorine is less than **0.20 mg/L** (low) or above **0.50 mg/L** (high) |

---

# SECTION 3: ALERT NOTIFICATION TIMELINE

```
NEXT DAY (After 24 Hours of the Value)
Alert is evaluated at 11:00 AM
└──> SMS sent to Village Operator (responsible for that ESR & Village)

IF UNRESOLVED AFTER 24 HOURS (Next Day onwards)
└──> Issue is ESCALATED to Executive Engineer (EE)
     └── SMS sent to Executive Engineer mobile number
     └── Email sent to Executive Engineer email address
     └── EE must submit an issue report on the Issue Reports page
```

---

# SECTION 4: METHOD AND CHANNELS USED

* **Automatic Daily Schedule:** Telemetry data is evaluated automatically every day at **11:00 AM IST**.
* **SMS Method:** Sent through verified SMS gateway directly to mobile numbers stored in database.
* **Email Method:** Automated email sent to contact email addresses stored in database with scheme and village details.

---
<!-- PAGE 2 -->

# SECTION 5: WHO RECEIVES SMS AND EMAIL (SUMMARY TABLE)

| Recipient | In How Many Days | Channel | Details Sent |
| :--- | :--- | :---: | :--- |
| **Village Operator** | **Next Day** (After 24 hours of the value) | **SMS** | Scheme name, village name, ESR name, observed value, and water supply details. |
| **Executive Engineer (EE)** | **Next Day onwards** (When issue exceeds 24 hours) | **SMS + Email** | List of schemes and villages in the division with issues older than 24 hours, operator contacts, and reminder to submit issue report. |

---

# SECTION 6: MANDATORY ACTION FOR EXECUTIVE ENGINEER ON ISSUE REPORTS PAGE

When an issue exceeds 24 hours, the Executive Engineer must submit an issue report. Field remarks are not added directly to the dashboard table; they must be submitted on the dedicated **Issue Reports** page.

### How to submit the report:
1. Go to the **Issue Reporting** page in the dashboard navigation (`/helpdesk/issue-reporting`).
2. Select the **Scheme ID**, **Village**, and **ESR** that has the pending issue.
3. Select the **Root Cause** of the issue:
   * *Pipeline burst or distribution leakage*
   * *Pump breakdown or motor fault*
   * *Power failure (MSEDCL electricity outage)*
   * *Valve malfunction or chamber blockage*
   * *Bleaching powder or chlorine stock shortage*
   * *Sensor calibration or device maintenance*
4. Enter the **Action Taken** (e.g. repair team dispatched, spare parts ordered, emergency tanker arranged).
5. Enter the **Expected Resolution Date** when normal supply will be restored.
6. Click **Submit Issue Report**. The report is saved to the central database record.

---

# SECTION 7: HOW ISSUES ARE RESOLVED AND CLOSED

* **Automatic Telemetry Resolution:** Issues cannot be manually marked as resolved by clicking a button. The system only marks an issue as **Resolved** when fresh sensor data meets normal standards at 11:00 AM IST:
  1. LPCD is 55 or higher
  2. Pressure is between 0.20 and 1.20 bar
  3. Chlorine is between 0.20 and 0.50 mg/L
* **Automatic Escalation Stop:** Once the system verifies normal data, it moves the item to the resolved list and stops sending further SMS and email escalations to the Executive Engineer.
