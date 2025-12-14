'use server';

import OpenAI from 'openai';
import { settings } from '@/lib/db';

const ASSISTANT_ID = 'asst_t1EzkK3DRzT3IvucKlGWB7lr';

export async function generateArticle(
  socialMediaText: string,
  mediaUrls: string,
  language: 'english' | 'french' | 'both'
) {
  try {
    // Get API key from database settings
    const openaiApiKey = await settings.get('openaiApiKey') || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('[generateArticle] OpenAI API key not found in settings or environment');
      throw new Error('OpenAI API key not configured. Please set it in Settings.');
    }

    console.log('[generateArticle] API key found, length:', openaiApiKey.length);
    console.log('[generateArticle] Text length:', socialMediaText.length);
    console.log('[generateArticle] Media URLs:', mediaUrls || 'None');
    console.log('[generateArticle] Language:', language);

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    let articleObject: { en?: any; fr?: any } = {};

    switch (language) {
      case 'french':
        const frenchArticle = await generateFrenchArticle(openai, socialMediaText, mediaUrls);
        articleObject = { fr: frenchArticle.fr };
        break;

      case 'english':
        const englishArticle = await generateEnglishArticle(openai, socialMediaText, mediaUrls);
        articleObject = { en: englishArticle.en };
        break;

      case 'both':
        const frenchResult = await generateFrenchArticle(openai, socialMediaText, mediaUrls);
        const englishResult = await generateEnglishFromFrench(openai, socialMediaText, mediaUrls);
        articleObject = {
          fr: frenchResult.fr,
          en: englishResult.en,
        };
        break;

      default:
        throw new Error('Invalid language option');
    }

    console.log('[generateArticle] Successfully generated articles');
    console.log('[generateArticle] Article object keys:', Object.keys(articleObject));
    return articleObject;
  } catch (error: any) {
    console.error('[generateArticle] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(error.message || 'Error generating article');
  }
}

async function generateFrenchArticle(
  openai: OpenAI,
  socialMediaText: string,
  mediaUrls: string
) {
  try {
    const thread = await openai.beta.threads.create();
    await addMessage(openai, thread.id, socialMediaText, mediaUrls, 'french');
    const response = await runAssistant(openai, thread.id);
    return response;
  } catch (error) {
    console.error('Error generating French article:', error);
    throw error;
  }
}

async function generateEnglishArticle(
  openai: OpenAI,
  socialMediaText: string,
  mediaUrls: string
) {
  try {
    const thread = await openai.beta.threads.create();
    await addMessage(openai, thread.id, socialMediaText, mediaUrls, 'english');
    const response = await runAssistant(openai, thread.id);
    return response;
  } catch (error) {
    console.error('Error generating English article:', error);
    throw error;
  }
}

async function generateEnglishFromFrench(
  openai: OpenAI,
  socialMediaText: string,
  mediaUrls: string
) {
  try {
    const thread = await openai.beta.threads.create();
    await addMessage(openai, thread.id, socialMediaText, mediaUrls, 'english_from_french');
    const response = await runAssistant(openai, thread.id);
    return response;
  } catch (error) {
    console.error('Error generating English article from French:', error);
    throw error;
  }
}

async function addMessage(
  openai: OpenAI,
  threadId: string,
  content: string,
  mediaUrls: string,
  type: 'french' | 'english' | 'english_from_french'
) {
  try {
    let prompt: string;
    const mediaUrlsString = mediaUrls || 'None';

    switch (type) {
      case 'french':
        prompt = `Générez un article en français basé sur le tweet suivant : "${content}" et les URLs des médias associés : ${mediaUrlsString}. Utilisez la structure JSON suivante pour la sortie : { "fr": { "title": "Titre de l'article", "article": "Contenu de l'article avec des balises HTML pour la structure" } }`;
        break;

      case 'english':
        prompt = `Generate an article in English based on the following tweet: "${content}" and the associated media URLs: ${mediaUrlsString}. Target a global audience. Use the following JSON structure for the output: { "en": { "title": "Article title", "article": "Article content with HTML tags for structure" } }`;
        break;

      case 'english_from_french':
        prompt = `Generate a COMPLETELY DIFFERENT article in English based on the core idea from this tweet: "${content}" and the associated media URLs: ${mediaUrlsString}. The article should have a different title, different h2 headings, and a completely different structure from a potential French version. Focus on creating unique content that would appeal to a global english speaking audience and be optimized for Google SEO. DO NOT TRANSLATE any existing content. Instead, create an entirely new article that explores the same core topic but from a fresh perspective. Use the following JSON structure for the output: { "en": { "title": "Unique English article title", "article": "Unique English article content with HTML tags for structure" } }`;
        break;

      default:
        throw new Error('Invalid message type');
    }

    console.log(prompt);

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: prompt,
    });
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

async function runAssistant(openai: OpenAI, threadId: string) {
  try {
    console.log(`[runAssistant] Creating run with assistant ID: ${ASSISTANT_ID}`);
    let run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max wait time

    while (run.status !== 'completed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`[runAssistant] Run status: ${run.status} (attempt ${attempts})`);
      }

      if (run.status === 'failed') {
        const errorMsg = (run as any).last_error?.message || 'Unknown error';
        console.error(`[runAssistant] Run failed: ${errorMsg}`);
        throw new Error(`Assistant run failed: ${errorMsg}`);
      }

      if (run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Assistant run ${run.status}`);
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Assistant run timed out after 2 minutes');
    }

    console.log(`[runAssistant] Run completed, fetching messages...`);
    const messages = await openai.beta.threads.messages.list(threadId);

    if (messages.data.length > 0) {
      const responseMessage = messages.data.find((msg) => msg.role === 'assistant');

      if (responseMessage && responseMessage.content.length > 0) {
        const content = responseMessage.content[0];
        if ('text' in content) {
          const responseText = content.text.value;
          console.log(`[runAssistant] Response text length: ${responseText.length}`);
          console.log(`[runAssistant] Response preview: ${responseText.substring(0, 200)}...`);
          
          try {
            const parsed = JSON.parse(responseText);
            console.log(`[runAssistant] Successfully parsed JSON response`);
            return parsed;
          } catch (parseError) {
            console.error(`[runAssistant] JSON parse error:`, parseError);
            console.error(`[runAssistant] Response text:`, responseText);
            throw new Error('Failed to parse assistant response as JSON');
          }
        } else {
          throw new Error('No text response from the assistant.');
        }
      } else {
        throw new Error('No response from the assistant.');
      }
    } else {
      throw new Error('No messages found.');
    }
  } catch (error: any) {
    console.error('[runAssistant] Error:', error.message);
    throw error;
  }
}
