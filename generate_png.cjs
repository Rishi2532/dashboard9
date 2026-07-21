const fs = require('fs');

async function generate() {
    const detailedUserFlow = `sequenceDiagram
    autonumber
    
    actor You as You
    participant ChatInterface as Chat Interface
    participant NLP as Language Processor
    participant AIBrain as AI Engine (OpenAI)
    participant DataEngine as Data Fetcher
    participant DB as Dashboard Database
    participant Visualizer as Chart Generator

    You->>ChatInterface: Ask a question (e.g., "Show me water data in Nagpur")
    
    Note over ChatInterface, NLP: Step 2: Understanding the words
    ChatInterface->>NLP: Send your raw text question
    NLP->>AIBrain: What is the user trying to find out?
    
    Note over AIBrain: AI intelligently reads the sentence, figures out the goal, and finds keywords.
    AIBrain-->>NLP: Goal: Fetch Water Data | Keyword: "Nagpur"
    
    Note over NLP, DataEngine: Step 3: Fetching the exact numbers
    NLP->>DataEngine: We need the water data for Nagpur!
    DataEngine->>DB: Securely search the database for Nagpur's water records
    DB-->>DataEngine: Return raw numbers and statistics
    
    Note over DataEngine, Visualizer: Step 4: Making it look beautiful
    DataEngine->>Visualizer: Here is the raw data, build a visual chart
    Visualizer-->>ChatInterface: Send back the colorful chart and a summarized text answer
    
    ChatInterface-->>You: Displays your customized answer instantly!`;

    const url = 'https://kroki.io/mermaid/png';
    
    const getPngBuffer = async (graph) => {
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
        return Buffer.from(arrayBuffer);
    };
    
    console.log('Generating high-quality PNG...');
    const buffer = await getPngBuffer(detailedUserFlow);
    
    fs.writeFileSync('c:\\Users\\12626\\dashboard8\\chatbot_detailed_flow.png', buffer);
    console.log('Successfully created chatbot_detailed_flow.png!');
}

generate().catch(console.error);
