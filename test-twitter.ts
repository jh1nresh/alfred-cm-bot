#!/usr/bin/env tsx
// Quick test for Twitter API credentials + content generation
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testTwitterCredentials() {
  console.log('\n=== Testing Twitter API credentials ===');
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  }).readWrite;

  try {
    const me = await client.v2.me({ 'user.fields': ['username', 'name', 'description'] });
    console.log('✅ Twitter connected!');
    console.log(`   Account: @${me.data.username} (${me.data.name})`);
    console.log(`   Bio: ${me.data.description || '(none)'}`);
    return me.data.username;
  } catch (err: any) {
    console.error('❌ Twitter auth failed:', err.message);
    return null;
  }
}

async function testContentGeneration() {
  console.log('\n=== Testing Gemini content generation ===');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const result = await model.generateContent(
      '為一個加密交易所生成一條中文推文，主題是現貨交易，不超過120字，語氣專業但接地氣，加2個hashtag。只輸出推文內容。'
    );
    const tweet = result.response.text().trim();
    console.log('✅ Gemini connected!');
    console.log('   Sample tweet:');
    console.log('   ---');
    console.log(`   ${tweet}`);
    console.log('   ---');
    console.log(`   Length: ${tweet.length} chars`);
    return tweet;
  } catch (err: any) {
    console.error('❌ Gemini failed:', err.message);
    return null;
  }
}

async function main() {
  console.log('Alfred Twitter CM — Credential Test\n');

  const username = await testTwitterCredentials();
  const tweet = await testContentGeneration();

  console.log('\n=== Summary ===');
  if (username) {
    console.log(`✅ Twitter: @${username} ready`);
  } else {
    console.log('❌ Twitter: Fix credentials in .env');
  }

  if (tweet) {
    console.log('✅ Gemini: Content generation working');
  } else {
    console.log('❌ Gemini: Check GEMINI_API_KEY');
  }

  if (username && tweet) {
    console.log('\n🚀 All systems go! Alfred Twitter CM is ready to run.');
    console.log('   npm start  →  Discord + Twitter CM both active');
  }
}

main().catch(console.error);
