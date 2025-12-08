import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// usage: node scripts/locate_panels.js <path_to_image>
const imagePath = process.argv[2];

if (!imagePath) {
    console.error("Please provide an image path.");
    process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function analyze() {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        const prompt = `
            Analyze this marked-up architectural floor plan.
            Find the hand-written or text labels "LCP-1" and "LCP-2".
            
            For each label, determine:
            1. The center position (x, y) as a percentage (0-100) of the image width and height.
            2. The rotation angle relative to the wall it is attached to (0-360 degrees). 
               - 0 degrees = Horizontal (Standard reading text)
               - 90 degrees = Vertical (Reading up)
               - -45 or 45 degrees = Diagonal
               
            Return ONLY a JSON object with this structure:
            {
                "LCP-1": { "x": number, "y": number, "rotation": number },
                "LCP-2": { "x": number, "y": number, "rotation": number }
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/png', data: base64Image } }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json"
            }
        });

        console.log(response.text);

    } catch (e) {
        console.error("Error:", e);
    }
}

analyze();
