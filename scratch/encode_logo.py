import base64
import os

logo_path = "logo.png"
if os.path.exists(logo_path):
    with open(logo_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    print("Base64 length:", len(encoded_string))
    print("Start:", encoded_string[:100])
else:
    print("logo.png not found")
