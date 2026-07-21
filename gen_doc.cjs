const fs = require('fs');

async function generate() {
    const simpleFlow = `sequenceDiagram
    autonumber
    
    actor You as You
    participant ChatWindow as Chatbot Interface
    participant AIBrain as Smart AI Brain (OpenAI)
    participant Database as Dashboard Database

    You->>ChatWindow: "Show me water consumption in Nagpur"
    
    Note over ChatWindow, AIBrain: Step 2: The Chatbot asks the AI to figure out exactly what you want.
    ChatWindow->>AIBrain: What is the user asking for?
    AIBrain-->>ChatWindow: They want "Water Data" for the region "Nagpur"
    
    Note over ChatWindow, Database: Step 3: Now that it knows what you want, it fetches the actual numbers.
    ChatWindow->>Database: Please give me the water data for Nagpur
    Database-->>ChatWindow: Here are the numbers and statistics...
    
    Note over ChatWindow, You: Step 4: The Chatbot builds a nice chart or summary.
    ChatWindow-->>You: Displays a beautiful chart and a simple text answer!`;

    const techFlow = `sequenceDiagram
    autonumber
    
    actor User
    participant Chatbot as ChatbotComponent
    participant NLP as nlp-service
    participant AIRoutes as openai-routes
    participant AIService as openai-service
    participant OpenAI as OpenAI API
    participant DataRoutes as category-data-routes
    participant DB as Postgres DB
    participant Widgets as widgets

    User->>Chatbot: Enters Query (Text / Voice)
    Chatbot->>NLP: parseQuery(query)
    NLP->>AIRoutes: POST /api/ai/enhanced-interpret
    AIRoutes->>AIService: Process Prompt
    AIService->>OpenAI: Request Intent & Entities
    OpenAI-->>AIService: JSON (Intent, Confidence, Entities)
    AIService-->>AIRoutes: Formatted Response
    AIRoutes-->>NLP: Return Intent & Entities
    NLP-->>Chatbot: Return ParsedQuery

    opt If Data Required
        Chatbot->>DataRoutes: GET /api/... (Based on Intent)
        DataRoutes->>DB: Execute SQL Queries
        DB-->>DataRoutes: Return Raw Data
        DataRoutes-->>Chatbot: Return Formatted Data
    end
    
    Chatbot->>Widgets: Select Widget & Pass Data
    Widgets-->>Chatbot: Rendered Component (Chart/Stats)
    Chatbot-->>User: Display Message & Widget`;

    const url = 'https://kroki.io/mermaid/png';
    
    const getBase64 = async (graph) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: graph
        });
        
        if (!res.ok) {
            console.error('Failed to generate image', res.status, await res.text());
            process.exit(1);
        }
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
    };
    
    console.log('Fetching simple flow image from Kroki...');
    const simpleB64 = await getBase64(simpleFlow);
    
    console.log('Fetching technical flow image from Kroki...');
    const techB64 = await getBase64(techFlow);
    
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="utf-8">
    <title>Chatbot Data Flows</title>
    <style>
        body { font-family: 'Calibri', 'Segoe UI', sans-serif; }
        h1 { color: #2c3e50; font-size: 24pt; }
        h2 { color: #34495e; font-size: 18pt; margin-top: 20px; }
        p { font-size: 11pt; line-height: 1.5; }
    </style>
</head>
<body>

    <h1>Chatbot Architecture & Data Flows</h1>
    <p>This document contains both the technical and non-technical explanations of how the Maharashtra Water Dashboard chatbot processes queries and returns data.</p>
    
    <hr>

    <h2>Part 1: Simple Flow (For Non-Technical Audiences)</h2>
    <p>This flowchart shows the journey from a user's question to the chatbot's answer in simple terms.</p>
    
    <div style="text-align: center;">
        <img src="data:image/png;base64,${simpleB64}" alt="Simple Flow Diagram" style="max-width: 100%;" />
    </div>

    <br><br><hr><br>

    <h2>Part 2: Technical Flow (For Developers & Engineers)</h2>
    <p>This flowchart outlines the precise data flow between the frontend components, backend services, and external APIs.</p>

    <div style="text-align: center;">
        <img src="data:image/png;base64,${techB64}" alt="Technical Flow Diagram" style="max-width: 100%;" />
    </div>

</body>
</html>`;
    
    fs.writeFileSync('c:\\Users\\12626\\dashboard8\\chatbot_data_flows_with_diagrams.doc', html);
    console.log('Successfully created chatbot_data_flows_with_diagrams.doc!');
}

generate().catch(console.error);
