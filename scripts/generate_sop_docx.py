import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def create_sop_docx(output_path):
    doc = docx.Document()

    # Set 0.5 inch margins for 2-page fit
    for section in doc.sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
        section.page_width = Inches(8.27)  # A4 width
        section.page_height = Inches(11.69) # A4 height

    NAVY = RGBColor(11, 53, 88)     # #0B3558
    DARK = RGBColor(30, 41, 59)     # #1E293B
    GRAY = RGBColor(100, 116, 139)  # #64748B
    RED = RGBColor(185, 28, 28)     # #B91C1C
    BLUE = RGBColor(30, 64, 175)    # #1E40AF

    def set_cell_background(cell, fill_hex):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_table_borders(table, color="CBD5E1"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    def add_header_banner(page_num):
        t = doc.add_table(rows=1, cols=2)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        t.autofit = False
        t.columns[0].width = Inches(5.1)
        t.columns[1].width = Inches(1.97)

        c1, c2 = t.rows[0].cells
        set_cell_margins(c1, top=0, bottom=60, left=0, right=0)
        set_cell_margins(c2, top=0, bottom=60, left=0, right=0)

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(1)
        r1 = p1.add_run("STANDARD OPERATING PROCEDURE")
        r1.font.name = "Segoe UI"
        r1.font.size = Pt(15)
        r1.font.bold = True
        r1.font.color.rgb = NAVY

        p1_sub = c1.add_paragraph()
        p1_sub.paragraph_format.space_before = Pt(0)
        p1_sub.paragraph_format.space_after = Pt(4)
        r1_sub = p1_sub.add_run("Water Supply Telemetry Alerts & Issue Escalation")
        r1_sub.font.name = "Segoe UI"
        r1_sub.font.size = Pt(9.5)
        r1_sub.font.color.rgb = GRAY
        r1_sub.font.bold = True

        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(4)
        r2 = p2.add_run(f"Document: SOP-ALERT-2026\nSystem: IoT Water Monitoring\nEffective: October 2026\nPage: {page_num} of 2")
        r2.font.name = "Segoe UI"
        r2.font.size = Pt(8)
        r2.font.color.rgb = GRAY

        # Divider line
        p_div = doc.add_paragraph()
        p_div.paragraph_format.space_before = Pt(2)
        p_div.paragraph_format.space_after = Pt(6)
        r_div = p_div.add_run("―" * 68)
        r_div.font.color.rgb = NAVY
        r_div.font.size = Pt(8)

    def add_section_heading(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.color.rgb = NAVY

    # ========================== PAGE 1 ==========================
    add_header_banner(1)

    add_section_heading("1. Definitions and Responsibilities")

    # Box 1: Village Operator
    b1 = doc.add_table(rows=1, cols=1)
    b1.alignment = WD_TABLE_ALIGNMENT.CENTER
    b1.autofit = False
    b1.columns[0].width = Inches(7.07)
    cell1 = b1.rows[0].cells[0]
    set_cell_background(cell1, "F8FAFC")
    set_cell_margins(cell1, top=80, bottom=80, left=120, right=120)
    # left border navy
    cell1._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="0B3558"/><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/></w:tcBorders>'))

    p = cell1.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Village Operator")
    r.font.name = "Segoe UI"
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = NAVY

    items_op = [
        ("Definition: ", "The operator is responsible for water supply distribution for a particular Elevated Storage Reservoir (ESR) and Village."),
        ("Responsibility: ", "Controls local valves, pump running hours, and daily water release to the village."),
        ("Alert Received: ", "Receives SMS after 24 hours of the value.")
    ]
    for lbl, desc in items_op:
        p_item = cell1.add_paragraph()
        p_item.paragraph_format.space_before = Pt(1)
        p_item.paragraph_format.space_after = Pt(2)
        r_bullet = p_item.add_run("• ")
        r_bullet.font.bold = True
        r_lbl = p_item.add_run(lbl)
        r_lbl.font.bold = True
        r_desc = p_item.add_run(desc)
        for r_x in [r_bullet, r_lbl, r_desc]:
            r_x.font.name = "Segoe UI"
            r_x.font.size = Pt(8.8)
            r_x.font.color.rgb = DARK

    # Spacing between boxes
    doc.add_paragraph().paragraph_format.space_after = Pt(1)

    # Box 2: Executive Engineer (EE)
    b2 = doc.add_table(rows=1, cols=1)
    b2.alignment = WD_TABLE_ALIGNMENT.CENTER
    b2.autofit = False
    b2.columns[0].width = Inches(7.07)
    cell2 = b2.rows[0].cells[0]
    set_cell_background(cell2, "FEF2F2")
    set_cell_margins(cell2, top=80, bottom=80, left=120, right=120)
    cell2._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="B91C1C"/><w:top w:val="single" w:sz="4" w:space="0" w:color="FECACA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="FECACA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="FECACA"/></w:tcBorders>'))

    p = cell2.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Executive Engineer (EE)")
    r.font.name = "Segoe UI"
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RED

    items_ee = [
        ("Definition: ", "The Executive Engineer is in charge and responsible for a complete Division or District."),
        ("Responsibility: ", "Manages all water schemes, sub-divisions, engineers, and operators across the entire district."),
        ("Escalation: ", "Issues which exceed 24 hours are escalated directly to the Executive Engineer."),
        ("Alert Received: ", "Receives both SMS and Email alerts listing all schemes and villages where issues are unresolved for more than 24 hours."),
        ("Action Required: ", "Review the problem with field staff and submit a mandatory report on the Issue Reports page.")
    ]
    for lbl, desc in items_ee:
        p_item = cell2.add_paragraph()
        p_item.paragraph_format.space_before = Pt(1)
        p_item.paragraph_format.space_after = Pt(2)
        r_bullet = p_item.add_run("• ")
        r_bullet.font.bold = True
        r_lbl = p_item.add_run(lbl)
        r_lbl.font.bold = True
        r_desc = p_item.add_run(desc)
        for r_x in [r_bullet, r_lbl, r_desc]:
            r_x.font.name = "Segoe UI"
            r_x.font.size = Pt(8.8)
            r_x.font.color.rgb = DARK

    # Section 2: Alert Types and Trigger Conditions
    add_section_heading("2. Alert Types and Trigger Conditions")
    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_before = Pt(0)
    p_desc.paragraph_format.space_after = Pt(3)
    r_desc = p_desc.add_run("The system checks daily sensor data every morning at 11:00 AM IST. If values are outside standard limits, an alert is created:")
    r_desc.font.name = "Segoe UI"
    r_desc.font.size = Pt(8.8)
    r_desc.font.color.rgb = DARK

    t_params = doc.add_table(rows=4, cols=3)
    t_params.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_params.autofit = False
    set_table_borders(t_params, "CBD5E1")
    col_widths = [Inches(2.2), Inches(2.1), Inches(2.77)]
    for row in t_params.rows:
        for idx, w in enumerate(col_widths):
            row.cells[idx].width = w

    headers_params = ["Alert Parameter", "Normal Standard", "Trigger Condition (When Alert is Created)"]
    for idx, h in enumerate(headers_params):
        cell = t_params.rows[0].cells[idx]
        set_cell_background(cell, "EBF3FB")
        set_cell_margins(cell, 60, 60, 90, 90)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.name = "Segoe UI"
        r.font.size = Pt(8.8)
        r.font.bold = True
        r.font.color.rgb = NAVY

    data_params = [
        ("Low LPCD in Villages", "55 LPCD or higher", "Daily water supply drops below 55 LPCD"),
        ("Low Pressure in ESR", "0.20 to 1.20 bar (2m to 12m head)", "Water pressure drops below 0.20 bar at ESR"),
        ("Residual Chlorine Out of Range", "0.20 to 0.50 mg/L (PPM)", "Chlorine is less than 0.20 mg/L (low) or above 0.50 mg/L (high)")
    ]
    for r_idx, (p1, p2, p3) in enumerate(data_params, start=1):
        for c_idx, val in enumerate([p1, p2, p3]):
            cell = t_params.rows[r_idx].cells[c_idx]
            set_cell_margins(cell, 50, 50, 90, 90)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Segoe UI"
            r.font.size = Pt(8.5)
            r.font.color.rgb = DARK
            if c_idx == 0:
                r.font.bold = True

    # Section 3: Alert Notification Timeline
    add_section_heading("3. Alert Notification Timeline")
    flow_tbl = doc.add_table(rows=1, cols=1)
    flow_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    flow_tbl.autofit = False
    flow_tbl.columns[0].width = Inches(7.07)
    c_flow = flow_tbl.rows[0].cells[0]
    set_cell_background(c_flow, "0F172A")
    set_cell_margins(c_flow, 70, 70, 100, 100)

    flow_text = (
        "NEXT DAY (After 24 Hours of the Value)\n"
        "Alert is evaluated at 11:00 AM\n"
        "└──> SMS sent to Village Operator (responsible for that ESR & Village)\n\n"
        "IF UNRESOLVED AFTER 24 HOURS (Next Day onwards)\n"
        "└──> Issue is ESCALATED to Executive Engineer (EE)\n"
        "     ├── SMS sent to Executive Engineer mobile number\n"
        "     ├── Email sent to Executive Engineer email address\n"
        "     └── EE must submit an issue report on the Issue Reports page"
    )
    p_fl = c_flow.paragraphs[0]
    p_fl.paragraph_format.space_after = Pt(0)
    r_fl = p_fl.add_run(flow_text)
    r_fl.font.name = "Consolas"
    r_fl.font.size = Pt(7.8)
    r_fl.font.color.rgb = RGBColor(248, 250, 252)

    # Section 4: Method and Channels Used
    add_section_heading("4. Method and Channels Used")
    methods = [
        ("Automatic Daily Schedule: ", "Telemetry data is evaluated automatically every day at 11:00 AM IST."),
        ("SMS Method: ", "Sent through verified SMS gateway directly to mobile numbers stored in database."),
        ("Email Method: ", "Automated email sent to contact email addresses stored in database with scheme and village details.")
    ]
    for lbl, desc in methods:
        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_before = Pt(1)
        p_m.paragraph_format.space_after = Pt(2)
        r_b = p_m.add_run("• ")
        r_l = p_m.add_run(lbl)
        r_l.font.bold = True
        r_d = p_m.add_run(desc)
        for r_x in [r_b, r_l, r_d]:
            r_x.font.name = "Segoe UI"
            r_x.font.size = Pt(8.8)
            r_x.font.color.rgb = DARK

    # ========================== PAGE 2 ==========================
    doc.add_page_break()
    add_header_banner(2)

    add_section_heading("5. Who Receives SMS and Email (Summary Table)")
    t_summary = doc.add_table(rows=3, cols=4)
    t_summary.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_summary.autofit = False
    set_table_borders(t_summary, "CBD5E1")
    sum_widths = [Inches(1.6), Inches(1.8), Inches(1.3), Inches(2.37)]
    for row in t_summary.rows:
        for idx, w in enumerate(sum_widths):
            row.cells[idx].width = w

    headers_sum = ["Recipient", "In How Many Days", "Channel", "Details Sent"]
    for idx, h in enumerate(headers_sum):
        cell = t_summary.rows[0].cells[idx]
        set_cell_background(cell, "EBF3FB")
        set_cell_margins(cell, 60, 60, 80, 80)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.name = "Segoe UI"
        r.font.size = Pt(8.8)
        r.font.bold = True
        r.font.color.rgb = NAVY

    data_summary = [
        ("Village Operator", "Next Day (After 24 hours of the value)", "SMS", "Scheme name, village name, ESR name, observed value, and water supply details."),
        ("Executive Engineer (EE)", "Next Day onwards (When issue exceeds 24 hours)", "SMS + Email", "List of schemes and villages in the division with issues older than 24 hours, operator contacts, and reminder to submit issue report.")
    ]
    for r_idx, (c1, c2, c3, c4) in enumerate(data_summary, start=1):
        for c_idx, val in enumerate([c1, c2, c3, c4]):
            cell = t_summary.rows[r_idx].cells[c_idx]
            set_cell_margins(cell, 55, 55, 80, 80)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Segoe UI"
            r.font.size = Pt(8.5)
            r.font.color.rgb = DARK
            if c_idx == 0:
                r.font.bold = True

    add_section_heading("6. Mandatory Action for Executive Engineer on Issue Reports Page")
    box_rpt = doc.add_table(rows=1, cols=1)
    box_rpt.alignment = WD_TABLE_ALIGNMENT.CENTER
    box_rpt.autofit = False
    box_rpt.columns[0].width = Inches(7.07)
    c_rpt = box_rpt.rows[0].cells[0]
    set_cell_background(c_rpt, "EFF6FF")
    set_cell_margins(c_rpt, 80, 80, 110, 110)
    c_rpt._tc.get_or_add_tcPr().append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="16" w:space="0" w:color="2563EB"/><w:top w:val="single" w:sz="4" w:space="0" w:color="BFDBFE"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BFDBFE"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFDBFE"/></w:tcBorders>'))

    p_rt = c_rpt.paragraphs[0]
    p_rt.paragraph_format.space_after = Pt(3)
    r_rt = p_rt.add_run("Submission of Issue Report for Pending Issues")
    r_rt.font.name = "Segoe UI"
    r_rt.font.size = Pt(9.5)
    r_rt.font.bold = True
    r_rt.font.color.rgb = BLUE

    p_desc = c_rpt.add_paragraph()
    p_desc.paragraph_format.space_after = Pt(5)
    r_desc = p_desc.add_run("When an issue exceeds 24 hours, the Executive Engineer must submit an issue report. Field remarks are not added directly to the dashboard table; they must be submitted on the dedicated Issue Reports page.")
    r_desc.font.name = "Segoe UI"
    r_desc.font.size = Pt(8.5)
    r_desc.font.color.rgb = DARK

    p_how = c_rpt.add_paragraph()
    p_how.paragraph_format.space_after = Pt(2)
    r_how = p_how.add_run("How to submit the report:")
    r_how.font.name = "Segoe UI"
    r_how.font.size = Pt(8.8)
    r_how.font.bold = True
    r_how.font.color.rgb = DARK

    steps = [
        "1. Go to the Issue Reporting page in the dashboard navigation (/helpdesk/issue-reporting).",
        "2. Select the Scheme ID, Village, and ESR that has the pending issue.",
        "3. Select the Root Cause of the issue: Pipeline burst, Pump breakdown, Power failure (MSEDCL), Valve malfunction, Bleaching shortage, or Sensor calibration.",
        "4. Enter the Action Taken (e.g. repair team dispatched, spare parts ordered, emergency tanker arranged).",
        "5. Enter the Expected Resolution Date when normal supply will be restored.",
        "6. Click Submit Issue Report. The report is saved to the central database record."
    ]
    for s in steps:
        p_s = c_rpt.add_paragraph()
        p_s.paragraph_format.space_before = Pt(1)
        p_s.paragraph_format.space_after = Pt(1.5)
        r_s = p_s.add_run(s)
        r_s.font.name = "Segoe UI"
        r_s.font.size = Pt(8.3)
        r_s.font.color.rgb = DARK

    add_section_heading("7. How Issues are Resolved and Closed")
    res_items = [
        ("Automatic Telemetry Resolution: ", "Issues cannot be manually marked as resolved by clicking a button. The system only marks an issue as Resolved when fresh sensor data meets normal standards at 11:00 AM IST:"),
    ]
    p_res = doc.add_paragraph()
    p_res.paragraph_format.space_before = Pt(2)
    p_res.paragraph_format.space_after = Pt(2)
    r_b = p_res.add_run("• ")
    r_l = p_res.add_run("Automatic Telemetry Resolution: ")
    r_l.font.bold = True
    r_d = p_res.add_run("Issues cannot be manually marked as resolved by clicking a button. The system only marks an issue as Resolved when fresh sensor data meets normal standards at 11:00 AM IST:")
    for rx in [r_b, r_l, r_d]:
        rx.font.name = "Segoe UI"
        rx.font.size = Pt(8.8)
        rx.font.color.rgb = DARK

    for num_item in ["1. LPCD is 55 or higher", "2. Pressure is between 0.20 and 1.20 bar", "3. Chlorine is between 0.20 and 0.50 mg/L"]:
        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.left_indent = Inches(0.25)
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(1)
        r_sub = p_sub.add_run(num_item)
        r_sub.font.name = "Segoe UI"
        r_sub.font.size = Pt(8.5)
        r_sub.font.color.rgb = DARK

    p_stop = doc.add_paragraph()
    p_stop.paragraph_format.space_before = Pt(2)
    p_stop.paragraph_format.space_after = Pt(4)
    r_b = p_stop.add_run("• ")
    r_l = p_stop.add_run("Automatic Escalation Stop: ")
    r_l.font.bold = True
    r_d = p_stop.add_run("Once the system verifies normal data, it moves the item to the resolved list and stops sending further SMS and email escalations to the Executive Engineer.")
    for rx in [r_b, r_l, r_d]:
        rx.font.name = "Segoe UI"
        rx.font.size = Pt(8.8)
        rx.font.color.rgb = DARK

    # Footer note
    p_foot = doc.add_paragraph()
    p_foot.paragraph_format.space_before = Pt(12)
    r_foot = p_foot.add_run("Water Supply Telemetry Monitoring System  |  Standard Operating Procedure — Version 2.3  |  October 2026")
    r_foot.font.name = "Segoe UI"
    r_foot.font.size = Pt(7.5)
    r_foot.font.color.rgb = GRAY

    doc.save(output_path)
    print(f"Successfully generated DOCX at {output_path}")

if __name__ == "__main__":
    create_sop_docx("c:/Users/12626/dashboard8/SOP_Alerts_and_Escalation_Management.docx")
