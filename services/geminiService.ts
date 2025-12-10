import { GoogleGenAI, Type } from "@google/genai";
import { HardwareModule, Connection } from "../types";

// Lazy Initialize Gemini Client
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      console.warn("Gemini API Key is missing. AI features will be disabled.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const analyzeProject = async (modules: HardwareModule[], connections: Connection[]) => {
  const prompt = `
    You are a Senior Electrical Engineer and Certified KNX/DALI Integrator.
    Perform a **Deep Review** of the "270 Boll Avenue" project BOM and Topology.
    
    **Scope of Review:**
    1.  **Enclosure Fill & Fit**: 
        - CDL-1 (Saginaw 24x24): Calculate DIN rail fill. Are there too many modules for 3-4 rails?
        - CDL-2 (Leviton 21"): Verify 14.5" width constraints. Do DALI Gateways (4TE) fit well with wire bending space?
    2.  **Thermal Analysis**:
        - Mean Well SDR-480-24 dissipates ~34W at full load. Is it placed in a surface mount box (CDL-1)? Does it have 2" clearance?
        - Dimmers (Lunatone) generate heat. Check if they are densely packed.
    3.  **Power Budget**:
        - Sum the wattage of all devices on CDL-1 vs the SDR-480 capacity.
        - Sum the wattage on CDL-2 vs the HDR-150 capacity.
    4.  **Wiring & NEC Compliance**:
        - Flag any Class 1 (Mains) vs Class 2 (Bus) separation issues in the layout.
        - Validate wire bending space for the 480W PSU.
    
    **Bill of Materials (JSON):**
    ${JSON.stringify(modules)}

    **Connections (JSON):**
    ${JSON.stringify(connections)}

    **Output Format:**
    Return a professional Engineering Report in Markdown. 
    Use sections: "Critical Issues", "Thermal Validation", "Power Calculations", "Layout Recommendations".
    Use bold for pass/fail metrics (e.g., **PASSED**, **WARNING**).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Unable to analyze project at this time. Please check API Key configuration.";
  }
};

export const generateModulesFromText = async (text: string): Promise<Partial<HardwareModule>[]> => {
  const prompt = `
    Extract KNX/DALI automation hardware modules from the following text description.
    Map them to the following JSON structure. 
    
    Text: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              manufacturer: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['NETWORK', 'POWER', 'CONTROLLER', 'SECURITY', 'AUDIO_VIDEO', 'ACCESSORY', 'LIGHTING', 'SENSOR', 'HVAC', 'ENCLOSURE'] },
              mountType: { type: Type.STRING, enum: ['RU', 'DIN', 'WALL', 'CEILING', 'SURFACE', 'FLUSH', 'N/A'] },
              size: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              powerWatts: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER },
            },
            required: ['name', 'quantity', 'type', 'mountType', 'cost']
          }
        }
      }
    });

    return JSON.parse(response.text) as Partial<HardwareModule>[];
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return [];
  }
};

export const extractMapSymbols = async (base64Image: string): Promise<any[]> => {
  const aiClient = getAiClient();
  if (!aiClient) return [];

  const prompt = `
    Analyze this architectural electrical floor plan.
    Identify the locations of the following devices:
    1.  **Recessed/Canned Lights**: Typically circles. Type: "LIGHT".
    2.  **Switches**: The symbol '$' or '$LV' or just '$'. Type: "SWITCH".
    3.  **Fans**: Fan blade symbol. Type: "FAN".
    4.  **Sensors**: Triangles or motion cones. Type: "SENSOR".
    4.  **Sensors**: Triangles or motion cones. Type: "SENSOR".
    5.  **Exterior Sensors**: Sensors outside the walls. Type: "EXTERIOR".
    6.  **Windows**: Openings in the walls, often marked with lines. Type: "WINDOW".

    Return a JSON array of objects. Each object must have:
    -   type: One of ["LIGHT", "SWITCH", "FAN", "SENSOR", "EXTERIOR", "WINDOW"]
    -   x: The X coordinate as a percentage (0-100) from the left.
    -   y: The Y coordinate as a percentage (0-100) from the top.
    
    Example:
    [
        {"type": "LIGHT", "x": 10.5, "y": 20.0},
        {"type": "SWITCH", "x": 95.0, "y": 50.2}
    ]
    
    Be precise with the coordinates. Detect ALL symbols visible.
  `;

  try {
    // Clean base64 header if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['LIGHT', 'SWITCH', 'FAN', 'SENSOR', 'EXTERIOR', 'WINDOW'] },
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
            },
            required: ['type', 'x', 'y']
          }
        }
      }
    });

    return JSON.parse(response.text) as any[];
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return [];
  }
};