const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const engineId = 'stable-diffusion-512-v2-1';
const apiHost = 'https://api.stability.ai';
const apiKey = process.env.STABILITY_API_KEY;

if (!apiKey) throw new Error('Missing Stability API key.');

// Styles given by Stable Diffusion API
const stylePresets = ["enhance", "anime", "photographic", "digital-art", "comic-book", "fantasy-art", "line-art", "analog-film", "neon-punk", "isometric", "low-poly", "origami", "modeling-compound", "cinematic", "3d-model", "pixel-art", "tile-texture"];

// Categories of descriptive words
const conditions = ["under-exposed", "over-exposed", "perfectly lit", "softly lit", "backlit", "silhouetted"];
const mediums = ["vintage film", "sharp digital", "soft focus", "grainy film", "high-definition", "low fidelity"];
const timesOfDay = ["night", "day", "twilight", "dawn", "dusk", "midday sun", "golden hour", "blue hour"];
const atmospheres = ["mysterious", "tranquil", "ominous", "serene", "melancholic", "joyful", "tense"];
const styles = ["high contrast", "minimalist", "noir", "surrealist", "impressionist", "pop art", "documentary style", "vibrant color", "monochrome", "sepia tone"];
const details = ["against a dramatic backdrop", "in a bustling scene", "with a touch of motion blur", "capturing a fleeting moment", "highlighting intricate detail", "casting long shadows", "reflecting vibrant colors", "immersed in soft hues"];
const environments = ["in a bustling city", "in a quiet countryside", "under a starry sky", "on a sunlit beach", "in a cozy home", "in a crowded market", "at the edge of a forest", "by a tranquil river"];
const shotTypes = ["extreme close up", "close up", "medium shot", "full shot", "long shot", "wide shot", "overhead shot", "point of view shot", "low angle shot", "high angle shot"];

// Add new prompt templates
const PROMPT_TEMPLATES = {
  'normal': "[input], [environment], [shot_type], captured on [medium], [condition], during [times_of_day], evoking a [atmosphere] mood, shot in [style], [detail]",
};

function generateDetails() {
  return {
    medium: mediums[Math.floor(Math.random()*mediums.length)],
    condition: conditions[Math.floor(Math.random()*conditions.length)],
    timesOfDay: timesOfDay[Math.floor(Math.random()*timesOfDay.length)],
    atmosphere: atmospheres[Math.floor(Math.random()*atmospheres.length)],
    style: styles[Math.floor(Math.random()*styles.length)],
    detail: details[Math.floor(Math.random()*details.length)],
    environment: environments[Math.floor(Math.random()*environments.length)],
    shotType: shotTypes[Math.floor(Math.random()*shotTypes.length)],
  };
}

function getPromptTemplateIndex() {
  // Currently, this only returns 'normal'. In a more complete implementation, this would decide which template to use based on the application's needs.
  return 'normal';
}

async function getFinalPrompt({prompt, details}) {
  let index = getPromptTemplateIndex();
  let text = PROMPT_TEMPLATES[index]
    .replace("[input]", prompt)
    .replace("[environment]", details.environment)
    .replace("[shot_type]", details.shotType)
    .replace("[medium]", details.medium)
    .replace("[condition]", details.condition)
    .replace("[times_of_day]", details.timesOfDay)
    .replace("[atmosphere]", details.atmosphere)
    .replace("[style]", details.style)
    .replace("[detail]", details.detail);
  return text;
}

// Function to fetch image from Stability API and write to file
function fetchImageAndWriteToFile(prompt) {
  const stylePreset = stylePresets[Math.floor(Math.random()*stylePresets.length)];

  fetch(`${apiHost}/v1/generation/${engineId}/text-to-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text_prompts: [
        {
          text: prompt,
          weight: 0.5,
        },
      ],
      cfg_scale: 7, // How much do we stick to the prompt
      clip_guidance_preset: 'FAST_BLUE',
      style_preset: stylePreset,
      height: 512,
      width: 512,
      samples: 1, // Amount of images to generate
      steps: 30,
    }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Non-200 response: ${response.statusText}`);
      }
      return response.json();
    })
    .then(responseJSON => {
      if (!responseJSON.artifacts || !Array.isArray(responseJSON.artifacts)) {
        throw new Error("Unexpected responseJSON structure");
      }

      responseJSON.artifacts.forEach((artifact, i) => {
        const imageData = artifact.base64;
        const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "");
        fs.writeFile(`./out/artifact-${i}.jpg`, base64Data, 'base64', (err) => {
          if (err) {
            console.error("Error writing artifact:", err);
          }
        });
      });
    })
    .catch(err => {
      console.error("Error generating image:", err);
    });
}

async function main() {
  const promptByTheUser = 'Cat with a hat';
  const details = generateDetails();

  let finalPrompt = await getFinalPrompt({prompt: promptByTheUser, details});

  // Ensure the prompt does not exceed the maximum length
  if (finalPrompt.length > 380) {
    finalPrompt = finalPrompt.substring(0, 380);
  }

  console.log('Final prompt:', finalPrompt)
  fetchImageAndWriteToFile(finalPrompt);
}

main().catch(console.error);
