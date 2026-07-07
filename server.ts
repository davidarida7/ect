import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Categories map to curated high-resolution, beautiful Unsplash images
const categoryImages: Record<string, string[]> = {
  celebration: [
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1920&auto=format&fit=crop",
  ],
  concert: [
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1920&auto=format&fit=crop",
  ],
  nature: [
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop",
  ],
  space: [
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1920&auto=format&fit=crop",
  ],
  gaming: [
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1920&auto=format&fit=crop",
  ],
  holiday: [
    "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1482531007909-192ac913980a?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?q=80&w=1920&auto=format&fit=crop",
  ],
  travel: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1920&auto=format&fit=crop",
  ],
  fitness: [
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=1920&auto=format&fit=crop",
  ],
  education: [
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1920&auto=format&fit=crop",
  ],
  lofi: [
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1920&auto=format&fit=crop",
  ],
  corporate: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1920&auto=format&fit=crop",
  ],
  love: [
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=1920&auto=format&fit=crop",
  ],
  retro: [
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1920&auto=format&fit=crop",
  ],
  default: [
    "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1920&auto=format&fit=crop",
  ],
};

// API Route to classify and generate visual settings for the event countdown
app.post("/api/theme", async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title parameter is required." });
  }

  try {
    const prompt = `Analyze this event title: "${title}".
Classify it into exactly one of these categories:
- celebration (weddings, parties, graduation, birth, milestones)
- concert (music festival, gig, dance, musical show)
- nature (beach trip, mountain hike, picnic, forest camping)
- space (astronomy event, star watching, rocket launch, eclipse)
- gaming (esports, tournament, game night, game release)
- holiday (christmas, thanksgiving, halloween, national holidays)
- travel (trip, vacation, flight, cruise, weekend getaway)
- fitness (marathon, race, gym target, sport match)
- education (exam, class, school starting, presentation, quiz)
- lofi (study session, coding, quiet night, coffee date)
- corporate (business meeting, conference, launch event, interview)
- love (anniversary, romantic date, proposals, valentines)
- retro (vaporwave, synthwave theme, neon arcade)
- default (if nothing else matches)

Provide output in JSON format with properties:
1. category: The classified category string exactly as listed above.
2. themeColor: A color name for Tailwind, e.g. "indigo", "rose", "emerald", "amber", "violet", "cyan", "fuchsia", "sky", "crimson".
3. accentColor: Hex color code matching the category mood (e.g. #FF477E, #10B981, #6366F1).
4. emoji: A highly relevant single emoji for this event.
5. description: A beautifully creative, inspiring 1-sentence tagline describing or anticipating this event.
6. customPrompt: A detailed, stunning visual prompt to generate a photorealistic and scenic background image for this event using an AI image generator. Always describe style, lighting, and mood (e.g., "A wide-angle photorealistic view of a glowing synthwave sunset with neon laser grids and mountains, retro style, 4k resolution").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            themeColor: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            emoji: { type: Type.STRING },
            description: { type: Type.STRING },
            customPrompt: { type: Type.STRING },
          },
          required: [
            "category",
            "themeColor",
            "accentColor",
            "emoji",
            "description",
            "customPrompt",
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini API.");
    }

    const result = JSON.parse(text.trim());
    
    // Choose a random curated image from the category to avoid stale repetition
    const images = categoryImages[result.category] || categoryImages.default;
    const fallbackImage = images[Math.floor(Math.random() * images.length)];

    res.json({
      ...result,
      fallbackImage,
    });
  } catch (error: any) {
    console.error("Error in /api/theme:", error);
    // Graceful fallback values
    res.json({
      category: "default",
      themeColor: "indigo",
      accentColor: "#6366F1",
      emoji: "⏳",
      description: "Anticipating the moments that lie ahead.",
      customPrompt: "A beautiful abstract modern background with soft gradients of blue and purple, smooth lines, clean layout.",
      fallbackImage: categoryImages.default[0],
    });
  }
});

// Endpoint to generate background using user's paid key via gemini-3.1-flash-lite-image
app.post("/api/generate-image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt parameter is required." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: `${prompt}. Create an immersive, wide-angle background scene. Ensure there are no people in the foreground, leaving ample copy space in the center. Photorealistic, rich atmospheric lighting, 16:9 aspect ratio.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let base64Image = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Image = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!base64Image) {
      throw new Error("No image data returned from image generation model.");
    }

    res.json({ imageUrl: base64Image });
  } catch (error: any) {
    console.error("Error generating image:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI background image.",
    });
  }
});

function injectOgTags(template: string, query: any): string {
  const titleParam = query.title || query.event || query.t || query.name;
  const imageParam = query.image || query.img || query.photo || query.bg || query.url;

  const titleStr = titleParam ? String(titleParam) : "Momentum Countdown";
  const descStr = titleParam 
    ? `Live countdown to ${titleStr}.` 
    : "Sleek custom live countdown event timer.";

  let tags = `
    <title>${titleStr}</title>
    <meta property="og:title" content="${titleStr}" />
    <meta property="og:description" content="${descStr}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titleStr}" />
    <meta name="twitter:description" content="${descStr}" />
  `;

  if (imageParam) {
    const imgUrl = String(imageParam);
    tags += `
    <meta property="og:image" content="${imgUrl}" />
    <meta name="twitter:image" content="${imgUrl}" />
    `;
  }

  // Robustly remove any existing title, og:*, and twitter:* tags to avoid duplicate metadata conflicts
  let result = template;
  result = result.replace(/<title\b[^>]*>([\s\S]*?)<\/title>/gi, "");
  result = result.replace(/<meta\s+property=["']og:[^"']*["']\s+content=["']([\s\S]*?)["']\s*\/?>/gi, "");
  result = result.replace(/<meta\s+content=["']([\s\S]*?)["']\s+property=["']og:[^"']*["']\s*\/?>/gi, "");
  result = result.replace(/<meta\s+name=["']twitter:[^"']*["']\s+content=["']([\s\S]*?)["']\s*\/?>/gi, "");
  result = result.replace(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']twitter:[^"']*["']\s*\/?>/gi, "");

  // Inject the dynamic tags immediately after the opening <head> tag
  result = result.replace(/<head\b[^>]*>/i, (match) => `${match}\n${tags}`);

  return result;
}

// Start server and handle Vite development vs production serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Intercept GET / and /index.html to dynamically inject meta tags during development
    app.get(["/", "/index.html"], async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        
        // Transform template through Vite (resolves module scripts, etc.)
        template = await vite.transformIndexHtml(url, template);

        // Inject dynamic OG tags and title
        template = injectOgTags(template, req.query);

        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Intercept GET / and /index.html before express.static to always render dynamically
    app.get(["/", "/index.html"], (req, res) => {
      try {
        let template = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        
        // Inject dynamic OG tags and title
        template = injectOgTags(template, req.query);

        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err) {
        res.status(500).send("Internal Server Error");
      }
    });

    // Serve other assets statically, but skip index.html so we can process it dynamically
    app.use(express.static(distPath, { index: false }));

    // Dynamically inject custom metadata in production for any other route
    app.get("*", (req, res) => {
      try {
        let template = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        
        // Inject dynamic OG tags and title
        template = injectOgTags(template, req.query);

        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err) {
        res.status(500).send("Internal Server Error");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
