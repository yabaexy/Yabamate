import 'dotenv/config';
import { streamText } from 'ai';

async function main() {
  const result = await streamText({
    model: 'openai/gpt-5.4',
    prompt: 'AI Gateway를 한 문장으로 설명해줘.',
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
    },
  });

  let fullText = '';

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk); // 실시간 출력
    fullText += chunk;
  }

  console.log('\n\n---');

  // 토큰 사용량 출력
  const usage = await result.usage;
  console.log('토큰 사용량:', usage);
}

main().catch(console.error);