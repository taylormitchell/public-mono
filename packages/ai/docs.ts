import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to create embeddings for documents
async function createEmbeddings(documents: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    documents.map(async (doc) => {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: doc.slice(0, 1000),
      });
      return response.data[0].embedding;
    })
  );
  return embeddings;
}

async function createEmbeddingsForFiles() {
  const dir = path.join(__dirname, "../../data");
  const filePaths: string[] = [];
  const contents: string[] = [];

  function walkDir(currentDir: string, depth: number = 0) {
    if (depth > 5) return;
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        walkDir(itemPath, depth + 1);
      } else if (stat.isFile()) {
        filePaths.push(itemPath);
        const fileContents = fs.readFileSync(itemPath, "utf8");
        contents.push(fileContents);
      }
    }
  }
  walkDir(dir);

  console.log(`Reading ${filePaths.length} files from ${dir}`);
  console.log(`Creating embeddings for ${contents.length} files`);
  const embeddings = await createEmbeddings(contents);
  // save embeddings to a file, with the file path as the key
  const embeddingsMap: Record<string, number[]> = {};
  for (let i = 0; i < filePaths.length; i++) {
    embeddingsMap[filePaths[i]] = embeddings[i];
  }
  fs.writeFileSync("embeddings.json", JSON.stringify(embeddingsMap));
}

// Function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Function to find most relevant documents
async function findRelevantDocuments(
  query: string,
  documents: string[],
  embeddings: number[][]
): Promise<string[]> {
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const similarities = embeddings.map((emb) =>
    cosineSimilarity(queryEmbedding.data[0].embedding, emb)
  );
  const sortedIndices = similarities
    .map((sim, index) => ({ sim, index }))
    .sort((a, b) => b.sim - a.sim)
    .map((item) => item.index);
  return sortedIndices.map((index) => documents[index]);
}

async function query() {
  // Load embeddings from file
  const embeddingsMap: Record<string, number[]> = JSON.parse(
    fs.readFileSync("embeddings.json", "utf8")
  );
  const files = Object.keys(embeddingsMap);
  const embeddings = Object.values(embeddingsMap);

  // Function to find and display relevant documents
  async function findAndDisplayRelevantDocs(query: string) {
    try {
      // Find relevant documents
      const relevantDocs = await findRelevantDocuments(query, files, embeddings);

      // Log top 5 most similar files
      console.log("Top 5 most similar files:");
      relevantDocs.slice(0, 5).forEach((doc, index) => {
        console.log(`${index + 1}. ${doc}`);
        const content = fs.readFileSync(doc, "utf8");
        console.log(content);
        console.log("---");
      });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }

  // Call the function with a command-line argument
  const query = process.argv[2];
  if (query) {
    findAndDisplayRelevantDocs(query);
  } else {
    console.log("Please provide a query as a command-line argument.");
  }
}

query().catch(console.error);
// createEmbeddingsForFiles().catch(console.error);
