// End-to-end smoke test: Ollama pipeline
// Tests the actual Ollama inference with realistic job matching data

const OLLAMA_URL = 'http://127.0.0.1:11434';
const MODEL = 'llama3.2:3b-hr-assistant';

const SYSTEM_PROMPT = `You are a career advisor. Analyze the CV and job description.
Respond ONLY with valid JSON using this exact schema:
{
  "matchScore": 0-100,
  "matchReason": "string",
  "skillGaps": ["skill1", "skill2"],
  "recommendations": ["rec1", "rec2"],
  "matchedSkills": ["skill1"],
  "analysis": "2-3 sentence summary"
}`;

const CV_TEXT = `Max Mustermann
Senior Softwareentwickler mit 10 Jahren Erfahrung
Fachkenntnisse: React, TypeScript, Java, Spring Boot, PostgreSQL, Docker, CI/CD
Sprachen: Deutsch (Muttersprache), Englisch (Fließend)
Ausbildung: Bachelor Informatik, TU Berlin`;

const JOB_TEXT = `Senior Frontend Engineer
coolCompany GmbH sucht einen React-Experten mit TypeScript-Kenntnissen.
Anforderungen: 5+ Jahre Erfahrung in Frontend-Entwicklung, React, TypeScript,
CSS, Teamführung. Von Vorteil: Docker, CI/CD-Erfahrung.
Ort: Berlin. Remote: möglich.`;

async function main() {
  let passed = 0;
  let failed = 0;

  // Test 1: Ollama server health
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    const hasModel = data.models?.some(m => m.name.startsWith('llama3.2'));
    if (!hasModel) throw new Error('llama3.2 model not found');
    console.log(`[PASS] Test 1: Ollama server running with ${data.models.length} models`);
    passed++;
  } catch (e) {
    console.log(`[FAIL] Test 1: Ollama server - ${e.message}`);
    failed++;
  }

  // Test 2: Ollama chat with format:json
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `CV:\n${CV_TEXT}\n\nJob:\n${JOB_TEXT}` },
        ],
        stream: false,
        format: 'json',
      }),
    });
    const data = await res.json();
    const content = data.message?.content;
    if (!content) throw new Error('Empty response');
    
    const parsed = JSON.parse(content);
    const hasFields = ['matchScore', 'matchReason', 'skillGaps', 'recommendations'].every(
      f => f in parsed
    );
    if (!hasFields) throw new Error(`Missing required fields: ${Object.keys(parsed).join(', ')}`);
    
    console.log(`[PASS] Test 2: Ollama JSON response - score=${parsed.matchScore}, gaps=${parsed.skillGaps?.length}, recs=${parsed.recommendations?.length}`);
    passed++;
  } catch (e) {
    console.log(`[FAIL] Test 2: Ollama JSON response - ${e.message}`);
    failed++;
    if (e.message.includes('Unexpected token')) {
      console.log('  Response was not valid JSON');
    }
  }

  // Test 3: Error handling - bad model name
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nonexistent-model',
        messages: [{ role: 'user', content: 'test' }],
        stream: false,
      }),
    });
    if (!res.ok) {
      console.log(`[PASS] Test 3: Error handling - got HTTP ${res.status}`);
      passed++;
    } else {
      console.log(`[FAIL] Test 3: Error handling - expected error but got OK`);
      failed++;
    }
  } catch (e) {
    console.log(`[PASS] Test 3: Error handling - connection error: ${e.message}`);
    passed++;
  }

  // Summary
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
