import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

if (!API_KEY) {
    console.error("Error: API_KEY not found in environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

async function extractSymbols() {
    const imagePath = path.join(__dirname, "../images/electric-plan-plain-full-clean-2025-11-22.jpg");

    if (!fs.existsSync(imagePath)) {
        console.error("Image not found:", imagePath);
        return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    const prompt = `
    Analyze this architectural electrical floor plan.
    Identify the locations of the following devices:
    1.  **Recessed/Canned Lights**: Typically circles. Type: "LIGHT".
    2.  **Switches**: The symbol '$' or '$LV'. Type: "SWITCH".
    3.  **Fans**: Fan blade symbol. Type: "FAN".
    4.  **Sensors**: Triangles or motion cones. Type: "SENSOR".
    5.  **Exterior Sensors**: Sensors outside the walls. Type: "EXTERIOR".

    Return a JSON array of objects. Each object must have:
    -   type: One of ["LIGHT", "SWITCH", "FAN", "SENSOR", "EXTERIOR"]
    -   x: The X coordinate as a percentage (0-100) from the left.
    -   y: The Y coordinate as a percentage (0-100) from the top.
    
    Example:
    [
        {"type": "LIGHT", "x": 10.5, "y": 20.0},
        {"type": "SWITCH", "x": 95.0, "y": 50.2}
    ]
    
    Be precise with the coordinates.
    `;

    console.log("Analyzing image with Gemini...");

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const response = result.response;
        const text = response.text();

        // Extract JSON from markdown code block if present
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[\s*\{[\s\S]*\}\s*\]/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const data = JSON.parse(jsonStr);

            // Add IDs
            const taggedData = data.map((item, index) => ({
                id: `extracted-${Date.now()}-${index}`,
                ...item
            }));

            const outputPath = path.join(__dirname, "../extracted_layout.json");
            fs.writeFileSync(outputPath, JSON.stringify(taggedData, null, 2));
            console.log(`Success! Extracted ${taggedData.length} items to ${outputPath}`);
        } else {
            console.error("Failed to parse JSON from response:", text);
        }

    } catch (error) {
        console.error("Error generating content:", error);
    }
}

extractSymbols();
