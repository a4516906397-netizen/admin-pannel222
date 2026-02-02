import { GoogleGenAI } from "@google/genai";
import { StockItem, ChatMessage, Warehouse } from '../types';

export const sendMessageToAI = async (
  messages: ChatMessage[],
  context: { inventory: StockItem[], warehouses: Warehouse[], currentWarehouseId?: string }
): Promise<string> => {
  
  // Create a context summary for the AI
  const warehouse = context.warehouses.find(w => w.id === context.currentWarehouseId);
  const relevantStock = context.currentWarehouseId 
    ? context.inventory.filter(i => i.warehouseId === context.currentWarehouseId)
    : context.inventory;

  // Limit context size to avoid token limits
  const stockSummary = relevantStock.slice(0, 50).map(item => {
    const whName = !context.currentWarehouseId 
      ? `(${context.warehouses.find(w => w.id === item.warehouseId)?.name || 'Unknown'})` 
      : '';
    return `- ${item.name} ${whName}: ${item.quantity} units @ $${item.price}`;
  }).join('\n');

  const systemContent = `You are StockMaster AI.
    
  **Context:**
  Location: ${warehouse ? warehouse.name : "Global Overview"}
  Warehouses: ${context.warehouses.map(w => w.name).join(", ")}
  Current Warehouse ID: ${context.currentWarehouseId || "NONE"}
  
  **Stock Sample:**
  ${stockSummary}

  **Instructions:**
  1. Reply in **Hinglish** (Hindi + English).
  2. If the user wants to **ADD** an item and you have a Current Warehouse ID, you MUST append a specific JSON command at the end of your response.
  
  **JSON Format for Adding Items:**
  ||JSON||
  {
    "action": "add",
    "item": {
      "name": "Item Name",
      "quantity": 10,
      "price": 100,
      "category": "General",
      "minThreshold": 5,
      "description": "Added by AI"
    }
  }
  ||END||

  **Rules:**
  - ONLY output the JSON if the user explicitly asks to add stock.
  - If no warehouse is selected (Global View), ask the user to select a warehouse first.
  - Keep the conversation part natural. Example: "Theek hai, main 50 Mouse add kar raha hu." followed by the JSON block.
  `;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Filter and map messages for Gemini
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemContent,
        temperature: 0.7,
      }
    });

    return response.text || "No response.";

  } catch (error) {
    console.error("Error calling AI:", error);
    return "Error: Server se connect nahi ho pa raha hai.";
  }
};