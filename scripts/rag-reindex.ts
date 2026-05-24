import { reindexHomePathRag } from "@/server/rag/reindex";

async function main() {
  const result = await reindexHomePathRag();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
