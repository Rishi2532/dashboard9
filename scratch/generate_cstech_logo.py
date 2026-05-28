import base64
import os

logo_path = r"C:\Users\13208\.gemini\antigravity-ide\brain\00bc9946-c667-4618-a601-a6ef84923350\media__1779944604309.png"
if os.path.exists(logo_path):
    with open(logo_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    output_content = f'export const csTechLogoBase64 = "data:image/png;base64,{encoded_string}";\n'
    
    with open("client/src/lib/logo-base64.ts", "w") as out_file:
        out_file.write(output_content)
    print("Successfully wrote CS Tech logo to logo-base64.ts")
else:
    print("CS Tech logo file not found:", logo_path)
