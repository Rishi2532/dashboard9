import os

file_path = r'c:\Users\HP\dashboard9\client\src\pages\chlorine\DetailedChlorinePage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if '/api/flowmeter/overall-region-comparison/export' in line:
        # Find the line before window.open (indented)
        # We want to add agencyType after fullyCompleted check
        pass
    new_lines.append(line)

# Let's find the specific lines by content
target_1 = 'params.append("fullyCompleted", "true");'
target_2 = 'window.open('
target_3 = '/api/flowmeter/overall-region-comparison/export/'
target_4 = '/api/pressure/overall-region-comparison/details-export/'

updated = False
final_lines = []
for i in range(len(lines)):
    line = lines[i]
    final_lines.append(line)
    if 'params.append("fullyCompleted", "true");' in line:
        # Check context
        if i + 3 < len(lines) and (target_3 in lines[i+2] or target_4 in lines[i+2]):
            indent = line[:line.find('if')]
            if 'if (selectedAgencyType !== \'ALL\')' not in lines[i+1]:
                final_lines.append(f"{indent}if (selectedAgencyType !== 'ALL') {{\n")
                final_lines.append(f"{indent}  params.append(\"agencyType\", selectedAgencyType);\n")
                final_lines.append(f"{indent}}}\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
print("Updated successfully")
