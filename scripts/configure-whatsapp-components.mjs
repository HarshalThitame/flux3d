import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import path from 'node:path';

// Load environment variables from .env or .env.local
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in env.");
  process.exit(1);
}

const commands = [
  { command_name: "quote", command_description: "Get a price estimate for your 3D model" },
  { command_name: "status", command_description: "Check your order status" },
  { command_name: "materials", command_description: "View available 3D printing materials" },
  { command_name: "support", command_description: "Contact human support" }
];

const prompts = [
  "Get a 3D printing quote",
  "Check order status",
  "What materials do you offer?"
];

async function configureComponents() {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/conversational_automation`;
  
  console.log(`Configuring Conversational Components for Phone ID: ${PHONE_NUMBER_ID}...`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      commands,
      prompts
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Failed to configure components:", JSON.stringify(data, null, 2));
    process.exit(1);
  } else {
    console.log("Successfully configured conversational components:", data);
  }
}

configureComponents().catch(err => {
  console.error(err);
  process.exit(1);
});
