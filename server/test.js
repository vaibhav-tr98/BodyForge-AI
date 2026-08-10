const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://bodyforgeadmin:Hardoi%405@cluster0.1elpnvz.mongodb.net/bodyforge-ai?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    const client = new MongoClient(uri);

    await client.connect();

    console.log("✅ Connected successfully");

    await client.close();
  } catch (err) {
    console.error(err);
  }
}

run();