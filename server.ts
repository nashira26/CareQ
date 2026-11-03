import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Shared Gemini client (initialized with User-Agent header)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API 1: Extract policy requirements from pasted text using Gemini
  app.post('/api/extract-policy-requirements', async (req: Request, res: Response) => {
    const { policyText } = req.body;

    if (!policyText || typeof policyText !== 'string' || !policyText.trim()) {
      return res.status(400).json({ error: 'Policy text is required.' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are an expert Ontario child care licensing and intake policy analyst. Read the following child care centre intake policy text carefully.
Extract every specific prerequisite document, certificate, immunization, proof of address, medical form, or parental consent that a parent must submit as part of the application or enrolment package.
For every extracted requirement:
1. Provide a clear, concise requirement title (e.g., "Child's Official Birth Certificate", "Yellow Immunization Record Card (ISPA)", "Proof of Ontario Residency").
2. Include the EXACT verbatim sentence from the policy text that stated this requirement.

Policy Text:
"""
${policyText}
"""`,
        config: {
          systemInstruction:
            'You are a precise policy extraction engine. Extract requirements as JSON. Do not invent requirements not mentioned in the text.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of extracted application requirements with exact source sentences',
            items: {
              type: Type.OBJECT,
              properties: {
                requirement: {
                  type: Type.STRING,
                  description: 'Concise, clean title of the required document or prerequisite.',
                },
                sourceSentence: {
                  type: Type.STRING,
                  description: 'The verbatim exact sentence from the policy text.',
                },
              },
              required: ['requirement', 'sourceSentence'],
            },
          },
        },
      });

      const rawText = response.text || '[]';
      const extracted = JSON.parse(rawText);
      return res.json({ success: true, requirements: extracted });
    } catch (err: unknown) {
      console.warn('Gemini extraction error or missing key; using fallback parser:', err);

      // Fallback heuristic extraction if Gemini is unavailable
      const sentences = policyText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const keywords = [
        'birth certificate',
        'immunization',
        'yellow card',
        'proof of address',
        'residency',
        'medical',
        'allergy',
        'emergency contact',
        'consent',
        'intake form',
        'health assessment',
        'dietary',
        'registration fee',
        'photo id',
      ];

      const fallbackList: Array<{ requirement: string; sourceSentence: string }> = [];

      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        for (const kw of keywords) {
          if (lower.includes(kw)) {
            const formattedName = kw
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            if (!fallbackList.some((item) => item.requirement.toLowerCase().includes(kw))) {
              fallbackList.push({
                requirement: `${formattedName} Documentation`,
                sourceSentence: sentence,
              });
            }
          }
        }
      }

      if (fallbackList.length === 0) {
        fallbackList.push(
          {
            requirement: "Child's Birth Certificate or Proof of Age",
            sourceSentence: sentences[0] || policyText.slice(0, 80),
          },
          {
            requirement: 'Immunization Record (ISPA Compliance)',
            sourceSentence: sentences[1] || 'Proof of current immunization required.',
          }
        );
      }

      return res.json({
        success: true,
        requirements: fallbackList,
        fallbackNotice: 'Heuristic parsing applied',
      });
    }
  });

  // API 2: Agent matching - Parent natural language description + comments -> prioritized centre list
  app.post('/api/match-centres', async (req: Request, res: Response) => {
    const {
      parentPrompt,
      childName = 'Anya',
      childAgeMonths = 22,
      preferredStartDate = 'March 2027',
      centres = [],
    } = req.body;

    try {
      const prompt = `You are CareQ's intelligent Ontario child-care placement agent.
A parent has provided the following requirements and description of what they need for child care:
Parent Description / Chatbot Message: "${parentPrompt || 'Looking for high quality care with flexible hours and toddler program.'}"
Child: ${childName}, Age: ${childAgeMonths} months (Toddler room intake).
Desired Start: ${preferredStartDate}.

Here are the licensed child-care centres available:
${JSON.stringify(
  centres.map((c: any) => ({
    id: c.id,
    name: c.name,
    neighbourhood: c.neighbourhood,
    ageGroups: c.ageGroups,
    hours: c.hours,
    feeNote: c.feeNote,
    requirementsCount: c.requirements?.length,
  })),
  null,
  2
)}

Analyze the parent's specific comments and priorities (neighbourhood proximity, age fit, CWELCC subsidy, hours, focus).
Rank and prioritize all the centres from highest match to lowest match.
Provide a priority rank (1, 2, 3...), a match score (between 65 and 99), a compelling 1-2 sentence matchReason explaining why it suits the parent's criteria, and a short 3-5 word keyHighlight.
Also provide a 2-sentence agentSummary introducing the recommendation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a compassionate, knowledgeable Ontario child care navigator who gives actionable recommendations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              agentSummary: {
                type: Type.STRING,
                description: '2-sentence summary explaining how the parent criteria were analyzed.',
              },
              rankedCentres: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    centreId: { type: Type.STRING },
                    priorityRank: { type: Type.INTEGER },
                    matchScore: { type: Type.INTEGER },
                    matchReason: { type: Type.STRING },
                    keyHighlight: { type: Type.STRING },
                  },
                  required: ['centreId', 'priorityRank', 'matchScore', 'matchReason', 'keyHighlight'],
                },
              },
            },
            required: ['agentSummary', 'rankedCentres'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ success: true, data: parsed });
    } catch (err: unknown) {
      console.warn('Gemini match error or missing key; using fallback ranking:', err);

      // Rule-based ranking fallback
      const query = (parentPrompt || '').toLowerCase();
      const rankedCentres = centres.map((c: any, idx: number) => {
        let score = 75;
        let reason = `Good fit for ${childName} (22 mos) in the Toddler room.`;
        let highlight = 'Licensed Provider';

        if (c.neighbourhood.toLowerCase().includes('riverdale') && query.includes('riverdale')) {
          score += 20;
          reason = 'Direct match for your preferred Riverdale neighbourhood and CWELCC $10/day fee subsidy.';
          highlight = 'Top Neighbourhood Match';
        } else if (c.ageGroups.includes('Toddler')) {
          score += 12;
          reason = `Active Toddler intake with operating hours from ${c.hours}.`;
          highlight = 'Strong Age Group Fit';
        }

        if (c.feeNote && query.includes('cwelcc')) {
          score += 8;
        }

        return {
          centreId: c.id,
          priorityRank: idx + 1,
          matchScore: Math.min(score, 98),
          matchReason: reason,
          keyHighlight: highlight,
        };
      });

      rankedCentres.sort((a: any, b: any) => b.matchScore - a.matchScore);
      rankedCentres.forEach((item: any, i: number) => {
        item.priorityRank = i + 1;
      });

      return res.json({
        success: true,
        data: {
          agentSummary: `Based on your request, our agent analyzed available licensed centres in Toronto prioritizing age-eligibility for Anya (22 months) and neighbourhood accessibility.`,
          rankedCentres,
        },
      });
    }
  });

  // API 3: AI Message Drafting for Parent & Centre communication
  app.post('/api/generate-message', async (req: Request, res: Response) => {
    const {
      role = 'parent', // 'parent' | 'centre'
      childName = 'Anya',
      childAgeMonths = 22,
      centreName = 'Riverdale Early Learning Centre',
      applicationStatus = 'Submitted',
      intent = 'general inquiry',
      waitlistPosition,
      customNote,
    } = req.body;

    try {
      const isParent = role === 'parent';
      const prompt = isParent
        ? `You are an AI communication assistant for Priya, mother of ${childName} (${childAgeMonths} months old).
Priya is messaging the child care administration at "${centreName}".
The current application status is "${applicationStatus}".
Intent of message: "${intent}".
${customNote ? `Additional parent note: "${customNote}"` : ''}

Draft a warm, polite, professional message (2-4 sentences) that Priya can review, edit, and approve before sending to the centre.
Return only the message text without quotes.`
        : `You are an AI communication assistant for the administrative staff at "${centreName}" (licensed Ontario child care).
The centre is messaging the parent of ${childName} (${childAgeMonths} months old).
The child's application status is "${applicationStatus}"${waitlistPosition ? ` (Waitlist position #${waitlistPosition})` : ''}.
Intent / message purpose: "${intent}".
${customNote ? `Centre staff note: "${customNote}"` : ''}

Draft a clear, courteous, and official message (2-4 sentences) on behalf of the centre that staff can review, edit, and approve before sending to the parent.
Return only the message text without quotes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert communicator for Ontario child care admissions. Write clear, friendly, and practical messages.',
        },
      });

      const draftMessage = (response.text || '').trim();
      return res.json({ success: true, draftMessage });
    } catch (err: unknown) {
      console.warn('Gemini message generation error; using template fallback:', err);

      let fallbackMessage = '';
      if (role === 'parent') {
        if (intent.toLowerCase().includes('waitlist')) {
          fallbackMessage = `Hello, I am checking in regarding Anya's application for the Toddler room starting March 2027. Could you share an update on our current queue position and estimated timeline? Thank you!`;
        } else if (intent.toLowerCase().includes('tour')) {
          fallbackMessage = `Hello ${centreName} team, we would love to schedule a brief morning tour of the toddler classroom facilities ahead of our desired March 2027 start date. Please let us know when tours are available.`;
        } else {
          fallbackMessage = `Hello ${centreName} team, I am following up on Anya's toddler application. Please let us know if any additional documentation or health verification is required at this stage.`;
        }
      } else {
        if (applicationStatus === 'Waitlisted') {
          fallbackMessage = `Dear ${childName}'s family, thank you for your patience. Your child is currently #${waitlistPosition || 5} on our active Toddler intake waitlist. We will notify you immediately once a placement spot becomes available.`;
        } else if (applicationStatus === 'Offer') {
          fallbackMessage = `Dear ${childName}'s family, we are pleased to offer you a licensed Toddler placement at ${centreName}! Please review the offer in your CareQ portal within 48 hours to confirm enrolment.`;
        } else if (applicationStatus === 'Under review') {
          fallbackMessage = `Hello, our intake committee is currently reviewing ${childName}'s application and verification documents. We will update you shortly regarding placement availability.`;
        } else {
          fallbackMessage = `Hello, thank you for submitting ${childName}'s application to ${centreName}. We have received your documentation and your application is active in our intake queue.`;
        }
      }

      return res.json({ success: true, draftMessage: fallbackMessage });
    }
  });

  // In development, hook up Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`CareQ server running at http://localhost:${port}`);
  });
}

startServer();
