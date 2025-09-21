# Setting Up Vector Embeddings

## Why Embeddings are Currently Null

The `embedding` column in your database is currently `null` because we're using **TF-IDF similarity search** instead of vector embeddings. This is actually a great approach for this project because:

- ✅ **No API costs** - Works completely offline
- ✅ **Fast performance** - No external API calls
- ✅ **Good results** - TF-IDF works well for text similarity
- ✅ **No dependencies** - Doesn't require OpenAI API key

## Current Setup: TF-IDF (Recommended)

**What's working now:**
- Text-based similarity search using TF-IDF
- Cosine similarity for ranking results
- All similarity search features working perfectly
- No external dependencies or costs

## Optional: Adding Vector Embeddings

If you want to use vector embeddings for even better semantic understanding, here's how:

### 1. Get OpenAI API Key
```bash
# Get your API key from: https://platform.openai.com/api-keys
# Add to .env file:
echo "OPENAI_API_KEY=your_api_key_here" >> .env
```

### 2. Generate Embeddings for All Videos
```bash
# This will generate embeddings for all 100 videos
npx tsx scripts/generate-embeddings.ts
```

### 3. Check Embeddings in Database
```bash
# Check if embeddings were generated
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Video WHERE embedding IS NOT NULL;"
```

### 4. Test Embedding-Based Search
```bash
# Test similarity search (will use embeddings if available)
curl "http://localhost:3000/api/similar?q=sunset%20mountains&limit=3"
```

## Hybrid Approach (Best of Both Worlds)

Our system automatically chooses the best method:

- **If embeddings exist**: Uses OpenAI embeddings for better semantic understanding
- **If no embeddings**: Falls back to TF-IDF for reliable offline search

## Cost Considerations

**TF-IDF (Current):**
- ✅ Free
- ✅ Works offline
- ✅ Good results for text similarity

**OpenAI Embeddings:**
- 💰 ~$0.0001 per 1K tokens
- 💰 ~$0.01 for all 100 videos (one-time cost)
- 🌐 Requires internet connection
- 🚀 Better semantic understanding

## Recommendation

For this prototype, **TF-IDF is perfect** because:
1. It's working great for similarity search
2. No additional costs or setup required
3. Demonstrates the core functionality effectively
4. Can always add embeddings later if needed

The `null` embeddings are completely normal and expected for the current TF-IDF approach!
