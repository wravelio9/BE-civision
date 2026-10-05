// Never expose your API key in client-side code in production.
// Use a backend proxy to keep it secret.
// API key goes in the Authorization header (inference v1.5.0+)

const AI_API_KEYS = process.env.AI_API_KEYS

const response = await fetch('https://serverless.roboflow.com/wilson-ravelio/workflows/general-segmentation-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AI_API_KEYS}`
  },
  body: JSON.stringify({
    inputs: {
      "image": {"type": "url", "value": "IMAGE_URL"},
      "classes": "gerobak"
    }
  })
});

const result = await response.json();
console.log(result);