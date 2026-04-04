import os

file_path = r'c:\Users\HP\dashboard9\client\src\pages\chlorine\DetailedChlorinePage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Flowmeter export (line 15663 is })
# We insert after 15663 (which is index 15662)
# But let's check the content first to be sure
if '}' in lines[15662] and 'fullyCompleted' in lines[15661]:
    lines.insert(15663, "                                 if (selectedAgencyType !== 'ALL') {\n")
    lines.insert(15664, "                                   params.append('agencyType', selectedAgencyType);\n")
    lines.insert(15665, "                                 }\n")

# Pressure comparison export (line 15851 is })
# We insert after 15851 (which is index 15850 after the first insert)
# Original index 15850 becomes 15853
if '}' in lines[15853] and 'fullyCompleted' in lines[15852]:
    lines.insert(15854, "                                 if (selectedAgencyType !== 'ALL') {\n")
    lines.insert(15855, "                                   params.append('agencyType', selectedAgencyType);\n")
    lines.insert(15856, "                                 }\n")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Inserted successfully")
