// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// CORS headers - allow all origins for flexibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getCorsHeaders(_req: Request) {
  return corsHeaders;
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Input validation schema - now accepts imagePath instead of imageUrl
const requestSchema = z.object({
  predictionId: z.string().uuid('Invalid prediction ID format'),
  imagePath: z.string().min(1, 'Image path is required'),
});

// Supported crops and their diseases
const SUPPORTED_CROPS = ['corn', 'tomato', 'potato', 'wheat'];
const CROP_DISEASES: Record<string, string[]> = {
  corn: ['Northern Leaf Blight', 'Common Rust', 'Gray Leaf Spot', 'Healthy'],
  tomato: ['Early Blight', 'Late Blight', 'Leaf Mold', 'Septoria Leaf Spot', 'Healthy'],
  potato: ['Early Blight', 'Late Blight', 'Bacterial Wilt', 'Healthy'],
  wheat: ['Leaf Rust', 'Powdery Mildew', 'Septoria', 'Yellow Rust', 'Healthy'],
};

interface AIAnalysisResult {
  is_valid_leaf: boolean;
  is_supported_crop: boolean;
  crop_type: string | null;
  disease_name: string | null;
  confidence_score: number;
  error_message: string | null;
}

function toTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const textPart = part as { text: unknown };
          if (typeof textPart.text === 'string') {
            return textPart.text;
          }
        }
        return '';
      })
      .filter(Boolean)
      .join('');
  }
  return '';
}

async function callAIGateway(args: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrl: string;
}) {
  if (!LOVABLE_API_KEY) {
    throw new Error('Missing Lovable AI API key');
  }

  return await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: 'system', content: args.systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: args.userPrompt },
            { type: 'image_url', image_url: { url: args.imageUrl } },
          ],
        },
      ],
      // Some gateway/model combos ignore max_tokens; set multiple compatible knobs.
      max_tokens: 800,
      max_completion_tokens: 800,
      temperature: 0,
    }),
  });
}

async function analyzeImageWithAI(imageUrl: string): Promise<AIAnalysisResult> {
  console.log('Analyzing image with Lovable AI...');

  const allDiseases = Object.entries(CROP_DISEASES)
    .map(([crop, diseases]) => `${crop}: ${diseases.join(', ')}`)
    .join('\n');

  const systemPrompt = `You are an expert agricultural plant pathologist AI. Your task is to analyze leaf images and detect plant diseases.

CRITICAL VALIDATION RULES:
1. First, determine if the image shows a plant leaf. If NOT a plant leaf (e.g., person, animal, object, text, random image), respond with is_valid_leaf: false
2. If it IS a leaf, determine if it's from a supported crop: corn, tomato, potato, or wheat
3. If the crop is supported, identify any disease present

SUPPORTED CROPS AND DISEASES:
${allDiseases}

You must respond with ONLY a valid JSON object in this exact format (ONE LINE, no markdown, no code fences):
{
  "is_valid_leaf": boolean,
  "is_supported_crop": boolean,
  "crop_type": string or null (one of: corn, tomato, potato, wheat),
  "disease_name": string or null,
  "confidence_score": number between 0 and 1,
  "reasoning": string (brief explanation)
}

IMPORTANT:
- Set is_valid_leaf to false for ANY image that is not clearly a plant leaf
- Set is_supported_crop to false if the leaf is from an unsupported plant
- If healthy, set disease_name to "Healthy"
- Be conservative - if unsure, lower the confidence score`;

  const userPrompt = `Analyze this plant leaf image and determine:
1. Is this actually a plant leaf image?
2. If yes, is it from a supported crop (corn, tomato, potato, wheat)?
3. If supported, what disease (if any) is present?

Image URL: ${imageUrl}

Respond ONLY with a JSON object. Do not wrap it in \`\`\` fences.`;

  // Try with current stable models; adding fallbacks for reliability
  const modelsToTry = [
    'google/gemini-1.5-pro',
    'google/gemini-1.5-flash',
    'google/gemini-2.0-flash-exp'
  ];
  let lastContent = '';

  for (const model of modelsToTry) {
    const response = await callAIGateway({ model, systemPrompt, userPrompt, imageUrl });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const contentRaw = data.choices?.[0]?.message?.content;
    const content = toTextContent(contentRaw);
    lastContent = content;

    if (!content) {
      console.error('No AI content. Raw:', contentRaw);
      continue;
    }

    console.log('AI Response (raw):', content);

    // Clean the response - remove markdown code fences if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '');
    }

    // Parse the JSON response
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to find JSON in (len=' + cleanContent.length + '):', cleanContent);
      continue;
    }

    try {
      const result = JSON.parse(jsonMatch[0]);

      // Validate and normalize the result
      if (!result.is_valid_leaf) {
        return {
          is_valid_leaf: false,
          is_supported_crop: false,
          crop_type: null,
          disease_name: null,
          confidence_score: result.confidence_score || 0.9,
          error_message: 'Please upload a clear image of a plant leaf for analysis.',
        };
      }

      if (!result.is_supported_crop) {
        return {
          is_valid_leaf: true,
          is_supported_crop: false,
          crop_type: null,
          disease_name: null,
          confidence_score: result.confidence_score || 0.8,
          error_message: 'This crop type is not currently supported for disease analysis.',
        };
      }

      // Normalize crop type
      const cropType = result.crop_type?.toLowerCase();
      if (!SUPPORTED_CROPS.includes(cropType)) {
        return {
          is_valid_leaf: true,
          is_supported_crop: false,
          crop_type: null,
          disease_name: null,
          confidence_score: result.confidence_score || 0.7,
          error_message: 'This crop type is not currently supported for disease analysis.',
        };
      }

      return {
        is_valid_leaf: true,
        is_supported_crop: true,
        crop_type: cropType,
        disease_name: result.disease_name || 'Unknown',
        confidence_score: result.confidence_score || 0.85,
        error_message: null,
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      continue;
    }
  }

  console.error('AI response parsing failed. Last content (truncated):', lastContent?.slice(0, 250));
  throw new Error('Could not parse AI response as JSON');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify authentication by extracting user ID from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode JWT to get user ID
    const token = authHeader.replace('Bearer ', '');
    let userId: string;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode base64url payload with proper padding
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const padded = pad ? base64 + '='.repeat(4 - pad) : base64;

      const payload = JSON.parse(atob(padded));
      userId = payload.sub;

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      if (!userId) {
        throw new Error('No user ID in token');
      }
    } catch (jwtError) {
      console.error('JWT decode error:', jwtError);
      const message = jwtError instanceof Error ? jwtError.message : 'Invalid token';
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${userId}`);

    // Parse and validate input
    const body = await req.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { predictionId, imagePath } = parseResult.data;

    console.log(`Processing prediction ${predictionId} for image path: ${imagePath}`);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify prediction ownership
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('user_id')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      console.error('Prediction not found:', predictionError);
      return new Response(
        JSON.stringify({ error: 'Prediction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prediction.user_id !== userId) {
      console.error(`User ${userId} attempted to access prediction owned by ${prediction.user_id}`);
      return new Response(
        JSON.stringify({ error: 'You are not authorized to access this prediction' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a signed URL for the image so AI gateway can access it
    // The bucket is private, so we need a signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('leaf-images')
      .createSignedUrl(imagePath, 60 * 60); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Failed to generate signed URL:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate image access URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageUrl = signedUrlData.signedUrl;
    console.log('Generated signed URL for AI analysis');

    // Analyze the image with AI
    const analysisResult = await analyzeImageWithAI(imageUrl);

    console.log('Analysis result:', analysisResult);

    // Determine the status based on confidence
    let status: 'completed' | 'needs_review' | 'failed' = 'completed';

    if (!analysisResult.is_valid_leaf || !analysisResult.is_supported_crop) {
      status = 'failed';
    } else if (analysisResult.confidence_score < 0.7) {
      status = 'needs_review';
    }

    // Update prediction with result
    const { error: updateError } = await supabase
      .from('predictions')
      .update({
        status,
        is_valid_leaf: analysisResult.is_valid_leaf,
        crop_type: analysisResult.crop_type,
        disease_name: analysisResult.disease_name,
        confidence_score: analysisResult.confidence_score,
        error_message: analysisResult.error_message,
      })
      .eq('id', predictionId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Prediction ${predictionId} completed with status: ${status}`);

    return new Response(
      JSON.stringify({
        success: true,
        result: analysisResult,
        predictionId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-leaf:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
